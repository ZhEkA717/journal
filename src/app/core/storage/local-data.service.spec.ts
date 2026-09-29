import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../db/app-db';
import { LocalDataService } from './local-data.service';

describe('LocalDataService', () => {
  let service: LocalDataService;
  let db: AppDatabase;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalDataService);
    db = TestBed.inject(AppDatabase);
    await db.open();
    await db.organizations.add({
      id: 'org-1',
      name: 'ООО Ромашка',
      responsiblePerson: 'Иванова Мария',
      createdAt: 1,
      updatedAt: 1,
      syncStatus: 'pending',
    });
    await db.employees.add({
      id: 'emp-1',
      orgId: 'org-1',
      fullName: 'Петров Пётр',
      position: 'Монтажник',
      hiredAt: '2026-01-15',
      createdAt: 1,
      updatedAt: 1,
      syncStatus: 'pending',
    });
    await db.journals.add({
      id: 'jrn-1',
      orgId: 'org-1',
      templateId: 'sys-fire-safety',
      title: 'Журнал',
      startedAt: '2026-09-01',
      responsiblePerson: 'Иванова Мария',
      createdAt: 1,
      updatedAt: 1,
      syncStatus: 'pending',
    });
  });

  it('очищает все таблицы', async () => {
    await service.wipe();

    expect(await db.organizations.count()).toBe(0);
    expect(await db.employees.count()).toBe(0);
    expect(await db.journals.count()).toBe(0);
    expect(await db.entries.count()).toBe(0);
    expect(await db.syncQueue.count()).toBe(0);
  });

  it('не падает на пустой базе', async () => {
    await service.wipe();

    await expect(service.wipe()).resolves.toBeUndefined();
  });
});
