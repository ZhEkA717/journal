import { Injectable, inject } from '@angular/core';

import { AppDatabase } from '../../core/db/app-db';
import { uuid } from '../../shared/utils/uuid';
import type { ColumnDef, JournalCategory, JournalTemplate } from './journal-template.model';

/** Доступ к шаблонам журналов: системные (TZ 7) и пользовательские. */
@Injectable({ providedIn: 'root' })
export class JournalTemplateRepository {
  private readonly db = inject(AppDatabase);

  /** Все шаблоны: системные и собственные организации. */
  async list(orgId?: string): Promise<JournalTemplate[]> {
    const all = await this.db.templates.toArray();
    return all.filter((template) => !template.orgId || template.orgId === orgId);
  }

  /** Шаблон по идентификатору. */
  async getById(id: string): Promise<JournalTemplate | undefined> {
    return this.db.templates.get(id);
  }

  /** Шаблоны одной категории. */
  async listByCategory(category: JournalCategory, orgId?: string): Promise<JournalTemplate[]> {
    const all = await this.list(orgId);
    return all.filter((template) => template.category === category);
  }

  /** Сохраняет собственный шаблон организации. */
  async create(
    orgId: string,
    draft: {
      readonly name: string;
      readonly category: JournalCategory;
      readonly columns: readonly ColumnDef[];
      readonly iconName: string;
      readonly color: string;
      readonly legalRef?: string;
    },
    timestamp: number,
  ): Promise<JournalTemplate> {
    const template: JournalTemplate = {
      id: uuid(),
      orgId,
      name: draft.name,
      category: draft.category,
      columns: draft.columns,
      iconName: draft.iconName,
      color: draft.color,
      legalRef: draft.legalRef,
      isSystem: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.templates.put(template);
    return template;
  }
}
