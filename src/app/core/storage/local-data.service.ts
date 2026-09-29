import { Injectable, inject } from '@angular/core';

import { AppDatabase } from '../db/app-db';

/**
 * Полная очистка локальных данных. Нужна для действия «Выйти» в настройках
 * (ТЗ 8.7): на устройстве не должно остаться следов предыдущей организации.
 */
@Injectable({ providedIn: 'root' })
export class LocalDataService {
  private readonly db = inject(AppDatabase);

  /** Удаляет все таблицы, включая очередь синхронизации. */
  async wipe(): Promise<void> {
    await this.db.transaction(
      'rw',
      [
        this.db.organizations,
        this.db.employees,
        this.db.templates,
        this.db.journals,
        this.db.entries,
        this.db.syncQueue,
      ],
      async () => {
        await Promise.all([
          this.db.organizations.clear(),
          this.db.employees.clear(),
          this.db.templates.clear(),
          this.db.journals.clear(),
          this.db.entries.clear(),
          this.db.syncQueue.clear(),
        ]);
      },
    );
  }
}
