import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../core/db/app-db';
import { EmployeeService } from '../domain/employees/employee.service';
import { OrganizationService } from '../domain/organizations/organization.service';
import { EmployeesStore } from './employees.store';
import { SessionStore } from './session.store';

describe('EmployeesStore', () => {
  let store: InstanceType<typeof EmployeesStore>;
  let session: InstanceType<typeof SessionStore>;
  let employees: EmployeeService;
  let db: AppDatabase;
  let orgId: string;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(EmployeesStore);
    session = TestBed.inject(SessionStore);
    employees = TestBed.inject(EmployeeService);
    db = TestBed.inject(AppDatabase);
    await db.open();
    await Promise.all([
      db.organizations.clear(),
      db.employees.clear(),
      db.journals.clear(),
      db.entries.clear(),
      db.syncQueue.clear(),
    ]);

    const organization = await TestBed.inject(OrganizationService).create({
      name: 'ООО Ромашка',
      responsiblePerson: 'Иванова Мария',
    });
    orgId = organization.id;
    await session.load();
  });

  it('загружает сотрудников и счётчики инструктажей', async () => {
    await employees.create(orgId, { fullName: 'Петров Пётр Петрович', position: 'Монтажник' });

    await store.load();

    expect(store.employees()).toHaveLength(1);
    expect(store.hasEmployees()).toBe(true);
    expect(store.instructionsOf()(store.employees()[0].id)).toBe(0);
  });

  it('остаётся пустым без организации', async () => {
    session.reset();

    await store.load();

    expect(store.employees()).toEqual([]);
  });

  it('фильтрует список по запросу', async () => {
    await employees.create(orgId, { fullName: 'Петров Пётр Петрович', position: 'Монтажник' });
    await employees.create(orgId, { fullName: 'Сидоров Сергей', position: 'Сварщик' });
    await store.load();

    store.setQuery('сварщик');
    expect(store.filtered().map((item) => item.fullName)).toEqual(['Сидоров Сергей']);

    store.setQuery('пётр');
    expect(store.filtered()).toHaveLength(1);

    store.setQuery('');
    expect(store.filtered()).toHaveLength(2);
  });

  it('разделяет действующих и уволенных', async () => {
    const first = await employees.create(orgId, { fullName: 'Петров Пётр', position: 'Монтажник' });
    await employees.create(orgId, { fullName: 'Сидоров Сергей', position: 'Сварщик' });
    await store.load();

    await store.fire(first.id);

    expect(store.active().map((item) => item.fullName)).toEqual(['Сидоров Сергей']);
    expect(store.employees()[0].firedAt).toBeDefined();
  });

  it('возвращает уволенного сотрудника в штат', async () => {
    const created = await employees.create(orgId, {
      fullName: 'Петров Пётр',
      position: 'Монтажник',
    });
    await store.fire(created.id);

    await store.restore(created.id);

    expect(store.active()).toHaveLength(1);
  });

  it('создаёт и обновляет карточку', async () => {
    const created = await store.create({ fullName: 'Петров Пётр', position: 'Монтажник' });

    expect(store.employees()).toHaveLength(1);
    expect(created.hiredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await store.update(created.id, {
      fullName: '  Петров   Пётр  ',
      position: 'Сварщик',
      hiredAt: '2026-01-15',
    });

    const employee = store.byId().get(created.id);
    expect(employee?.fullName).toBe('Петров Пётр');
    expect(employee?.position).toBe('Сварщик');
  });

  it('валидирует карточку', async () => {
    const errors = store.validate({ fullName: 'П', position: '' });

    expect(errors['fullName']).toBeDefined();
    expect(errors['position']).toBeDefined();
  });
});
