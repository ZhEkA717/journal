import { SYSTEM_TEMPLATES } from '../../domain/templates/system-templates';
import type { JournalTemplate } from '../../domain/journals/journal-template.model';
import type { AppDatabase } from './app-db';

/**
 * Первичное наполнение БД системными шаблонами (TZ 6, 7).
 * Идемпотентна: уже существующие системные шаблоны не перезаписываются,
 * чтобы не терять `createdAt` и привязки к созданным журналам.
 *
 * @param db локальная БД
 * @param timestamp время создания записей (Unix ms)
 * @returns количество добавленных шаблонов
 */
export async function seedSystemTemplates(db: AppDatabase, timestamp: number): Promise<number> {
  let created = 0;
  await db.transaction('rw', db.templates, async () => {
    for (const template of SYSTEM_TEMPLATES) {
      const existing: JournalTemplate | undefined = await db.templates.get(template.id);
      if (existing) {
        continue;
      }
      await db.templates.add({ ...template, createdAt: timestamp, updatedAt: timestamp });
      created++;
    }
  });
  return created;
}
