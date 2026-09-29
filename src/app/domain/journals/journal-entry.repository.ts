import { Injectable } from '@angular/core';

import { SyncableRepository } from '../../core/db/syncable.repository';
import { uuid } from '../../shared/utils/uuid';
import type { EntryData, JournalEntry, JournalEntryDraft } from './journal-entry.model';

/** CRUD записей журнала без бизнес-логики (TZ 3, 4). */
@Injectable({ providedIn: 'root' })
export class JournalEntryRepository extends SyncableRepository<JournalEntry> {
  protected readonly table = this.db.entries;
  protected readonly entityType = 'entry' as const;

  /** Записи журнала, кроме удалённых; новые сверху. */
  async listByJournal(journalId: string): Promise<JournalEntry[]> {
    const items = await this.table.where('journalId').equals(journalId).toArray();
    return items
      .filter((item) => item.deletedAt === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Все записи сотрудника во всех журналах — счётчик инструктажей (TZ 8.6). */
  async countByEmployee(employeeId: string): Promise<number> {
    return this.table
      .where('employeeId')
      .equals(employeeId)
      .filter((item) => !item.deletedAt)
      .count();
  }

  /** Запись по идентификатору. */
  async getById(id: string): Promise<JournalEntry | undefined> {
    return this.findById(id);
  }

  /** Создаёт запись и ставит операцию в очередь синхронизации. */
  async create(draft: JournalEntryDraft): Promise<JournalEntry> {
    return this.insert({ id: uuid(), ...draft });
  }

  /** Обновляет значения полей записи. */
  async update(id: string, data: EntryData): Promise<JournalEntry> {
    return this.updateExisting(id, { data });
  }

  /** Помечает запись удалённой. */
  async remove(id: string): Promise<JournalEntry> {
    return this.softDelete(id);
  }
}
