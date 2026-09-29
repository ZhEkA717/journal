import type { SyncableEntity } from '../../core/models/base.model';
import type { JournalTemplate } from './journal-template.model';

/** Журнал инструктажей или учёта (TZ 5.2). */
export interface Journal extends SyncableEntity {
  readonly id: string;
  readonly orgId: string;
  readonly templateId: string;
  readonly title: string;
  readonly startedAt: string;
  readonly closedAt?: string;
  readonly responsiblePerson: string;
}

/** Поля формы создания журнала (TZ 8.3). */
export interface JournalDraft {
  readonly templateId: string;
  readonly title: string;
  readonly responsiblePerson: string;
  readonly startedAt: string;
}

/** Журнал вместе с данными для карточки списка (TZ 8.2). */
export interface JournalSummary {
  readonly journal: Journal;
  readonly template?: JournalTemplate;
  readonly entryCount: number;
  readonly employeeCount: number;
}
