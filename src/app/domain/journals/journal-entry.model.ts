import type { SyncableEntity } from '../../core/models/base.model';

/** Значения полей записи — динамические, по `ColumnDef` шаблона (TZ 5.2). */
export type EntryData = Readonly<Record<string, string | number | null>>;

/** Запись журнала (TZ 5.2). */
export interface JournalEntry extends SyncableEntity {
  readonly id: string;
  readonly journalId: string;
  readonly employeeId: string;
  readonly data: EntryData;
}

/** Поля динамической формы записи (TZ 8.5). */
export interface JournalEntryDraft {
  readonly journalId: string;
  readonly employeeId: string;
  readonly data: EntryData;
}
