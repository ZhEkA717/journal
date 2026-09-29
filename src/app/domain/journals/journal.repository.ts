import { Injectable } from '@angular/core';

import { SyncableRepository } from '../../core/db/syncable.repository';
import { uuid } from '../../shared/utils/uuid';
import type { Journal, JournalDraft } from './journal.model';

/** CRUD журналов без бизнес-логики (TZ 3, 4). */
@Injectable({ providedIn: 'root' })
export class JournalRepository extends SyncableRepository<Journal> {
  protected readonly table = this.db.journals;
  protected readonly entityType = 'journal' as const;

  /** Журналы организации, кроме удалённых; свежие сверху. */
  async listByOrg(orgId: string): Promise<Journal[]> {
    const items = await this.table.where('orgId').equals(orgId).toArray();
    return items
      .filter((item) => item.deletedAt === undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Журнал по идентификатору. */
  async getById(id: string): Promise<Journal | undefined> {
    return this.findById(id);
  }

  /** Создаёт журнал со статусом `pending` и ставит операцию в очередь. */
  async create(orgId: string, draft: JournalDraft): Promise<Journal> {
    return this.insert({ id: uuid(), orgId, ...draft });
  }

  /** Обновляет название и ответственного за журнал. */
  async update(id: string, draft: JournalDraft): Promise<Journal> {
    return this.updateExisting(id, { ...draft });
  }

  /** Закрывает журнал, проставляя дату закрытия. */
  async close(id: string, closedAt: string): Promise<Journal> {
    return this.updateExisting(id, { closedAt });
  }

  /** Помечает журнал удалённым. */
  async remove(id: string): Promise<Journal> {
    return this.softDelete(id);
  }
}
