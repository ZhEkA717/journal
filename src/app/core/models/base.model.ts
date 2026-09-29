/** Статус синхронизации сущности (TZ 5.1). */
export type SyncStatus = 'synced' | 'pending' | 'conflict';

/** Общая часть всех сущностей: идентификатор и время изменения (TZ 5.1). */
export interface VersionedEntity {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Сущность с soft-delete и статусом синхронизации (TZ 5.1). */
export interface SyncableEntity extends VersionedEntity {
  readonly syncStatus: SyncStatus;
  readonly deletedAt?: number;
}

/** Данные новой сущности: без служебных полей, которые проставляет репозиторий. */
export type NewEntity<T extends SyncableEntity> = Omit<T, 'createdAt' | 'updatedAt' | 'syncStatus'>;
