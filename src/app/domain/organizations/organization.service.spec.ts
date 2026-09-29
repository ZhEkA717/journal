import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../../core/db/app-db';
import { SyncQueueService } from '../../core/sync/sync-queue.service';
import { OrganizationService } from './organization.service';

const VALID_DRAFT = {
  name: '  ООО   Ромашка  ',
  responsiblePerson: 'Иванова Мария',
};

describe('OrganizationService', () => {
  let service: OrganizationService;
  let db: AppDatabase;
  let queue: SyncQueueService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrganizationService);
    db = TestBed.inject(AppDatabase);
    queue = TestBed.inject(SyncQueueService);
    await db.open();
    await db.organizations.clear();
    await db.templates.clear();
    await db.syncQueue.clear();
    await queue.refreshSize();
  });

  it('требует название и ответственного', () => {
    const errors = service.validate({ name: 'Я', responsiblePerson: '' });
    expect(errors['name']).toBeDefined();
    expect(errors['responsiblePerson']).toBeDefined();
  });

  it('не создаёт организацию с некорректными данными', async () => {
    await expect(service.create({ name: '', responsiblePerson: '' })).rejects.toThrow();
    expect(await db.organizations.count()).toBe(0);
  });

  it('создаёт организацию, нормализует пробелы и ставит в очередь синхронизации', async () => {
    const organization = await service.create(VALID_DRAFT);

    expect(organization.name).toBe('ООО Ромашка');
    expect(organization.syncStatus).toBe('pending');
    expect(organization.createdAt).toBeGreaterThan(0);
    expect(await db.organizations.get(organization.id)).toBeTruthy();

    const queueItems = await queue.list();
    expect(queueItems).toHaveLength(1);
    expect(queueItems[0]?.entityType).toBe('organization');
    expect(queueItems[0]?.action).toBe('create');
  });

  it('загружает системные шаблоны при создании', async () => {
    await service.create(VALID_DRAFT);
    expect(await db.templates.count()).toBe(3);
  });

  it('isInitialized отражает наличие организации', async () => {
    expect(await service.isInitialized()).toBe(false);
    await service.create(VALID_DRAFT);
    expect(await service.isInitialized()).toBe(true);
    expect((await service.getCurrent())?.name).toBe('ООО Ромашка');
  });

  it('обновляет реквизиты и помечает запись как ожидающую синхронизации', async () => {
    const organization = await service.create(VALID_DRAFT);
    await db.organizations.update(organization.id, { syncStatus: 'synced' });

    const updated = await service.update(organization.id, {
      name: 'ИП Петров',
      responsiblePerson: 'Петров Сергей',
      inn: ' 7701234567 ',
    });

    expect(updated.name).toBe('ИП Петров');
    expect(updated.inn).toBe('7701234567');
    expect(updated.syncStatus).toBe('pending');
    expect((await queue.list()).at(-1)?.action).toBe('update');
  });
});
