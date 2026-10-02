import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SupabaseClient, type User } from '@supabase/supabase-js';

import type { Organization } from '../../../domain/organizations/organization.model';
import { AuthService } from '../../auth/auth.service';
import { AppDatabase } from '../../db/app-db';
import { OnlineStatusService } from '../online-status.service';
import { SyncQueueService } from '../sync-queue.service';
import { SYNC_WATERMARK_PREFIX, SyncService } from '../sync.service';

interface MockState {
  upserts: { table: string; row: Record<string, unknown> }[];
  filters: { table: string; column: string; value: unknown }[];
  selectRows: Record<string, readonly Record<string, unknown>[]>;
  upsertError: string | null;
}

/**
 * Мок Supabase: `from().upsert()` пишет в журнал, `from().select().eq().gt()`
 * отдаёт настроенные строки и запоминает фильтры запроса.
 */
function createClientMock(): { state: MockState; client: unknown } {
  const state: MockState = { upserts: [], filters: [], selectRows: {}, upsertError: null };
  const client = {
    from(table: string) {
      const query = {
        eq: (column: string, value: unknown) => {
          state.filters.push({ table, column, value });
          return query;
        },
        gt: (column: string, value: unknown) => {
          state.filters.push({ table, column, value });
          return query;
        },
        then: (
          onFulfilled?: (value: { data: unknown; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) =>
          Promise.resolve({ data: state.selectRows[table] ?? [], error: null }).then(
            onFulfilled,
            onRejected,
          ),
      };
      return {
        select: () => query,
        upsert: async (row: Record<string, unknown>) => {
          if (state.upsertError !== null) {
            return { error: { message: state.upsertError } };
          }
          state.upserts.push({ table, row });
          return { error: null };
        },
      };
    },
  };
  return { state, client };
}

function makeUser(id = 'user-1'): User {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  };
}

function makeLocalOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'ООО Ромашка',
    inn: '7701234567',
    address: 'Москва, ул. Ленина, 1',
    responsiblePerson: 'Иванов Иван',
    createdAt: 1_000,
    updatedAt: 2_000,
    syncStatus: 'pending',
    ...overrides,
  };
}

function makeRemoteOrganizationRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'org-server',
    user_id: 'user-1',
    name: 'Серверная',
    inn: null,
    address: null,
    responsible_person: 'Петров Пётр',
    created_at: 100,
    updated_at: 777,
    deleted_at: null,
    ...overrides,
  };
}

function clearWatermarks(): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(SYNC_WATERMARK_PREFIX) === true) {
      localStorage.removeItem(key);
    }
  }
}

describe('SyncService', () => {
  let clientMock: ReturnType<typeof createClientMock>;
  let auth: { currentUser: ReturnType<typeof signal<User | null>> };
  let online: { isOnline: ReturnType<typeof signal<boolean>> };
  let service: SyncService;
  let queue: SyncQueueService;
  let db: AppDatabase;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    clientMock = createClientMock();
    auth = { currentUser: signal<User | null>(makeUser()) };
    online = { isOnline: signal(false) };
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseClient, useValue: clientMock.client },
        { provide: AuthService, useValue: auth },
        { provide: OnlineStatusService, useValue: online },
      ],
    });
    service = TestBed.inject(SyncService);
    queue = TestBed.inject(SyncQueueService);
    db = TestBed.inject(AppDatabase);
    await db.open();
    await db.syncQueue.clear();
    await db.organizations.clear();
    await db.employees.clear();
    await db.templates.clear();
    await db.journals.clear();
    await db.entries.clear();
    await queue.refreshSize();
    clearWatermarks();
  });

  describe('гарды', () => {
    it('syncAll сообщает об отсутствии сети', async () => {
      await expect(service.syncAll()).rejects.toThrow('Нет подключения к интернету');
    });

    it('syncAll сообщает об отсутствии сессии Supabase', async () => {
      auth.currentUser.set(null);

      await expect(service.syncAll()).rejects.toThrow('Нет активной сессии Supabase');
    });

    it('flush требует сессию Supabase', async () => {
      auth.currentUser.set(null);

      await expect(service.flush()).rejects.toThrow('Нет активной сессии Supabase');
    });

    it('pullChanges требует сессию Supabase', async () => {
      auth.currentUser.set(null);

      await expect(service.pullChanges(0)).rejects.toThrow('Нет активной сессии Supabase');
    });
  });

  it('enqueue добавляет операцию в очередь', async () => {
    await service.enqueue({
      entityType: 'organization',
      entityId: 'org-1',
      action: 'update',
      payload: makeLocalOrganization(),
    });

    const items = await queue.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.entityId).toBe('org-1');
    expect(items[0]?.retries).toBe(0);
    expect(queue.size()).toBe(1);
  });

  it('flush отправляет очередь и помечает сущность синхронизированной', async () => {
    const organization = makeLocalOrganization();
    await db.organizations.put(organization);
    await service.enqueue({
      entityType: 'organization',
      entityId: 'org-1',
      action: 'update',
      payload: organization,
    });

    await service.flush();

    expect(clientMock.state.upserts).toHaveLength(1);
    expect(clientMock.state.upserts[0]?.table).toBe('organizations');
    expect(clientMock.state.upserts[0]?.row).toMatchObject({
      id: 'org-1',
      user_id: 'user-1',
      name: 'ООО Ромашка',
      responsible_person: 'Иванов Иван',
      updated_at: 2_000,
    });
    expect(await queue.list()).toHaveLength(0);
    expect((await db.organizations.get('org-1'))?.syncStatus).toBe('synced');
  });

  it('flush при неудаче увеличивает попытки и оставляет операцию в очереди', async () => {
    clientMock.state.upsertError = 'network down';
    const organization = makeLocalOrganization();
    await db.organizations.put(organization);
    await service.enqueue({
      entityType: 'organization',
      entityId: 'org-1',
      action: 'update',
      payload: organization,
    });

    await expect(service.flush()).rejects.toThrow('network down');

    const items = await queue.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.retries).toBe(1);
    expect(items[0]?.lastError).toBe('network down');
    expect((await db.organizations.get('org-1'))?.syncStatus).toBe('pending');
  });

  it('после исчерпания попыток операция уходит в конфликт', async () => {
    clientMock.state.upsertError = 'boom';
    const organization = makeLocalOrganization();
    await db.organizations.put(organization);
    await service.enqueue({
      entityType: 'organization',
      entityId: 'org-1',
      action: 'update',
      payload: organization,
    });
    const [item] = await queue.list();
    await db.syncQueue.update(item?.id ?? 0, { retries: 4 });

    await expect(service.flush()).rejects.toThrow('boom');

    expect(await queue.list()).toHaveLength(0);
    expect((await db.organizations.get('org-1'))?.syncStatus).toBe('conflict');
  });

  it('pullChanges принимает серверные строки и фильтрует по user_id и updated_at', async () => {
    clientMock.state.selectRows['organizations'] = [makeRemoteOrganizationRow()];

    await service.pullChanges(0);

    const stored = await db.organizations.get('org-server');
    expect(stored?.name).toBe('Серверная');
    expect(stored?.responsiblePerson).toBe('Петров Пётр');
    expect(stored?.syncStatus).toBe('synced');
    expect(stored?.updatedAt).toBe(777);
    expect(clientMock.state.filters).toContainEqual({
      table: 'organizations',
      column: 'user_id',
      value: 'user-1',
    });
    expect(clientMock.state.filters).toContainEqual({
      table: 'organizations',
      column: 'updated_at',
      value: 0,
    });
  });

  it('pullChanges не затирает более свежие локальные изменения', async () => {
    await db.organizations.put(
      makeLocalOrganization({ id: 'org-1', name: 'Локально', updatedAt: 500 }),
    );
    clientMock.state.selectRows['organizations'] = [
      makeRemoteOrganizationRow({ id: 'org-1', name: 'Сервер', updated_at: 100 }),
    ];

    await service.pullChanges(0);

    const stored = await db.organizations.get('org-1');
    expect(stored?.name).toBe('Локально');
    expect(stored?.syncStatus).toBe('pending');
  });

  it('syncAll выполняет полный цикл и пишет водяной знак', async () => {
    const organization = makeLocalOrganization();
    await db.organizations.put(organization);
    await service.enqueue({
      entityType: 'organization',
      entityId: 'org-1',
      action: 'update',
      payload: organization,
    });
    clientMock.state.selectRows['organizations'] = [makeRemoteOrganizationRow()];

    online.isOnline.set(true);
    await service.syncAll();

    expect(await queue.list()).toHaveLength(0);
    expect((await db.organizations.get('org-1'))?.syncStatus).toBe('synced');
    expect(service.lastSyncAt()).toBe(777);
    expect(localStorage.getItem(SYNC_WATERMARK_PREFIX + 'user-1')).toBe('777');
  });

  describe('resolveConflict', () => {
    it('побеждает запись с более поздним updatedAt', async () => {
      const winner = await service.resolveConflict(
        { id: 'a', updatedAt: 1 },
        { id: 'a', updatedAt: 2 },
      );

      expect(winner).toEqual({ id: 'a', updatedAt: 2 });
    });

    it('без локальной версии отдаёт серверную', async () => {
      const remote = { id: 'a', updatedAt: 2 };

      await expect(service.resolveConflict(null, remote)).resolves.toEqual(remote);
    });

    it('отклоняет некорректные данные конфликта', async () => {
      await expect(service.resolveConflict({}, { id: 'a', updatedAt: 1 })).rejects.toThrow(
        'Некорректные данные конфликта',
      );
      await expect(service.resolveConflict({ id: 'a', updatedAt: 1 }, { id: 'a' })).rejects.toThrow(
        'Некорректные данные конфликта',
      );
    });
  });
});

describe('SyncService без настроенного Supabase', () => {
  let service: SyncService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseClient, useValue: null },
        {
          provide: AuthService,
          useValue: { currentUser: signal<User | null>(makeUser()) },
        },
        { provide: OnlineStatusService, useValue: { isOnline: signal(true) } },
      ],
    });
    service = TestBed.inject(SyncService);
  });

  it('syncAll сообщает, что ключи не заполнены', async () => {
    await expect(service.syncAll()).rejects.toThrow('Supabase не настроен');
  });

  it('flush сообщает, что ключи не заполнены', async () => {
    await expect(service.flush()).rejects.toThrow('Supabase не настроен');
  });
});
