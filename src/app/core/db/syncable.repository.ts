import { inject } from '@angular/core';
import type { Table } from 'dexie';

import { DateService } from '../date/date.service';
import type { NewEntity, SyncableEntity, SyncStatus } from '../models/base.model';
import type { SyncAction, SyncEntityType } from '../models/sync-queue.model';
import { SyncQueueService } from '../sync/sync-queue.service';
import { AppDatabase } from './app-db';

/**
 * Общая часть репозиториев синхронизируемых сущностей: запись в IndexedDB,
 * постановка операции в очередь синхронизации и soft-delete (TZ 3).
 * Бизнес-логики здесь нет — она живёт в доменных сервисах.
 */
export abstract class SyncableRepository<T extends SyncableEntity> {
  protected abstract readonly table: Table<T, string>;
  protected abstract readonly entityType: SyncEntityType;

  protected readonly db = inject(AppDatabase);

  private readonly queue = inject(SyncQueueService);
  private readonly date = inject(DateService);

  /** Активные (не удалённые) записи. */
  protected async listActive(): Promise<T[]> {
    const items = await this.table.toArray();
    return items.filter((item) => item.deletedAt === undefined);
  }

  /** Запись по идентификатору. */
  protected async findById(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  /** Записи, ожидающие синхронизации. */
  async listPending(): Promise<T[]> {
    const items = await this.table.toArray();
    return items.filter((item) => item.syncStatus === 'pending');
  }

  /** Конфликтные записи — после исчерпания попыток отправки. */
  async listConflicted(): Promise<T[]> {
    const items = await this.table.toArray();
    return items.filter((item) => item.syncStatus === 'conflict');
  }

  /** Создаёт сущность с `syncStatus: 'pending'` и ставит операцию в очередь. */
  protected async insert(entity: NewEntity<T>): Promise<T> {
    const now = this.date.nowTimestamp();
    const prepared = { ...entity, createdAt: now, updatedAt: now, syncStatus: 'pending' } as T;
    await this.write(prepared, 'create');
    return prepared;
  }

  /** Обновляет сущность, помечает её как ожидающую синхронизации. */
  protected async updateExisting<P extends Partial<T>>(id: string, patch: P): Promise<T> {
    const current = await this.findById(id);
    if (!current) {
      throw new Error(`Запись ${this.entityType}/${id} не найдена`);
    }
    const updated = {
      ...current,
      ...patch,
      updatedAt: this.date.nowTimestamp(),
      syncStatus: 'pending',
    } as T;
    await this.write(updated, 'update');
    return updated;
  }

  /** Soft-delete: сущность остаётся в БД, но помечается удалённой (TZ 5.1). */
  protected async softDelete(id: string): Promise<T> {
    const patch = { deletedAt: this.date.nowTimestamp() } as Partial<T>;
    return this.updateExisting(id, patch);
  }

  /** Меняет статус синхронизации без постановки операции в очередь. */
  protected async setSyncStatus(id: string, syncStatus: SyncStatus): Promise<void> {
    const current = await this.findById(id);
    if (!current) {
      return;
    }
    await this.table.put({ ...current, syncStatus });
  }

  /** Помечает сущность синхронизированной после успешной отправки. */
  async markSynced(id: string): Promise<void> {
    await this.setSyncStatus(id, 'synced');
  }

  /** Помечает сущность конфликтной после исчерпания попыток отправки (TZ 9.2). */
  async markConflicted(id: string): Promise<void> {
    await this.setSyncStatus(id, 'conflict');
  }

  /** Сохраняет изменения, пришедшие с сервера, без постановки в очередь. */
  async applyRemote(remote: T): Promise<void> {
    await this.table.put(remote);
  }

  private async write(entity: T, action: SyncAction): Promise<void> {
    await this.db.transaction('rw', [this.table, this.db.syncQueue], async () => {
      await this.table.put(entity);
      await this.queue.enqueue({
        entityType: this.entityType,
        entityId: entity.id,
        action,
        payload: entity,
      });
    });
  }
}
