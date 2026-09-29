import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import { DateService } from '../core/date/date.service';
import type { Employee } from '../domain/employees/employee.model';
import { EmployeeService } from '../domain/employees/employee.service';
import type {
  EntryData,
  JournalEntry,
  JournalEntryDraft,
} from '../domain/journals/journal-entry.model';
import type { ColumnDef, JournalTemplate } from '../domain/journals/journal-template.model';
import type { JournalSummary } from '../domain/journals/journal.model';
import { JournalService } from '../domain/journals/journal.service';
import type { FieldErrors } from '../domain/validation.model';

/** Строка таблицы записей: модель представления для детального вида журнала (ТЗ 8.4). */
export interface EntryRow {
  readonly id: string;
  readonly date: string;
  readonly employeeName: string;
  readonly kind: string;
  readonly signed: boolean;
  readonly syncStatus: JournalEntry['syncStatus'];
}

interface JournalDetailState {
  /** Сводка журнала с шаблоном и счётчиками. */
  readonly summary: JournalSummary | undefined;
  /** Записи журнала, новые сверху. */
  readonly entries: readonly JournalEntry[];
  /** Сотрудники организации — для колонки «ФИО». */
  readonly employees: readonly Employee[];
  /** Идёт загрузка. */
  readonly loading: boolean;
}

/**
 * Детальный вид журнала: шаблон, записи и сотрудники (ТЗ 8.4).
 * Форма записи использует `columns` этого же store, поэтому шаблон грузится один раз.
 */
export const JournalDetailStore = signalStore(
  { providedIn: 'root' },
  withState<JournalDetailState>({
    summary: undefined,
    entries: [],
    employees: [],
    loading: false,
  }),
  withComputed(({ summary }) => ({
    /** Журнал. */
    journal: computed(() => summary()?.journal),
    /** Шаблон журнала — определяет форму записи. */
    template: computed(() => summary()?.template),
    /** Журнал закрыт: ведение завершено, записи только просматриваются. */
    isClosed: computed(() => summary()?.journal.closedAt !== undefined),
  })),
  withComputed(({ template }) => ({
    /** Колонки шаблона в порядке объявления. */
    columns: computed<readonly ColumnDef[]>(() => template()?.columns ?? []),
  })),
  withComputed(({ columns, employees, entries }) => ({
    /** Количество записей в журнале. */
    entryCount: computed(() => entries().length),
    /** Есть ли записи — влияет на empty state. */
    hasEntries: computed(() => entries().length > 0),
    /** Активные сотрудники для выпадающего списка в форме записи. */
    activeEmployees: computed(() => employees().filter((employee) => !employee.firedAt)),
    /** Сотрудник по идентификатору. */
    employeeById: computed(() => new Map(employees().map((employee) => [employee.id, employee]))),
    /** Колонка с датой — первая колонка типа `date`. */
    dateColumn: computed(() => findColumn(columns(), 'date')),
    /** Колонка с видом записи (инструктаж, причина) — первая колонка типа `select`. */
    kindColumn: computed(() => findColumn(columns(), 'select')),
    /** Колонка с подписью. */
    signatureColumn: computed(() => findColumn(columns(), 'signature')),
    /** Строки таблицы записей (ТЗ 8.4). */
    rows: computed<readonly EntryRow[]>(() => {
      const dateKey = findColumn(columns(), 'date')?.key;
      const kindKey = findColumn(columns(), 'select')?.key;
      const signatureKey = findColumn(columns(), 'signature')?.key;
      const nameById = new Map(employees().map((employee) => [employee.id, employee] as const));
      return entries().map((entry) => {
        const employee = nameById.get(entry.employeeId);
        return {
          id: entry.id,
          date: dateKey ? (asText(entry.data[dateKey]) ?? '') : '',
          employeeName: employee?.fullName ?? asText(entry.data['employee']) ?? '—',
          kind: kindKey ? (asText(entry.data[kindKey]) ?? '—') : '—',
          signed: signatureKey ? Boolean(asText(entry.data[signatureKey])) : true,
          syncStatus: entry.syncStatus,
        };
      });
    }),
  })),
  withMethods((store) => {
    const journalService = inject(JournalService);
    const employeeService = inject(EmployeeService);
    const dateService = inject(DateService);

    /** Загружает журнал, его записи и сотрудников организации. */
    const load = async (journalId: string): Promise<void> => {
      patchState(store, { loading: true });
      const summary = await journalService.getSummary(journalId);
      const [entries, employees] = await Promise.all([
        journalService.listEntries(journalId),
        summary ? employeeService.listByOrg(summary.journal.orgId) : Promise.resolve([]),
      ]);
      patchState(store, { summary, entries, employees, loading: false });
    };

    return {
      load,

      /** Сбрасывает состояние при уходе с экрана. */
      reset(): void {
        patchState(store, { summary: undefined, entries: [], employees: [], loading: false });
      },

      /** Проверяет данные записи по шаблону журнала (ТЗ 8.5). */
      validate(data: EntryData): FieldErrors {
        const template: JournalTemplate | undefined = store.template();
        if (!template) {
          return {};
        }
        return journalService.validateEntryInput(template, data).errors;
      },

      /** Сохраняет новую запись и обновляет список (ТЗ 8.5). */
      async addEntry(draft: JournalEntryDraft): Promise<JournalEntry> {
        const entry = await journalService.addEntry(draft);
        patchState(store, { entries: [entry, ...store.entries()] });
        return entry;
      },

      /** Обновляет запись и перезагружает список. */
      async updateEntry(entryId: string, data: EntryData): Promise<JournalEntry> {
        const entry = await journalService.updateEntry(entryId, data);
        await load(entry.journalId);
        return entry;
      },

      /** Удаляет запись и обновляет список. */
      async removeEntry(entryId: string): Promise<JournalEntry> {
        const entry = await journalService.removeEntry(entryId);
        patchState(store, { entries: store.entries().filter((item) => item.id !== entryId) });
        return entry;
      },

      /** Дата по умолчанию для новой записи — сегодня. */
      today(): string {
        return dateService.today();
      },
    };
  }),
);

function findColumn(columns: readonly ColumnDef[], type: ColumnDef['type']): ColumnDef | undefined {
  return columns.find((column) => column.type === type);
}

function asText(value: EntryData[string]): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}
