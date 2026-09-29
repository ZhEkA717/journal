/**
 * Схема IndexedDB. Версии объявляются инкрементально, новая версия добавляется
 * в конец массива (TZ 6). Ключ `null` в `stores` означает удаление индекса.
 */
export interface SchemaMigration {
  readonly version: number;
  readonly stores: Readonly<Record<string, string | null>>;
}

export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [
  {
    version: 1,
    stores: {
      organizations: 'id, updatedAt, syncStatus, deletedAt',
      employees: 'id, orgId, fullName, updatedAt, syncStatus, deletedAt',
      templates: 'id, orgId, category, isSystem',
      journals: 'id, orgId, templateId, startedAt, updatedAt, syncStatus, deletedAt',
      entries: 'id, journalId, employeeId, updatedAt, syncStatus, deletedAt',
      syncQueue: '++id, entityType, entityId, createdAt, retries',
    },
  },
];

/** Актуальная версия схемы. */
export const CURRENT_SCHEMA_VERSION = SCHEMA_MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0,
);
