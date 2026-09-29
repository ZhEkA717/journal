import { Injectable, inject, signal } from '@angular/core';

import { DateService } from '../date/date.service';
import { AppDatabase } from '../db/app-db';
import type { SyncQueueItem, SyncQueueItemInput } from '../models/sync-queue.model';

/** Локальная очередь операций для отправки в Supabase (TZ 9.2). */
@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  private readonly db = inject(AppDatabase);
  private readonly date = inject(DateService);

  /** Размер очереди — для индикатора синхронизации и баннера офлайна. */
  readonly size = signal(0);

  /** Кладёт операцию в очередь. */
  async enqueue(item: SyncQueueItemInput): Promise<void> {
    await this.db.syncQueue.add({ ...item, createdAt: this.date.nowTimestamp(), retries: 0 });
    await this.refreshSize();
  }

  /** Возвращает очередь в порядке добавления. */
  async list(): Promise<SyncQueueItem[]> {
    return this.db.syncQueue.orderBy('createdAt').toArray();
  }

  /** Возвращает не более `limit` первых операций очереди. */
  async take(limit: number): Promise<SyncQueueItem[]> {
    return this.db.syncQueue.orderBy('createdAt').limit(limit).toArray();
  }

  /** Убирает успешно отправленные операции. */
  async remove(ids: readonly number[]): Promise<void> {
    await this.db.syncQueue.bulkDelete([...ids]);
    await this.refreshSize();
  }

  /** Фиксирует неудачную попытку: инкремент retries и текст ошибки. */
  async markFailed(id: number, error: string): Promise<void> {
    const item = await this.db.syncQueue.get(id);
    if (!item) {
      return;
    }
    await this.db.syncQueue.update(id, { retries: item.retries + 1, lastError: error });
  }

  /** Полностью очищает очередь (например, после выхода из аккаунта). */
  async clear(): Promise<void> {
    await this.db.syncQueue.clear();
    await this.refreshSize();
  }

  /** Пересчитывает сигнал размера очереди. */
  async refreshSize(): Promise<void> {
    this.size.set(await this.db.syncQueue.count());
  }
}
