import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../../core/db/app-db';
import { EmployeeService } from '../../domain/employees/employee.service';
import { JournalService } from '../../domain/journals/journal.service';
import type { JournalSummary } from '../../domain/journals/journal.model';
import { OrganizationService } from '../../domain/organizations/organization.service';
import { SessionStore } from '../session.store';
import { JournalsStore } from '../journals.store';

/**
 * Проверяем магазин на реальном стеке сервисов (fake-indexeddb): store должен
 * отдавать в кэш ровно то, что лежит в IndexedDB.
 */
describe('JournalsStore', () => {
  let store: InstanceType<typeof JournalsStore>;
  let db: AppDatabase;
  let session: InstanceType<typeof SessionStore>;
  let journalService: JournalService;
  let employeeService: EmployeeService;
  let orgId: string;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(JournalsStore);
    session = TestBed.inject(SessionStore);
    journalService = TestBed.inject(JournalService);
    employeeService = TestBed.inject(EmployeeService);
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
    await session.load();
  });

  it('остаётся пустым без организации', async () => {
    session.reset();

    await store.load();

    expect(store.journals()).toEqual([]);
    expect(store.hasJournals()).toBe(false);
  });

  it('загружает журналы и шаблоны организации', async () => {
    await journalService.create(orgId, {
      templateId: 'sys-fire-safety',
      title: 'Журнал инструктажа',
      responsiblePerson: 'Иванова Мария',
      startedAt: '2026-09-01',
    });

    await store.load();

    expect(store.journals()).toHaveLength(1);
    expect(store.hasJournals()).toBe(true);
    expect(store.templates().length).toBeGreaterThan(0);
    expect(store.systemTemplates().every((template) => template.isSystem)).toBe(true);
  });

  it('считает журналы, ожидающие синхронизации', async () => {
    const journal = await journalService.create(orgId, {
      templateId: 'sys-labor-safety',
      title: 'Охрана труда',
      responsiblePerson: 'Иванова Мария',
      startedAt: '2026-09-01',
    });

    await store.load();
    expect(store.pendingCount()).toBe(1);

    await db.journals.update(journal.id, { syncStatus: 'synced' });
    await store.load();
    expect(store.pendingCount()).toBe(0);
  });

  it('создаёт журнал и обновляет список', async () => {
    await store.create({
      templateId: 'sys-vacation',
      title: 'Отпуска 2026',
      responsiblePerson: 'Иванова Мария',
      startedAt: '2026-01-01',
    });

    const summaries: readonly JournalSummary[] = store.journals();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].journal.title).toBe('Отпуска 2026');
    expect(summaries[0].template?.id).toBe('sys-vacation');
  });

  it('не создаёт журнал без выбранного шаблона', async () => {
    const errors = store.validate({
      templateId: '',
      title: 'Журнал',
      responsiblePerson: 'Иванова Мария',
      startedAt: '2026-09-01',
    });

    expect(errors['templateId']).toBeDefined();
  });

  it('закрывает журнал и обновляет список', async () => {
    const created = await store.create({
      templateId: 'sys-fire-safety',
      title: 'Пожарка',
      responsiblePerson: 'Иванова Мария',
      startedAt: '2026-09-01',
    });

    const closed = await store.close(created.id);

    expect(closed.closedAt).toBeDefined();
    expect(store.journals()[0].journal.closedAt).toBeDefined();
  });

  it('удаляет журнал вместе с записями', async () => {
    const created = await store.create({
      templateId: 'sys-fire-safety',
      title: 'Пожарка',
      responsiblePerson: 'Иванова Мария',
      startedAt: '2026-09-01',
    });
    const employee = await employeeService.create(orgId, {
      fullName: 'Петров Пётр Петрович',
      position: 'Монтажник',
    });
    await journalService.addEntry({
      journalId: created.id,
      employeeId: employee.id,
      data: { date: '2026-09-01', type: 'Вводный', signature: 'data:image/png;base64,AA' },
    });

    await store.remove(created.id);

    expect(store.journals()).toEqual([]);
    expect(await db.journals.count()).toBe(1);
    expect(await db.entries.count()).toBe(1);
  });
});
