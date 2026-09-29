import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../core/db/app-db';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  let store: InstanceType<typeof SessionStore>;
  let db: AppDatabase;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(SessionStore);
    db = TestBed.inject(AppDatabase);
    await db.open();
    await db.organizations.clear();
    await db.templates.clear();
    await db.syncQueue.clear();
    store.reset();
  });

  it('пуст до первого запуска', () => {
    expect(store.organization()).toBeUndefined();
    expect(store.organizationId()).toBeUndefined();
    expect(store.isInitialized()).toBe(false);
  });

  it('читает организацию из IndexedDB', async () => {
    await store.setup({ name: 'ООО Ромашка', responsiblePerson: 'Иванова Мария' });

    store.reset();
    await store.load();

    expect(store.organization()?.name).toBe('ООО Ромашка');
    expect(store.organizationId()).toBe(store.organization()?.id);
    expect(store.isInitialized()).toBe(true);
    expect(store.isReady()).toBe(true);
  });

  it('остаётся неинициализированным без организации', async () => {
    await store.load();

    expect(store.isInitialized()).toBe(false);
    expect(store.isReady()).toBe(true);
  });

  it('создаёт системные шаблоны при первом запуске', async () => {
    await store.setup({ name: 'ООО Ромашка', responsiblePerson: 'Иванова Мария' });

    expect(await db.templates.count()).toBe(3);
  });

  it('обновляет реквизиты организации', async () => {
    const created = await store.setup({
      name: 'ООО Ромашка',
      responsiblePerson: 'Иванова Мария',
    });

    const updated = await store.update({ name: 'АО Ромашка', responsiblePerson: 'Петров Пётр' });

    expect(updated.id).toBe(created.id);
    expect(store.organization()?.name).toBe('АО Ромашка');
  });

  it('не обновляет реквизиты без организации', async () => {
    await expect(
      store.update({ name: 'АО Ромашка', responsiblePerson: 'Петров Пётр' }),
    ).rejects.toThrow('Организация не создана');
  });

  it('валидирует реквизиты', () => {
    expect(store.validate({ name: '', responsiblePerson: '' })).toEqual({
      name: expect.any(String),
      responsiblePerson: expect.any(String),
    });
    expect(store.validate({ name: 'ООО Ромашка', responsiblePerson: 'Иванова Мария' })).toEqual({});
  });
});
