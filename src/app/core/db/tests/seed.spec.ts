import { TestBed } from '@angular/core/testing';

import { AppDatabase } from '../app-db';
import { seedSystemTemplates } from '../seed';

describe('seedSystemTemplates', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    db = TestBed.inject(AppDatabase);
    await db.open();
    await db.templates.clear();
  });

  afterEach(async () => {
    await db.templates.clear();
  });

  it('загружает три системных шаблона', async () => {
    const created = await seedSystemTemplates(db, 1000);
    expect(created).toBe(3);

    const templates = await db.templates.toArray();
    expect(templates.map((template) => template.id).sort()).toEqual([
      'sys-fire-safety',
      'sys-labor-safety',
      'sys-vacation',
    ]);
    expect(templates.every((template) => template.isSystem)).toBe(true);
  });

  it('проставляет время создания', async () => {
    await seedSystemTemplates(db, 1234);
    const template = await db.templates.get('sys-vacation');
    expect(template?.createdAt).toBe(1234);
    expect(template?.updatedAt).toBe(1234);
  });

  it('идемпотентна: повторный вызов не дублирует шаблоны', async () => {
    await seedSystemTemplates(db, 1000);
    const created = await seedSystemTemplates(db, 2000);
    expect(created).toBe(0);
    expect(await db.templates.count()).toBe(3);
    expect((await db.templates.get('sys-vacation'))?.createdAt).toBe(1000);
  });

  it('содержит колонки из ТЗ для журнала пожарной безопасности', async () => {
    await seedSystemTemplates(db, 1000);
    const template = await db.templates.get('sys-fire-safety');
    expect(template?.legalRef).toContain('806');
    expect(template?.columns.map((column) => column.key)).toEqual([
      'date',
      'employee',
      'position',
      'type',
      'reason',
      'signature',
    ]);
  });
});
