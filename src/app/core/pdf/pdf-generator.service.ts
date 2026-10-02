import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from 'pdf-lib';

import { isIsoDate } from '../../shared/utils/date.utils';
import { DateService } from '../date/date.service';
import type { EntryData, JournalEntry } from '../../domain/journals/journal-entry.model';
import type { ColumnDef } from '../../domain/journals/journal-template.model';
import type { Journal } from '../../domain/journals/journal.model';
import { JournalService } from '../../domain/journals/journal.service';
import type { Organization } from '../../domain/organizations/organization.model';
import { OrganizationRepository } from '../../domain/organizations/organization.repository';

/**
 * Экспорт журнала в PDF (ТЗ 9.3): A4, шапка с реквизитами, таблица по
 * колонкам шаблона, подписи как PNG, место для подписи ответственного
 * и нумерация листов. Генерация полностью локальная — работает офлайн.
 */
@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  private readonly journals = inject(JournalService);
  private readonly orgs = inject(OrganizationRepository);
  private readonly date = inject(DateService);
  /** Кэш шрифтов, чтобы повторный экспорт не ходил в сеть. */
  private readonly fontCache = new Map<string, Promise<Uint8Array>>();

  /** Собирает PDF журнала со всеми записями (ТЗ 9.3). */
  async generateJournal(journalId: string): Promise<Uint8Array> {
    const summary = await this.journals.getSummary(journalId);
    if (!summary) {
      throw new Error('Журнал не найден');
    }
    const template = summary.template;
    if (!template) {
      throw new Error('Шаблон журнала не найден');
    }
    const journal = summary.journal;
    const [entries, organization] = await Promise.all([
      this.journals.listEntries(journalId),
      this.orgs.getById(journal.orgId),
    ]);

    const [regularBytes, boldBytes] = await Promise.all([
      this.loadFont(FONT_REGULAR_URL),
      this.loadFont(FONT_BOLD_URL),
    ]);
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const regular = await doc.embedFont(regularBytes, { subset: true });
    const bold = await doc.embedFont(boldBytes, { subset: true });
    doc.setTitle(journal.title);
    if (organization) {
      doc.setAuthor(organization.name);
    }

    const context: PdfContext = {
      doc,
      regular,
      bold,
      date: this.date,
      columns: template.columns,
      legalRef: template.legalRef,
      widths: resolveColumnWidths(template.columns, CONTENT_WIDTH),
    };
    const rows = await this.prepareRows(context, entries);

    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let cursor = this.drawDocumentHeader(context, page, journal, organization);
    cursor = this.drawTableHeaderRow(context, page, cursor);

    for (const row of rows) {
      const rowHeight = measureRowHeight(context, row);
      if (cursor - rowHeight < MARGIN_BOTTOM) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        cursor = this.drawTableHeaderRow(context, page, PAGE_HEIGHT - MARGIN_TOP);
      }
      this.drawDataRow(context, page, cursor, row, rowHeight);
      cursor -= rowHeight;
    }

    this.drawFooters(context, journal);
    return doc.save();
  }

  /**
   * Отправляет PDF: на нативной платформе — системный шеринг
   * (`@capacitor/share` + `@capacitor/filesystem`, ТЗ 10.3), в вебе —
   * Web Share API, иначе скачивание файла (ТЗ 9.3).
   */
  async sharePdf(bytes: Uint8Array, filename: string): Promise<void> {
    // Копия в чистый ArrayBuffer: Blob не принимает ArrayBufferLike.
    const buffer = toArrayBuffer(bytes);
    if (Capacitor.isNativePlatform()) {
      await this.sharePdfNative(buffer, filename);
      return;
    }
    const file = new File([buffer], filename, { type: 'application/pdf' });
    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
    const blobUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
  }

  /** Записывает PDF во временную папку и открывает системный share sheet. */
  private async sharePdfNative(buffer: ArrayBuffer, filename: string): Promise<void> {
    const written = await Filesystem.writeFile({
      path: filename,
      data: toBase64(new Uint8Array(buffer)),
      directory: Directory.Cache,
    });
    try {
      await Share.share({ files: [written.uri], title: filename });
    } catch (error) {
      // Отмена в share sheet («Share canceled» на Android) — не ошибка.
      if (
        String((error as Error | undefined)?.message ?? '')
          .toLowerCase()
          .includes('cancel')
      ) {
        throw new DOMException('Share canceled', 'AbortError');
      }
      throw error;
    }
  }

  /** Загружает TTF из ассетов; результат кэшируется на весь цикл жизни. */
  private loadFont(url: string): Promise<Uint8Array> {
    const cached = this.fontCache.get(url);
    if (cached) {
      return cached;
    }
    const promise = (async () => {
      // Относительный путь резолвится от текущего маршрута (/journals/:id),
      // поэтому поднимаем URL к <base href> — иначе fetch уйдёт в /journals/fonts/… (404).
      const fontUrl = new URL(url, document.baseURI);
      const response = await fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить шрифт PDF: ${fontUrl.href}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    })();
    // Сбойная загрузка не должна отравлять кэш навсегда — удаляем обещание.
    void promise.catch(() => this.fontCache.delete(url));
    this.fontCache.set(url, promise);
    return promise;
  }

  /** Готовит строки: тексты по колонкам и встроенные PNG подписей. */
  private async prepareRows(
    context: PdfContext,
    entries: readonly JournalEntry[],
  ): Promise<PreparedRow[]> {
    const dateKey = context.columns.find((column) => column.type === 'date')?.key;
    // Печатная форма — хронологическая: старые записи сверху (ТЗ 9.3).
    const sorted = sortEntriesForPrint(entries, dateKey);
    const signatures = await this.embedSignatures(context, sorted);
    return sorted.map((entry) => {
      const lines: string[][] = [];
      const images: (PDFImage | null)[] = [];
      for (const column of context.columns) {
        const value = entry.data[column.key];
        if (column.type === 'signature') {
          images.push(typeof value === 'string' ? (signatures.get(value.trim()) ?? null) : null);
          lines.push([]);
          continue;
        }
        images.push(null);
        lines.push(
          wrapLines(
            context.regular,
            cellText(column, value, context.date),
            BODY_SIZE,
            context.widths[lines.length] - 2 * CELL_PADDING,
          ),
        );
      }
      return { lines, images, hasImage: images.some((image) => image !== null) };
    });
  }

  /** Встраивает все уникальные PNG-подписи; битые значения дают пустую ячейку. */
  private async embedSignatures(
    context: PdfContext,
    entries: readonly JournalEntry[],
  ): Promise<Map<string, PDFImage | null>> {
    const signatureKeys = context.columns
      .filter((column) => column.type === 'signature')
      .map((column) => column.key);
    const values = new Set<string>();
    for (const entry of entries) {
      for (const key of signatureKeys) {
        const value = entry.data[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          values.add(value.trim());
        }
      }
    }
    const images = new Map<string, PDFImage | null>();
    for (const value of values) {
      images.set(value, await this.embedPng(context.doc, value));
    }
    return images;
  }

  private async embedPng(doc: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
    try {
      const bytes = decodePngDataUrl(dataUrl);
      return bytes === null ? null : await doc.embedPng(bytes);
    } catch {
      return null;
    }
  }

  /** Шапка документа: организация, название, реквизиты, разделитель. */
  private drawDocumentHeader(
    context: PdfContext,
    page: PDFPage,
    journal: Journal,
    organization: Organization | undefined,
  ): number {
    let cursor = PAGE_HEIGHT - MARGIN_TOP;
    if (organization?.name) {
      page.drawText(organization.name, {
        x: MARGIN_X,
        y: cursor - ORG_SIZE,
        size: ORG_SIZE,
        font: context.bold,
        color: TEXT_COLOR,
      });
      cursor -= ORG_SIZE + 7;
    }
    const titleLines = wrapLines(context.bold, journal.title, TITLE_SIZE, CONTENT_WIDTH);
    for (const line of titleLines) {
      const width = context.bold.widthOfTextAtSize(line, TITLE_SIZE);
      page.drawText(line, {
        x: MARGIN_X + (CONTENT_WIDTH - width) / 2,
        y: cursor - TITLE_SIZE,
        size: TITLE_SIZE,
        font: context.bold,
        color: TEXT_COLOR,
      });
      cursor -= TITLE_SIZE + 5;
    }
    cursor -= 2;

    const meta = `Дата начала: ${context.date.format(journal.startedAt)}   Ответственный: ${journal.responsiblePerson}`;
    for (const line of wrapLines(context.regular, meta, META_SIZE, CONTENT_WIDTH)) {
      page.drawText(line, {
        x: MARGIN_X,
        y: cursor - META_SIZE,
        size: META_SIZE,
        font: context.regular,
        color: MUTED_COLOR,
      });
      cursor -= META_SIZE + 4;
    }
    if (context.legalRef) {
      const legal = `Основание: ${context.legalRef}`;
      for (const line of wrapLines(context.regular, legal, LEGAL_SIZE, CONTENT_WIDTH)) {
        page.drawText(line, {
          x: MARGIN_X,
          y: cursor - LEGAL_SIZE,
          size: LEGAL_SIZE,
          font: context.regular,
          color: MUTED_COLOR,
        });
        cursor -= LEGAL_SIZE + 3;
      }
    }
    page.drawLine({
      start: { x: MARGIN_X, y: cursor - 3 },
      end: { x: MARGIN_X + CONTENT_WIDTH, y: cursor - 3 },
      thickness: 0.75,
      color: GRID_COLOR,
    });
    return cursor - 12;
  }

  /** Строка заголовка таблицы; повторяется на каждой странице. */
  private drawTableHeaderRow(context: PdfContext, page: PDFPage, top: number): number {
    let x = MARGIN_X;
    for (let index = 0; index < context.columns.length; index += 1) {
      const width = context.widths[index];
      page.drawRectangle({
        x,
        y: top - HEADER_ROW_HEIGHT,
        width,
        height: HEADER_ROW_HEIGHT,
        color: HEADER_BG,
        borderColor: GRID_COLOR,
        borderWidth: 0.5,
      });
      const label = context.columns[index]?.label ?? '';
      const lines = wrapLines(context.bold, label, HEADER_SIZE, width - 2 * CELL_PADDING);
      drawLinesInCell(
        page,
        lines,
        context.bold,
        HEADER_SIZE,
        x,
        top - HEADER_ROW_HEIGHT,
        HEADER_ROW_HEIGHT,
      );
      x += width;
    }
    return top - HEADER_ROW_HEIGHT;
  }

  /** Строка данных: сетка, текст и PNG подписи. */
  private drawDataRow(
    context: PdfContext,
    page: PDFPage,
    top: number,
    row: PreparedRow,
    rowHeight: number,
  ): void {
    const bottom = top - rowHeight;
    let x = MARGIN_X;
    for (let index = 0; index < context.columns.length; index += 1) {
      const width = context.widths[index];
      page.drawRectangle({
        x,
        y: bottom,
        width,
        height: rowHeight,
        borderColor: GRID_COLOR,
        borderWidth: 0.5,
      });
      const image = row.images[index];
      if (image) {
        const scale = Math.min(
          (width - 2 * CELL_PADDING) / image.width,
          SIGNATURE_HEIGHT / image.height,
        );
        page.drawImage(image, {
          x: x + (width - image.width * scale) / 2,
          y: bottom + (rowHeight - image.height * scale) / 2,
          width: image.width * scale,
          height: image.height * scale,
        });
      } else {
        const lines = row.lines[index] ?? [];
        drawLinesInCell(page, lines, context.regular, BODY_SIZE, x, bottom, rowHeight);
      }
      x += width;
    }
  }

  /** Подпись ответственного и «Стр. X из Y» на каждом листе (ТЗ 9.3). */
  private drawFooters(context: PdfContext, journal: Journal): void {
    const pages = context.doc.getPages();
    const total = pages.length;
    pages.forEach((page, index) => {
      page.drawLine({
        start: { x: MARGIN_X, y: FOOTER_LINE_Y },
        end: { x: MARGIN_X + CONTENT_WIDTH, y: FOOTER_LINE_Y },
        thickness: 0.5,
        color: GRID_COLOR,
      });
      const signatureLine = `Подпись ответственного: _______________________  ${journal.responsiblePerson}`;
      page.drawText(signatureLine, {
        x: MARGIN_X,
        y: FOOTER_Y,
        size: FOOTER_SIZE,
        font: context.regular,
        color: MUTED_COLOR,
      });
      const counter = `Стр. ${index + 1} из ${total}`;
      const counterWidth = context.regular.widthOfTextAtSize(counter, FOOTER_SIZE);
      page.drawText(counter, {
        x: MARGIN_X + CONTENT_WIDTH - counterWidth,
        y: FOOTER_Y,
        size: FOOTER_SIZE,
        font: context.regular,
        color: MUTED_COLOR,
      });
    });
  }
}

/** Общие параметры вёрстки одного документа. */
interface PdfContext {
  readonly doc: PDFDocument;
  readonly regular: PDFFont;
  readonly bold: PDFFont;
  readonly date: DateService;
  readonly columns: readonly ColumnDef[];
  readonly legalRef: string | undefined;
  readonly widths: readonly number[];
}

/** Строка таблицы: переносанный текст и встроенные изображения подписей. */
interface PreparedRow {
  readonly lines: readonly (readonly string[])[];
  readonly images: readonly (PDFImage | null)[];
  readonly hasImage: boolean;
}

// Формат A4 в пунктах (ТЗ 9.3).
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 40;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 56;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X;

const CELL_PADDING = 4;
const LINE_HEIGHT = 11;
const ROW_MIN_HEIGHT = 20;
const HEADER_ROW_HEIGHT = 24;
const SIGNATURE_HEIGHT = 24;
const FOOTER_Y = 32;
const FOOTER_LINE_Y = 46;

const TITLE_SIZE = 15;
const ORG_SIZE = 11;
const META_SIZE = 9.5;
const LEGAL_SIZE = 8.5;
const HEADER_SIZE = 8.5;
const BODY_SIZE = 8.5;
const FOOTER_SIZE = 8;

// В PDF нет CSS-токенов темы (ТЗ 13), поэтому цвета заданы напрямую.
const TEXT_COLOR = rgb(0.09, 0.11, 0.15);
const MUTED_COLOR = rgb(0.4, 0.44, 0.5);
const GRID_COLOR = rgb(0.8, 0.83, 0.87);
const HEADER_BG = rgb(0.94, 0.95, 0.97);

const FONT_REGULAR_URL = 'fonts/Roboto_400Regular.ttf';
const FONT_BOLD_URL = 'fonts/Roboto_700Bold.ttf';

/** Относительные ширины колонок по типам, когда `ColumnDef.width` не задан. */
const DEFAULT_WIDTH_WEIGHTS: Readonly<Record<ColumnDef['type'], number>> = {
  date: 68,
  number: 55,
  signature: 88,
  select: 95,
  text: 110,
};

/**
 * Ширины колонок в пунктах в сумме на всю ширину таблицы:
 * явные `width` — абсолютные, остальные делят остаток по типам колонок.
 */
export function resolveColumnWidths(columns: readonly ColumnDef[], contentWidth: number): number[] {
  if (columns.length === 0) {
    return [];
  }
  const explicit = columns.map((column) =>
    typeof column.width === 'number' && column.width > 0 ? column.width : 0,
  );
  const explicitCount = explicit.filter((width) => width > 0).length;

  if (explicitCount === columns.length) {
    return scaleToWidth(explicit, contentWidth);
  }
  if (explicitCount === 0) {
    const weights = columns.map((column) => DEFAULT_WIDTH_WEIGHTS[column.type]);
    return scaleToWidth(weights, contentWidth);
  }

  const remaining = contentWidth - explicit.reduce((sum, width) => sum + width, 0);
  if (remaining <= 0) {
    // Явные ширины не помещаются в лист — откат к пропорциям по типам.
    const weights = columns.map((column) => DEFAULT_WIDTH_WEIGHTS[column.type]);
    return scaleToWidth(weights, contentWidth);
  }
  const implicitIndexes = columns.map((_, index) => index).filter((index) => explicit[index] === 0);
  const implicitWeights = implicitIndexes.map(
    (index) => DEFAULT_WIDTH_WEIGHTS[columns[index]?.type ?? 'text'],
  );
  const weightsSum = implicitWeights.reduce((sum, weight) => sum + weight, 0);
  const result = [...explicit];
  for (let position = 0; position < implicitIndexes.length; position += 1) {
    const columnIndex = implicitIndexes[position] ?? 0;
    const weight = implicitWeights[position] ?? 0;
    result[columnIndex] = (remaining * weight) / weightsSum;
  }
  return normalizeWidths(result, contentWidth);
}

/** Имя файла PDF: безопасное название журнала + дата формирования. */
export function journalPdfFilename(title: string, isoDate: string): string {
  const safeTitle = title
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim();
  const base = safeTitle.length > 0 ? safeTitle : 'zhurnal';
  return `${base} ${isoDate}.pdf`;
}

function scaleToWidth(values: readonly number[], target: number): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    const each = target / values.length;
    return values.map(() => each);
  }
  return normalizeWidths(
    values.map((value) => (value * target) / total),
    target,
  );
}

/** Округляет ширины и гасит остаток, чтобы сумма была ровно `target`. */
function normalizeWidths(values: readonly number[], target: number): number[] {
  const rounded = values.map((value) => Math.round(value * 100) / 100);
  const diff = target - rounded.reduce((sum, value) => sum + value, 0);
  const lastIndex = rounded.length - 1;
  rounded[lastIndex] = (rounded[lastIndex] ?? 0) + diff;
  return rounded;
}

/** Значение ячейки в текст: даты приводятся к `DD.MM.YYYY` (ТЗ 9.1). */
function cellText(
  column: ColumnDef,
  value: EntryData[string] | undefined,
  date: DateService,
): string {
  if (value === null || value === undefined) {
    return '';
  }
  const raw = String(value).trim();
  if (raw.length === 0) {
    return '';
  }
  if (column.type === 'date' && isIsoDate(raw)) {
    return date.format(raw);
  }
  return raw;
}

/** Жадный перенос текста по словам с разрезанием слишком длинных слов. */
function wrapLines(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const clean = text.trim();
  if (clean.length === 0 || maxWidth <= 0) {
    return [];
  }
  const fits = (candidate: string): boolean => font.widthOfTextAtSize(candidate, size) <= maxWidth;
  const lines: string[] = [];
  let current = '';
  for (const word of clean.split(/\s+/)) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current.length > 0) {
      // current всегда перезаписывается ниже (word или chunk) — сброс не нужен.
      lines.push(current);
    }
    if (fits(word)) {
      current = word;
      continue;
    }
    let chunk = '';
    for (const char of word) {
      if (fits(chunk + char)) {
        chunk += char;
      } else {
        if (chunk.length > 0) {
          lines.push(chunk);
        }
        chunk = char;
      }
    }
    current = chunk;
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
}

/** Высота строки: максимум по тексту и изображению подписи. */
function measureRowHeight(context: PdfContext, row: PreparedRow): number {
  const maxLines = row.lines.reduce((max, lines) => Math.max(max, lines.length), 0);
  const textHeight = maxLines * LINE_HEIGHT + 2 * CELL_PADDING;
  const imageHeight = row.hasImage ? SIGNATURE_HEIGHT + 2 * CELL_PADDING : 0;
  return Math.max(ROW_MIN_HEIGHT, textHeight, imageHeight);
}

/** Рисует перенесённые строки по центру ячейки по вертикали. */
function drawLinesInCell(
  page: PDFPage,
  lines: readonly string[],
  font: PDFFont,
  size: number,
  cellX: number,
  cellBottom: number,
  cellHeight: number,
): void {
  if (lines.length === 0) {
    return;
  }
  const blockHeight = lines.length * LINE_HEIGHT;
  let baseline = cellBottom + (cellHeight + blockHeight) / 2 - LINE_HEIGHT + size;
  for (const line of lines) {
    page.drawText(line, {
      x: cellX + CELL_PADDING,
      y: baseline,
      size,
      font,
      color: TEXT_COLOR,
    });
    baseline -= LINE_HEIGHT;
  }
}

/** Хронологический порядок печатной формы: старые записи сверху. */
function sortEntriesForPrint(
  entries: readonly JournalEntry[],
  dateKey: string | undefined,
): JournalEntry[] {
  return [...entries].sort((a, b) => {
    const dateA = dateKey ? String(a.data[dateKey] ?? '') : '';
    const dateB = dateKey ? String(b.data[dateKey] ?? '') : '';
    const hasA = dateA.length > 0;
    const hasB = dateB.length > 0;
    if (hasA && hasB && dateA !== dateB) {
      return dateA < dateB ? -1 : 1;
    }
    if (hasA !== hasB) {
      return hasA ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });
}

/** PNG из data URL (`data:image/png;base64,…`) → байты; иначе null. */
function decodePngDataUrl(value: string): Uint8Array | null {
  const match = /^data:image\/png;base64,(.+)$/i.exec(value.trim());
  if (!match) {
    return null;
  }
  try {
    const binary = atob(match[1] ?? '');
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** Копия байтов в ArrayBuffer, который принимает Blob/File. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/** base64 для @capacitor/filesystem; чанками, чтобы не упереться в лимит аргументов. */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
