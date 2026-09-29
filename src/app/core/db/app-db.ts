import { Injectable } from '@angular/core';
import Dexie, { type Table } from 'dexie';

import type { JournalTemplate } from '../../domain/journals/journal-template.model';
import type { JournalEntry } from '../../domain/journals/journal-entry.model';
import type { Journal } from '../../domain/journals/journal.model';
import type { Employee } from '../../domain/employees/employee.model';
import type { Organization } from '../../domain/organizations/organization.model';
import type { SyncQueueItem } from '../models/sync-queue.model';
import { SCHEMA_MIGRATIONS } from './migrations';

export const DB_NAME = 'journal-app';

/**
 * Локальная БД приложения (TZ 6). Единственный экземпляр в приложении
 * получается через DI: `inject(AppDatabase)`.
 */
@Injectable({ providedIn: 'root' })
export class AppDatabase extends Dexie {
  declare readonly organizations: Table<Organization, string>;
  declare readonly employees: Table<Employee, string>;
  declare readonly templates: Table<JournalTemplate, string>;
  declare readonly journals: Table<Journal, string>;
  declare readonly entries: Table<JournalEntry, string>;
  declare readonly syncQueue: Table<SyncQueueItem, number>;

  constructor() {
    super(DB_NAME);
    for (const migration of SCHEMA_MIGRATIONS) {
      this.version(migration.version).stores(migration.stores);
    }
  }
}
