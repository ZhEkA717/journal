import { readFileSync } from 'node:fs';

import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { PDFDocument } from 'pdf-lib';

import type { JournalEntry } from '../../../domain/journals/journal-entry.model';
import type { JournalTemplate } from '../../../domain/journals/journal-template.model';
import type { JournalSummary } from '../../../domain/journals/journal.model';
import { JournalService } from '../../../domain/journals/journal.service';
import { OrganizationRepository } from '../../../domain/organizations/organization.repository';
import {
  journalPdfFilename,
  PdfGeneratorService,
  resolveColumnWidths,
} from '../pdf-generator.service';

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: vi.fn() },
}));
vi.mock('@capacitor/share', () => ({
  Share: { share: vi.fn() },
}));

const REGULAR_TTF = readFileSync(
  'node_modules/@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf',
);
const BOLD_TTF = readFileSync('node_modules/@expo-google-fonts/roboto/700Bold/Roboto_700Bold.ttf');

/** Валидный 1×1 PNG в data URL — формат, который отдаёт signature_pad. */
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function makeTemplate(): JournalTemplate {
  return {
    id: 'tpl-1',
    name: 'Журнал инструктажа по ПБ',
    category: 'fire_safety',
    columns: [
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'employee', label: 'ФИО сотрудника', type: 'text', required: true },
      {
        key: 'type',
        label: 'Вид инструктажа',
        type: 'select',
        required: true,
        options: ['Вводный', 'Первичный'],
      },
      { key: 'signature', label: 'Подпись', type: 'signature', required: true },
    ],
    legalRef: 'Приказ МЧС России от 18.11.2021 № 806',
    isSystem: true,
    iconName: 'flame-outline',
    color: '#DC2626',
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeSummary(template: JournalTemplate | undefined): JournalSummary {
  return {
    journal: {
      id: 'j-1',
      orgId: 'o-1',
      templateId: 'tpl-1',
      title: 'Журнал инструктажа по пожарной безопасности',
      startedAt: '2026-09-01',
      responsiblePerson: 'Иванов Иван',
      createdAt: 1,
      updatedAt: 1,
      syncStatus: 'synced',
    },
    template,
    entryCount: 1,
    employeeCount: 1,
  };
}

function makeEntry(id: string, overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id,
    journalId: 'j-1',
    employeeId: 'emp-1',
    data: {
      date: '2026-09-01',
      employee: 'Петров Пётр',
      type: 'Вводный',
      signature: PNG_1PX,
    },
    createdAt: 1,
    updatedAt: 1,
    syncStatus: 'synced',
    ...overrides,
  };
}

interface SetupOptions {
  readonly summary?: JournalSummary;
  readonly entries?: readonly JournalEntry[];
}

function setup(options: SetupOptions = {}) {
  // Явное присутствие ключа важнее значения: summary: undefined — проверка гарда.
  const summary = 'summary' in options ? options.summary : makeSummary(makeTemplate());
  const journals = {
    getSummary: vi.fn().mockResolvedValue(summary),
    listEntries: vi.fn().mockResolvedValue(options.entries ?? []),
  };
  const orgs = {
    getById: vi.fn().mockResolvedValue({
      id: 'o-1',
      name: 'ООО Ромашка',
      responsiblePerson: 'Иванов Иван',
      createdAt: 1,
      updatedAt: 1,
      syncStatus: 'synced',
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: JournalService, useValue: journals },
      { provide: OrganizationRepository, useValue: orgs },
    ],
  });
  return { service: TestBed.inject(PdfGeneratorService), journals, orgs };
}

describe('PdfGeneratorService.generateJournal', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => ({
        ok: true,
        arrayBuffer: async () =>
          Uint8Array.from(String(url).includes('Bold') ? BOLD_TTF : REGULAR_TTF).buffer,
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('собирает валидный PDF с одной страницей', async () => {
    const { service } = setup({
      entries: [makeEntry('e-1'), makeEntry('e-2', { data: { date: '2026-09-02' } })],
    });

    const bytes = await service.generateJournal('j-1');

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('раскладывает много записей по нескольким листам', async () => {
    const entries = Array.from({ length: 60 }, (_, index) =>
      makeEntry(`e-${index}`, {
        data: { date: `2026-09-${String((index % 28) + 1).padStart(2, '0')}` },
        createdAt: index + 1,
      }),
    );
    const { service } = setup({ entries });

    const bytes = await service.generateJournal('j-1');

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it('встраивает подписи и переживает битые значения', async () => {
    const { service } = setup({
      entries: [
        makeEntry('e-1'),
        makeEntry('e-2', { data: { signature: '' } }),
        makeEntry('e-3', { data: { signature: 'это не PNG' } }),
      ],
    });

    const bytes = await service.generateJournal('j-1');

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('формирует PDF даже без записей', async () => {
    const { service } = setup({ entries: [] });

    const bytes = await service.generateJournal('j-1');

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('падает с понятной ошибкой, если журнал не найден', async () => {
    const { service } = setup({ summary: undefined });

    await expect(service.generateJournal('missing')).rejects.toThrow('Журнал не найден');
  });

  it('падает с понятной ошибкой, если у журнала нет шаблона', async () => {
    const { service } = setup({ summary: makeSummary(undefined) });

    await expect(service.generateJournal('j-1')).rejects.toThrow('Шаблон журнала не найден');
  });

  it('запрашивает шрифты по абсолютному URL от <base href>, а не от маршрута', async () => {
    const { service } = setup({ entries: [makeEntry('e-1')] });

    await service.generateJournal('j-1');

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    for (const [url] of vi.mocked(fetch).mock.calls) {
      // Относительный путь увёл бы fetch на /journals/fonts/… (404 на детальном виде).
      expect(String(url)).toMatch(/^https?:\/\/.+\/fonts\/Roboto_(?:400Regular|700Bold)\.ttf$/);
    }
  });

  it('не ходит за шрифтами повторно — результат кэшируется', async () => {
    const { service } = setup({ entries: [makeEntry('e-1')] });

    await service.generateJournal('j-1');
    await service.generateJournal('j-1');

    // 2 шрифта на первую выгрузку, вторая идёт из кэша; без кэша было бы 4.
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});

describe('resolveColumnWidths', () => {
  it('делит ширину по типам, если ширины не заданы', () => {
    const columns = makeTemplate().columns;

    const widths = resolveColumnWidths(columns, 515);

    expect(widths).toHaveLength(columns.length);
    widths.forEach((width) => expect(width).toBeGreaterThan(0));
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(515, 5);
  });

  it('сохраняет явные ширины и делит остаток между остальными', () => {
    const columns = [
      { key: 'a', label: 'A', type: 'date' as const, required: true, width: 100 },
      { key: 'b', label: 'B', type: 'text' as const, required: true, width: 150 },
      { key: 'c', label: 'C', type: 'text' as const, required: true },
      { key: 'd', label: 'D', type: 'text' as const, required: true },
    ];

    const widths = resolveColumnWidths(columns, 515);

    expect(widths[0]).toBe(100);
    expect(widths[1]).toBe(150);
    expect((widths[2] ?? 0) + (widths[3] ?? 0)).toBeCloseTo(265, 5);
  });

  it('масштабирует полностью явные ширины под лист', () => {
    const columns = [
      { key: 'a', label: 'A', type: 'text' as const, required: true, width: 100 },
      { key: 'b', label: 'B', type: 'text' as const, required: true, width: 100 },
    ];

    const widths = resolveColumnWidths(columns, 515);

    expect(widths[0]).toBe(257.5);
    expect(widths[1]).toBe(257.5);
  });

  it('возвращает пустой список без колонок', () => {
    expect(resolveColumnWidths([], 515)).toEqual([]);
  });
});

describe('journalPdfFilename', () => {
  it('вырезает запрещённые символы из названия', () => {
    expect(journalPdfFilename('a/b:c*d?e"f<g>h|i', '2026-10-02')).toBe(
      'a_b_c_d_e_f_g_h_i 2026-10-02.pdf',
    );
  });

  it('подставляет заглушку для пустого названия', () => {
    expect(journalPdfFilename('   ', '2026-10-02')).toBe('zhurnal 2026-10-02.pdf');
  });

  it('ограничивает длину названия', () => {
    const name = journalPdfFilename('я'.repeat(200), '2026-10-02');
    expect(name.endsWith('.pdf')).toBe(true);
    expect(name.length).toBeLessThanOrEqual(60 + ' 2026-10-02.pdf'.length);
  });
});

describe('PdfGeneratorService.sharePdf', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'canShare');
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('отправляет файл через системный шеринг', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true });
    const { service } = setup();

    await service.sharePdf(new Uint8Array([37, 80, 68, 70]), 'журнал.pdf');

    expect(canShare).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
    const data = share.mock.calls[0]?.[0] as { files?: readonly File[] };
    expect(data.files?.[0]?.name).toBe('журнал.pdf');
  });

  it('скачивает файл, если шеринг недоступен', async () => {
    const createObjectURL = vi.fn(() => 'blob:pdf');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation((): void => undefined);
    const { service } = setup();

    await service.sharePdf(new Uint8Array([1, 2, 3]), 'report.pdf');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });
});

describe('PdfGeneratorService.sharePdf на нативной платформе', () => {
  let nativeSpy: { mockRestore(): void };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///cache/journal.pdf' });
    vi.mocked(Share.share).mockResolvedValue({});
    nativeSpy = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  });

  afterEach(() => {
    nativeSpy.mockRestore();
  });

  it('записывает PDF во временную папку и зовёт нативный share', async () => {
    const { service } = setup();

    await service.sharePdf(new Uint8Array([37, 80, 68, 70]), 'журнал.pdf');

    expect(Filesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'журнал.pdf', directory: Directory.Cache }),
    );
    expect(Share.share).toHaveBeenCalledWith({
      files: ['file:///cache/journal.pdf'],
      title: 'журнал.pdf',
    });
  });

  it('превращает отмену шеринга в AbortError, чтобы UI не показал тост', async () => {
    vi.mocked(Share.share).mockRejectedValueOnce(new Error('Share canceled'));
    const { service } = setup();

    await expect(service.sharePdf(new Uint8Array([1]), 'ж.pdf')).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('прочие ошибки пробрасывает наружу', async () => {
    vi.mocked(Share.share).mockRejectedValueOnce(new Error('Permission denied'));
    const { service } = setup();

    await expect(service.sharePdf(new Uint8Array([1]), 'ж.pdf')).rejects.toThrow(
      'Permission denied',
    );
  });
});
