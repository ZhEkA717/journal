import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../../db/app-db';
import { SyncQueueService } from '../sync-queue.service';

describe('SyncQueueService', () => {
  let service: SyncQueueService;
  let db: AppDatabase;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SyncQueueService);
    db = TestBed.inject(AppDatabase);
    await db.open();
    await db.syncQueue.clear();
    await service.refreshSize();
  });

  it('кладёт операцию в очередь со счётчиком и временем', async () => {
    await service.enqueue({ entityType: 'journal', entityId: 'j1', action: 'create', payload: {} });

    const items = await service.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.retries).toBe(0);
    expect(items[0]?.entityId).toBe('j1');
    expect(service.size()).toBe(1);
  });

  it('отдаёт операции в порядке добавления', async () => {
    await service.enqueue({
      entityType: 'journal',
      entityId: 'first',
      action: 'create',
      payload: 1,
    });
    await service.enqueue({
      entityType: 'journal',
      entityId: 'second',
      action: 'update',
      payload: 2,
    });

    expect((await service.list()).map((item) => item.entityId)).toEqual(['first', 'second']);
  });

  it('take ограничивает размер пачки', async () => {
    await service.enqueue({ entityType: 'journal', entityId: 'a', action: 'create', payload: 1 });
    await service.enqueue({ entityType: 'journal', entityId: 'b', action: 'create', payload: 2 });
    await service.enqueue({ entityType: 'journal', entityId: 'c', action: 'create', payload: 3 });

    expect(await service.take(2)).toHaveLength(2);
  });

  it('markFailed увеличивает число попыток и пишет ошибку', async () => {
    await service.enqueue({ entityType: 'entry', entityId: 'e1', action: 'create', payload: {} });
    const [item] = await service.list();

    await service.markFailed(item?.id ?? 0, 'network down');

    const [updated] = await service.list();
    expect(updated?.retries).toBe(1);
    expect(updated?.lastError).toBe('network down');
  });

  it('markFailed игнорирует неизвестную операцию', async () => {
    await expect(service.markFailed(999, 'boom')).resolves.toBeUndefined();
  });

  it('remove чистит отправленные операции', async () => {
    await service.enqueue({ entityType: 'journal', entityId: 'a', action: 'create', payload: 1 });
    await service.enqueue({ entityType: 'journal', entityId: 'b', action: 'create', payload: 2 });
    const items = await service.list();

    await service.remove([items[0]?.id ?? 0]);

    expect(service.size()).toBe(1);
    expect((await service.list())[0]?.entityId).toBe('b');
  });

  it('clear очищает очередь полностью', async () => {
    await service.enqueue({ entityType: 'journal', entityId: 'a', action: 'create', payload: 1 });

    await service.clear();

    expect(service.size()).toBe(0);
  });
});
