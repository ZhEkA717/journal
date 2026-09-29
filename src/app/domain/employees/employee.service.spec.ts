import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../../core/db/app-db';
import { SyncQueueService } from '../../core/sync/sync-queue.service';
import { EmployeeService } from './employee.service';

const ORG_ID = 'org-1';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let db: AppDatabase;
  let queue: SyncQueueService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmployeeService);
    db = TestBed.inject(AppDatabase);
    queue = TestBed.inject(SyncQueueService);
    await db.open();
    await db.employees.clear();
    await db.entries.clear();
    await db.syncQueue.clear();
    await queue.refreshSize();
  });

  async function createEmployee(fullName = 'Иванов Иван', position = 'Маляр'): Promise<string> {
    const employee = await service.create(ORG_ID, {
      fullName,
      position,
      hiredAt: '2026-01-15',
    });
    return employee.id;
  }

  it('требует ФИО и должность', () => {
    const errors = service.validate({ fullName: 'Я', position: '  ', hiredAt: '' });
    expect(errors['fullName']).toBeDefined();
    expect(errors['position']).toBeDefined();
    expect(errors['hiredAt']).toBeDefined();
  });

  it('подставляет сегодняшнюю дату приёма', async () => {
    const employee = await service.create(ORG_ID, { fullName: 'Петров П', position: 'Мастер' });
    expect(employee.hiredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(employee.syncStatus).toBe('pending');
  });

  it('не создаёт сотрудника с некорректными данными', async () => {
    await expect(
      service.create(ORG_ID, { fullName: '', position: '', hiredAt: '' }),
    ).rejects.toThrow();
    expect(await db.employees.count()).toBe(0);
  });

  it('сортирует сотрудников по ФИО', async () => {
    await createEmployee('Яковлев Яков');
    await createEmployee('Абрамов Андрей');

    const employees = await service.listByOrg(ORG_ID);
    expect(employees.map((employee) => employee.fullName)).toEqual([
      'Абрамов Андрей',
      'Яковлев Яков',
    ]);
  });

  it('ищет по ФИО и должности без учёта регистра', async () => {
    await createEmployee('Иванов Иван', 'Маляр');
    await createEmployee('Сидоров Сидор', 'Сварщик');

    expect(await service.search(ORG_ID, 'маляр')).toHaveLength(1);
    expect(await service.search(ORG_ID, 'СИДО')).toHaveLength(1);
    expect(await service.search(ORG_ID, '')).toHaveLength(2);
    expect(await service.search(ORG_ID, 'нет такого')).toHaveLength(0);
  });

  it('скрывает удалённых сотрудников', async () => {
    const id = await createEmployee();

    await service.remove(id);

    expect(await service.listByOrg(ORG_ID)).toHaveLength(0);
    expect(await db.employees.get(id)).toBeDefined();
    expect((await db.employees.get(id))?.deletedAt).toBeGreaterThan(0);
  });

  it('фиксирует дату увольнения', async () => {
    const id = await createEmployee();

    const employee = await service.fire(id);

    expect(employee.firedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('сохраняет эталонную подпись', async () => {
    const id = await createEmployee();

    const employee = await service.saveSignature(id, 'data:image/png;base64,AAA');

    expect(employee.signature).toBe('data:image/png;base64,AAA');
  });

  it('считает число инструктажей сотрудника', async () => {
    const id = await createEmployee();
    await db.entries.bulkAdd([
      {
        id: 'e1',
        journalId: 'j1',
        employeeId: id,
        data: {},
        createdAt: 1,
        updatedAt: 1,
        syncStatus: 'synced',
      },
      {
        id: 'e2',
        journalId: 'j1',
        employeeId: id,
        data: {},
        createdAt: 2,
        updatedAt: 2,
        syncStatus: 'synced',
      },
      {
        id: 'e3',
        journalId: 'j2',
        employeeId: 'other',
        data: {},
        createdAt: 3,
        updatedAt: 3,
        syncStatus: 'synced',
      },
      {
        id: 'e4',
        journalId: 'j2',
        employeeId: id,
        data: {},
        createdAt: 4,
        updatedAt: 4,
        syncStatus: 'synced',
        deletedAt: 5,
      },
    ]);

    expect(await service.instructionCount(id)).toBe(2);
  });
});
