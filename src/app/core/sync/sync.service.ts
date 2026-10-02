import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { SupabaseClient, type User } from '@supabase/supabase-js';

import { errorMessage } from '../../shared/utils/error.utils';
import { AuthService } from '../auth/auth.service';
import { AppDatabase } from '../db/app-db';
import type { SyncStatus, VersionedEntity } from '../models/base.model';
import {
  SYNC_MAX_RETRIES,
  type SyncQueueItem,
  type SyncQueueItemInput,
} from '../models/sync-queue.model';
import type { Database } from '../supabase/supabase.types';
import { OnlineStatusService } from './online-status.service';
import {
  employeeToLocal,
  employeeToRemote,
  entryToLocal,
  entryToRemote,
  isVersioned,
  journalToLocal,
  journalToRemote,
  organizationToLocal,
  organizationToRemote,
  templateToLocal,
  templateToRemote,
} from './remote-mappers';
import { SyncConflictService } from './sync-conflict.service';
import { SyncQueueService } from './sync-queue.service';

/** Размер пачки отправки очереди. */
const FLUSH_BATCH_SIZE = 50;
/** База экспоненциальной задержки: 1s, 2s, 4s, 8s, 16s (ТЗ 9.2). */
const RETRY_BASE_MS = 1_000;
/** Префикс ключей водяного знака pull-синхронизации в localStorage. */
export const SYNC_WATERMARK_PREFIX = 'journal:sync:lastSyncAt:';

/** Итог одного полного цикла синхронизации. */
export interface SyncSummary {
  readonly pushed: number;
  readonly pulled: number;
}

/** Результат приёма одной таблицы. */
interface PullPart {
  readonly pulled: number;
  readonly maxUpdatedAt: number;
}

/** Минимальный доступ к таблице для записи результата pull. */
interface ReadableTable<T> {
  get(id: string): Promise<T | undefined>;
  put(value: T): Promise<unknown>;
}

/**
 * Оркестратор синхронизации (ТЗ 9.2, 11.3): отправка очереди в Supabase
 * с повторами, приём изменений с сервером и Last-Write-Wins через
 * `SyncConflictService`. Автоматически запускается при появлении сети,
 * старте приложения и входе; новые операции уходят сразу после записи.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly db = inject(AppDatabase);
  private readonly supabase = (inject(SupabaseClient, {
    optional: true,
  }) ?? null) as SupabaseClient<Database> | null;
  private readonly online = inject(OnlineStatusService);
  private readonly queue = inject(SyncQueueService);
  private readonly auth = inject(AuthService);
  private readonly conflicts = inject(SyncConflictService);
  private readonly destroyRef = inject(DestroyRef);

  /** Время последней успешной синхронизации (Unix ms) или null. */
  readonly lastSyncAt = signal<number | null>(null);

  /** Сеть доступна, есть сессия и настроенный Supabase. */
  private readyForSync = false;
  /** Таймер повторной отправки после неудачи. */
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Число подряд неудачных циклов для экспоненциальной задержки. */
  private failureStreak = 0;
  /** Текущий полный цикл — повторные вызовы присоединяются к нему. */
  private inflight: Promise<SyncSummary> | null = null;

  constructor() {
    // Старт, появление сети или вход → полный цикл (ТЗ 9.2, 14).
    effect(() => {
      const ready =
        this.supabase !== null && this.online.isOnline() && this.auth.currentUser() !== null;
      if (ready && !this.readyForSync) {
        this.readyForSync = true;
        this.lastSyncAt.set(this.readWatermark(this.auth.currentUser()?.id ?? ''));
        this.autoSync();
      } else if (!ready) {
        this.readyForSync = false;
      }
    });
    // Новые локальные операции уходят сразу (ТЗ 3: Local-First + push).
    effect(() => {
      if (this.queue.size() > 0 && this.readyForSync) {
        this.autoSync();
      }
    });
    this.destroyRef.onDestroy(() => this.clearRetry());
    // Сигнал очереди должен быть честным после перезапуска приложения.
    void this.queue.refreshSize();
  }

  /**
   * Полный цикл: отправка очереди и приём изменений (ТЗ 9.2, 14).
   * Повторные вызовы во время работы присоединяются к текущему циклу.
   */
  async syncAll(): Promise<SyncSummary> {
    if (this.inflight) {
      return this.inflight;
    }
    const run = this.runSync(this.requireClient(), this.requireUser());
    this.inflight = run;
    try {
      return await run;
    } finally {
      this.inflight = null;
    }
  }

  /** Ставит операцию в очередь синхронизации (ТЗ 9.2). */
  async enqueue(item: SyncQueueItemInput): Promise<void> {
    await this.queue.enqueue(item);
  }

  /** Отправляет очередь в Supabase пачками; бросает ошибку первой неудачи. */
  async flush(): Promise<void> {
    const supabase = this.requireClient();
    await this.flushInternal(supabase, this.requireUser().id);
  }

  /** Приём изменений с сервера: строки с `updated_at > since` (ТЗ 11.3). */
  async pullChanges(since: number): Promise<void> {
    this.requireClient();
    await this.pullAll(this.requireUser().id, since);
  }

  /** Last-Write-Wins: побеждает запись с более поздним `updatedAt` (ТЗ 9.2). */
  async resolveConflict(local: unknown, remote: unknown): Promise<unknown> {
    if (!isVersioned(remote)) {
      throw new Error('Некорректные данные конфликта');
    }
    if (local === null || local === undefined) {
      return remote;
    }
    if (!isVersioned(local)) {
      throw new Error('Некорректные данные конфликта');
    }
    return this.conflicts.pickWinner(local, remote);
  }

  private async runSync(supabase: SupabaseClient<Database>, user: User): Promise<SyncSummary> {
    if (!this.online.isOnline()) {
      throw new Error('Нет подключения к интернету');
    }
    try {
      const before = this.queue.size();
      await this.flushInternal(supabase, user.id);
      const pushed = before - this.queue.size();

      const since = this.readWatermark(user.id);
      const { pulled, maxUpdatedAt } = await this.pullAll(user.id, since);
      const watermark = Math.max(since, maxUpdatedAt);
      this.writeWatermark(user.id, watermark);
      this.lastSyncAt.set(watermark);

      this.failureStreak = 0;
      this.clearRetry();
      return { pushed, pulled };
    } catch (error) {
      this.scheduleRetry();
      throw error;
    }
  }

  /** Отправка очереди с уже проверенными клиентом и пользователем. */
  private async flushInternal(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
    for (;;) {
      const batch = await this.queue.take(FLUSH_BATCH_SIZE);
      if (batch.length === 0) {
        return;
      }
      for (const item of batch) {
        try {
          await this.pushItem(supabase, item, userId);
        } catch (error) {
          await this.handlePushFailure(item, error);
          throw error;
        }
        if (item.id !== undefined) {
          await this.queue.remove([item.id]);
          await this.markEntitySyncStatus(item, 'synced');
        }
      }
    }
  }

  private async pushItem(
    supabase: SupabaseClient<Database>,
    item: SyncQueueItem,
    userId: string,
  ): Promise<void> {
    switch (item.entityType) {
      case 'organization': {
        const { error } = await supabase
          .from('organizations')
          .upsert(organizationToRemote(item.payload, userId));
        if (error) {
          throw new Error(error.message);
        }
        break;
      }
      case 'employee': {
        const { error } = await supabase
          .from('employees')
          .upsert(employeeToRemote(item.payload, userId));
        if (error) {
          throw new Error(error.message);
        }
        break;
      }
      case 'template': {
        const { error } = await supabase
          .from('templates')
          .upsert(templateToRemote(item.payload, userId));
        if (error) {
          throw new Error(error.message);
        }
        break;
      }
      case 'journal': {
        const { error } = await supabase
          .from('journals')
          .upsert(journalToRemote(item.payload, userId));
        if (error) {
          throw new Error(error.message);
        }
        break;
      }
      case 'entry': {
        const { error } = await supabase
          .from('entries')
          .upsert(entryToRemote(item.payload, userId));
        if (error) {
          throw new Error(error.message);
        }
        break;
      }
      default: {
        const unknownType: never = item.entityType;
        throw new Error(`Неизвестный тип сущности: ${String(unknownType)}`);
      }
    }
  }

  /** Учёт неудачной отправки: retry или пометка конфликта (ТЗ 9.2). */
  private async handlePushFailure(item: SyncQueueItem, error: unknown): Promise<void> {
    if (item.id === undefined) {
      return;
    }
    await this.queue.markFailed(item.id, errorMessage(error, 'Ошибка отправки'));
    if (item.retries + 1 >= SYNC_MAX_RETRIES) {
      await this.queue.remove([item.id]);
      await this.markEntitySyncStatus(item, 'conflict');
    }
  }

  /** Помечает сущность после успешной отправки или исчерпания попыток. */
  private async markEntitySyncStatus(item: SyncQueueItem, status: SyncStatus): Promise<void> {
    const id = item.entityId;
    switch (item.entityType) {
      case 'organization':
        await this.db.organizations.update(id, { syncStatus: status });
        break;
      case 'employee':
        await this.db.employees.update(id, { syncStatus: status });
        break;
      case 'journal':
        await this.db.journals.update(id, { syncStatus: status });
        break;
      case 'entry':
        await this.db.entries.update(id, { syncStatus: status });
        break;
      case 'template':
        // У шаблонов нет syncStatus (ТЗ 5.2).
        break;
    }
  }

  /** Приём всех таблиц; возвращает суммарный результат и максимум updated_at. */
  private async pullAll(userId: string, since: number): Promise<PullPart> {
    const parts = await Promise.all([
      this.pullOrganizations(userId, since),
      this.pullEmployees(userId, since),
      this.pullJournals(userId, since),
      this.pullEntries(userId, since),
      this.pullTemplates(userId, since),
    ]);
    return {
      pulled: parts.reduce((sum, part) => sum + part.pulled, 0),
      maxUpdatedAt: parts.reduce((max, part) => Math.max(max, part.maxUpdatedAt), since),
    };
  }

  private async pullOrganizations(userId: string, since: number): Promise<PullPart> {
    const { data, error } = await this.requireClient()
      .from('organizations')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since);
    if (error) {
      throw new Error(error.message);
    }
    return this.collectPull(data ?? [], since, organizationToLocal, this.db.organizations);
  }

  private async pullEmployees(userId: string, since: number): Promise<PullPart> {
    const { data, error } = await this.requireClient()
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since);
    if (error) {
      throw new Error(error.message);
    }
    return this.collectPull(data ?? [], since, employeeToLocal, this.db.employees);
  }

  private async pullJournals(userId: string, since: number): Promise<PullPart> {
    const { data, error } = await this.requireClient()
      .from('journals')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since);
    if (error) {
      throw new Error(error.message);
    }
    return this.collectPull(data ?? [], since, journalToLocal, this.db.journals);
  }

  private async pullEntries(userId: string, since: number): Promise<PullPart> {
    const { data, error } = await this.requireClient()
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since);
    if (error) {
      throw new Error(error.message);
    }
    return this.collectPull(data ?? [], since, entryToLocal, this.db.entries);
  }

  private async pullTemplates(userId: string, since: number): Promise<PullPart> {
    const { data, error } = await this.requireClient()
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', since);
    if (error) {
      throw new Error(error.message);
    }
    return this.collectPull(data ?? [], since, templateToLocal, this.db.templates);
  }

  /** Применяет серверные строки по правилу Last-Write-Wins. */
  private async collectPull<TRow, T extends VersionedEntity>(
    rows: readonly TRow[],
    since: number,
    toLocal: (row: TRow) => T,
    table: ReadableTable<T>,
  ): Promise<PullPart> {
    let pulled = 0;
    let maxUpdatedAt = since;
    for (const row of rows) {
      const remote = toLocal(row);
      maxUpdatedAt = Math.max(maxUpdatedAt, remote.updatedAt);
      if (await this.applyRemote(table, remote)) {
        pulled += 1;
      }
    }
    return { pulled, maxUpdatedAt };
  }

  /** Пишет серверную версию, только если она новее локальной. */
  private async applyRemote<T extends VersionedEntity>(
    table: ReadableTable<T>,
    remote: T,
  ): Promise<boolean> {
    const existing = await table.get(remote.id);
    if (existing && this.conflicts.pickWinner(existing, remote) === existing) {
      return false;
    }
    await table.put(remote);
    return true;
  }

  /** Фоновый запуск: ошибки только логируются, не роняют приложение. */
  private autoSync(): void {
    void this.syncAll().catch((error) => {
      console.warn('Автосинхронизация не удалась', error);
    });
  }

  /** Планирует повтор после неудачи: 1s, 2s, 4s, 8s, 16s (ТЗ 9.2). */
  private scheduleRetry(): void {
    if (this.failureStreak >= SYNC_MAX_RETRIES) {
      return;
    }
    this.clearRetry();
    const delayMs = RETRY_BASE_MS * 2 ** this.failureStreak;
    this.failureStreak += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.autoSync();
    }, delayMs);
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private requireClient(): SupabaseClient<Database> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен: заполните supabaseUrl и supabaseAnonKey');
    }
    return this.supabase;
  }

  private requireUser(): User {
    const user = this.auth.currentUser();
    if (!user) {
      throw new Error('Нет активной сессии Supabase');
    }
    return user;
  }

  private readWatermark(userId: string): number {
    if (userId === '' || typeof localStorage === 'undefined') {
      return 0;
    }
    try {
      const stored = Number(localStorage.getItem(SYNC_WATERMARK_PREFIX + userId) ?? '0');
      return Number.isFinite(stored) && stored > 0 ? stored : 0;
    } catch {
      return 0;
    }
  }

  private writeWatermark(userId: string, value: number): number {
    if (userId !== '' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SYNC_WATERMARK_PREFIX + userId, String(value));
      } catch {
        // Хранилище недоступно — водяной знак живёт только в памяти.
      }
    }
    return value;
  }
}
