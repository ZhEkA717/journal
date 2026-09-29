import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../core/db/app-db';
import { EmployeeService } from '../domain/employees/employee.service';
import { JournalService } from '../domain/journals/journal.service';
import { OrganizationService } from '../domain/organizations/organization.service';
import { JournalDetailStore } from './journal-detail.store';

describe('JournalDetailStore', () => {
  let store: InstanceType<typeof JournalDetailStore>;
  let db: AppDatabase;
  let journals: JournalService;
  let employees: EmployeeService;
  let orgId: string;
  let journalId: string;
  let employeeId: string;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(JournalDetailStore);
    journals = TestBed.inject(JournalService);
    employees = TestBed.inject(EmployeeService);
    db = TestBed.inject(AppDatabase);
    await db.open();
    await Promise.all([
      db.organizations.clear(),
      db.employees.clear(),
      db.templates.clear(),
      db.journals.clear(),
      db.entries.clear(),
      db.syncQueue.clear(),
    ]);

    const organization = await TestBed.inject(OrganizationService).create({
      name: 'ООО Ромашка',
      responsiblePerson: 'Иванова Мария',
    });
    orgId = organization.id;
    const journal = await journals.create(orgId, {
      templateId: 'sys-fire-safety',
      title: 'Журнал инструктажа',
      responsiblePerson: 'Иванова Мария',
      startedAt: '2026-09-01',
    });
    journalId = journal.id;
    const employee = await employees.create(orgId, {
      fullName: 'Петров Пётр Петрович',
      position: 'Монтажник',
    });
    employeeId = employee.id;
    store.reset();
  });

  it('загружает журнал, шаблон и сотрудников', async () => {
    await store.load(journalId);

    expect(store.journal()?.id).toBe(journalId);
    expect(store.template()?.id).toBe('sys-fire-safety');
    expect(store.employees()).toHaveLength(1);
    expect(store.columns().length).toBeGreaterThan(0);
    expect(store.dateColumn()?.key).toBe('date');
    expect(store.isClosed()).toBe(false);
  });

  it('остаётся пустым при неизвестном журнале', async () => {
    await store.load('unknown');

    expect(store.journal()).toBeUndefined();
    expect(store.hasEntries()).toBe(false);
    expect(store.rows()).toEqual([]);
  });

  it('строит строки таблицы из записей', async () => {
    await store.load(journalId);
    await store.addEntry({
      journalId,
      employeeId,
      data: { date: '2026-09-01', type: 'Вводный', signature: 'sig' },
    });

    const [row] = store.rows();
    expect(store.hasEntries()).toBe(true);
    expect(store.entryCount()).toBe(1);
    expect(row?.date).toBe('2026-09-01');
    expect(row?.employeeName).toBe('Петров Пётр Петрович');
    expect(row?.kind).toBe('Вводный');
    expect(row?.signed).toBe(true);
  });

  it('валидирует пользовательские данные без ФИО и должности', async () => {
    await store.load(journalId);

    const errors = store.validate({ date: '2026-09-01', type: 'Вводный' });

    expect(errors['date']).toBeUndefined();
    expect(errors['type']).toBeUndefined();
    expect(store.validate({})['date']).toBeDefined();
  });

  it('обновляет и удаляет записи в кэше', async () => {
    const entry = await store.addEntry({
      journalId,
      employeeId,
      data: { date: '2026-09-01', type: 'Вводный', signature: 'sig' },
    });
    await store.load(journalId);

    await store.updateEntry(entry.id, {
      date: '2026-09-05',
      type: 'Повторный',
      signature: 'sig',
    });
    expect(store.rows()[0]?.date).toBe('2026-09-05');
    expect(store.rows()[0]?.kind).toBe('Повторный');

    await store.removeEntry(entry.id);
    expect(store.hasEntries()).toBe(false);
  });

  it('видит закрытый журнал', async () => {
    await journals.close(journalId);

    await store.load(journalId);

    expect(store.isClosed()).toBe(true);
  });

  it('возвращает сегодняшнюю дату для новой записи', () => {
    expect(store.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
