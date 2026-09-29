/** Тип сущности, участвующей в синхронизации (TZ 5.2). */
export type SyncEntityType = 'organization' | 'employee' | 'journal' | 'entry' | 'template';

/** Операция, поставленная в очередь синхронизации (TZ 5.2). */
export type SyncAction = 'create' | 'update' | 'delete';

/** Элемент очереди синхронизации (TZ 5.2). */
export interface SyncQueueItem {
  readonly id?: number;
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly action: SyncAction;
  readonly payload: unknown;
  readonly createdAt: number;
  readonly retries: number;
  readonly lastError?: string;
}

/** Аргумент для постановки операции в очередь: без служебных полей. */
export type SyncQueueItemInput = Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>;

/** Максимум попыток отправки до пометки сущности как конфликтной (TZ 9.2). */
export const SYNC_MAX_RETRIES = 5;
