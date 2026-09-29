import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../../core/db/app-db';
import { SyncQueueService } from '../../core/sync/sync-queue.service';
import { EmployeeService } from '../employees/employee.service';
import { OrganizationService } from '../organizations/organization.service';
import type { JournalTemplate } from './journal-template.model';
import { JournalService } from './journal.service';

const FIRE_TEMPLATE_ID = 'sys-fire-safety';
const VACATION_TEMPLATE_ID = 'sys-vacation';

describe('JournalService', async () => {
  let service: JournalService;
  let db: AppDatabase;
  let queue: SyncQueueService;
  let employees: EmployeeService;
  let orgId: string;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JournalService);
    db = TestBed.inject(AppDatabase);
    queue = TestBed.inject(SyncQueueService);
    employees = TestBed.inject(EmployeeService);
    await db.open();
    await db.journals.clear();
    await db.entries.clear();
    await db.templates.clear();
    await db.employees.clear();
    await db.syncQueue.clear();
    await queue.refreshSize();

    const organization = await TestBed.inject(OrganizationService).create({
      name: 'ООО Ромашка',
      responsiblePerson: 'Иванова Мария',
    });
    orgId = organization.id;
  });

  async function createJournal(templateId = FIRE_TEMPLATE_ID, startedAt = '2026-09-01') {
    return service.create(orgId, {
      templateId,
      title: '',
      responsiblePerson: 'Иванова Мария',
      startedAt,
    });
  }

  async function template(id: string): Promise<JournalTemplate> {
    const found = await service.getTemplate(id);
    if (!found) {
      throw new Error(`Шаблон ${id} не найден в фикстуре`);
    }
    return found;
  }

  describe('журналы', async () => {
    it('подставляет название из шаблона и ставит журнал в очередь', async () => {
      const journal = await createJournal();

      expect(journal.title).toBe('Журнал инструктажа по пожарной безопасности');
      expect(journal.syncStatus).toBe('pending');
      const queueItems = await queue.list();
      expect(queueItems.at(-1)?.entityType).toBe('journal');
      expect(queueItems.at(-1)?.action).toBe('create');
    });

    it('не создаёт журнал с неизвестным шаблоном', async () => {
      await expect(createJournal('sys-unknown')).rejects.toThrow('Шаблон журнала не найден');
      expect(await db.journals.count()).toBe(0);
    });

    it('проверяет реквизиты журнала', async () => {
      const errors = service.validate({
        templateId: '',
        title: 'Я',
        responsiblePerson: '',
        startedAt: '01.09.2026',
      });
      expect(errors['templateId']).toBeDefined();
      expect(errors['title']).toBeDefined();
      expect(errors['responsiblePerson']).toBeDefined();
      expect(errors['startedAt']).toBeDefined();
    });

    it('собирает сводку для карточки списка', async () => {
      const journal = await createJournal();
      const first = await employees.create(orgId, {
        fullName: 'Иванов Иван',
        position: 'Маляр',
        hiredAt: '2026-01-01',
        signature: 'data:image/png;base64,AAA',
      });
      const second = await employees.create(orgId, {
        fullName: 'Петров Пётр',
        position: 'Сварщик',
        hiredAt: '2026-01-01',
      });
      await service.addEntry({
        journalId: journal.id,
        employeeId: first.id,
        data: { date: '2026-09-01', type: 'Вводный', signature: 'data:image/png;base64,AAA' },
      });
      await service.addEntry({
        journalId: journal.id,
        employeeId: second.id,
        data: { date: '2026-09-02', type: 'Первичный', signature: 'data:image/png;base64,BBB' },
      });

      const summaries = await service.listByOrg(orgId);

      expect(summaries).toHaveLength(1);
      expect(summaries[0]?.entryCount).toBe(2);
      expect(summaries[0]?.employeeCount).toBe(2);
      expect(summaries[0]?.template?.id).toBe(FIRE_TEMPLATE_ID);
    });

    it('закрывает журнал и скрывает удалённые', async () => {
      const journal = await createJournal();

      const closed = await service.close(journal.id);
      expect(closed.closedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      await service.remove(journal.id);
      expect(await service.listByOrg(orgId)).toHaveLength(0);
    });
  });

  describe('записи', async () => {
    it('дублирует ФИО и должность сотрудника в данные записи', async () => {
      const journal = await createJournal();
      const employee = await employees.create(orgId, {
        fullName: 'Иванов Иван',
        position: 'Маляр',
        hiredAt: '2026-01-01',
      });

      const entry = await service.addEntry({
        journalId: journal.id,
        employeeId: employee.id,
        data: { date: '2026-09-01', type: 'Вводный', signature: 'data:image/png;base64,AAA' },
      });

      expect(entry.data['employee']).toBe('Иванов Иван');
      expect(entry.data['position']).toBe('Маляр');
      expect(entry.syncStatus).toBe('pending');
      expect((await queue.list()).at(-1)?.entityType).toBe('entry');
    });

    it('подставляет эталонную подпись сотрудника', async () => {
      const journal = await createJournal();
      const employee = await employees.create(orgId, {
        fullName: 'Иванов Иван',
        position: 'Маляр',
        hiredAt: '2026-01-01',
        signature: 'data:image/png;base64,SIG',
      });

      const entry = await service.addEntry({
        journalId: journal.id,
        employeeId: employee.id,
        data: { date: '2026-09-01', type: 'Вводный' },
      });

      expect(entry.data['signature']).toBe('data:image/png;base64,SIG');
    });

    it('не сохраняет запись с пустыми обязательными полями', async () => {
      const journal = await createJournal();
      const employee = await employees.create(orgId, {
        fullName: 'Иванов Иван',
        position: 'Маляр',
        hiredAt: '2026-01-01',
      });

      await expect(
        service.addEntry({ journalId: journal.id, employeeId: employee.id, data: {} }),
      ).rejects.toThrow();
      expect(await db.entries.count()).toBe(0);
    });

    it('не сохраняет запись с неизвестными журналом и сотрудником', async () => {
      const employee = await employees.create(orgId, {
        fullName: 'Иванов Иван',
        position: 'Маляр',
        hiredAt: '2026-01-01',
      });

      await expect(
        service.addEntry({ journalId: 'нет', employeeId: employee.id, data: {} }),
      ).rejects.toThrow('Журнал не найден');
      await expect(
        service.addEntry({ journalId: 'нет', employeeId: 'нет', data: {} }),
      ).rejects.toThrow('Журнал не найден');
    });

    it('выдаёт записи журнала новыми сверху и скрывает удалённые', async () => {
      const journal = await createJournal();
      const employee = await employees.create(orgId, {
        fullName: 'Иванов Иван',
        position: 'Маляр',
        hiredAt: '2026-01-01',
      });
      const data = { date: '2026-09-01', type: 'Вводный', signature: 'sig' };
      const first = await service.addEntry({
        journalId: journal.id,
        employeeId: employee.id,
        data,
      });
      const second = await service.addEntry({
        journalId: journal.id,
        employeeId: employee.id,
        data: { ...data, date: '2026-09-02' },
      });

      expect((await service.listEntries(journal.id)).map((entry) => entry.id)).toEqual([
        second.id,
        first.id,
      ]);

      await service.removeEntry(first.id);
      const remaining = await service.listEntries(journal.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(second.id);
    });

    it('обновляет значения записи', async () => {
      const journal = await createJournal();
      const employee = await employees.create(orgId, {
        fullName: 'Иванов Иван',
        position: 'Маляр',
        hiredAt: '2026-01-01',
      });
      const entry = await service.addEntry({
        journalId: journal.id,
        employeeId: employee.id,
        data: { date: '2026-09-01', type: 'Вводный', signature: 'sig' },
      });

      const updated = await service.updateEntry(entry.id, {
        date: '2026-09-05',
        type: 'Повторный',
        signature: 'sig',
      });

      expect(updated.data['date']).toBe('2026-09-05');
      expect(updated.data['type']).toBe('Повторный');
    });
  });

  describe('валидация записи по шаблону', async () => {
    it('требует заполнить обязательные поля', async () => {
      const result = service.validateEntry(await template(FIRE_TEMPLATE_ID), {});

      expect(result.valid).toBe(false);
      expect(result.errors['date']).toContain('Дата');
      expect(result.errors['type']).toContain('Вид инструктажа');
      expect(result.errors['reason']).toBeUndefined();
    });

    it('проверяет дату, число и список', async () => {
      const fire = service.validateEntry(await template(FIRE_TEMPLATE_ID), {
        date: '01.09.2026',
        type: 'Вводный',
        signature: 'sig',
      });
      expect(fire.errors['date']).toBe('Некорректная дата');

      const wrongOption = service.validateEntry(await template(FIRE_TEMPLATE_ID), {
        date: '2026-09-01',
        type: 'Неизвестный',
        signature: 'sig',
      });
      expect(wrongOption.errors['type']).toBe('Выберите значение из списка');

      const vacation = service.validateEntry(await template(VACATION_TEMPLATE_ID), {
        employee: 'x',
        position: 'y',
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        days: 'десять',
        signature: 'sig',
      });
      expect(vacation.errors['days']).toBe('Введите число');
    });

    it('принимает корректные данные', async () => {
      const result = service.validateEntry(await template(VACATION_TEMPLATE_ID), {
        employee: 'Иванов Иван',
        position: 'Маляр',
        startDate: '2026-01-01',
        endDate: '2026-01-10',
        days: 10,
        signature: 'sig',
      });

      expect(result).toEqual({ valid: true, errors: {} });
    });
  });
});
