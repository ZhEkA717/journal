import { Injectable, inject } from '@angular/core';

import { DateService } from '../../core/date/date.service';
import { EmployeeService } from '../employees/employee.service';
import type { Employee } from '../employees/employee.model';
import type { FieldErrors } from '../validation.model';
import type { EntryData, JournalEntry, JournalEntryDraft } from './journal-entry.model';
import { JournalEntryRepository } from './journal-entry.repository';
import type { ColumnDef, JournalTemplate } from './journal-template.model';
import { JournalTemplateRepository } from './journal-template.repository';
import type { Journal, JournalDraft, JournalSummary } from './journal.model';
import { JournalRepository } from './journal.repository';

/** Результат проверки данных записи по шаблону (TZ 8.5). */
export interface EntryValidationResult {
  readonly valid: boolean;
  readonly errors: FieldErrors;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_TITLE_LENGTH = 2;

/** Бизнес-логика журналов и записей: сводки, валидация, составление данных (TZ 8.3-8.5). */
@Injectable({ providedIn: 'root' })
export class JournalService {
  private readonly journals = inject(JournalRepository);
  private readonly entries = inject(JournalEntryRepository);
  private readonly templates = inject(JournalTemplateRepository);
  private readonly employees = inject(EmployeeService);
  private readonly date = inject(DateService);

  /** Шаблоны для экрана создания журнала. */
  async listTemplates(orgId?: string): Promise<JournalTemplate[]> {
    return this.templates.list(orgId);
  }

  /** Шаблон по идентификатору. */
  async getTemplate(id: string): Promise<JournalTemplate | undefined> {
    return this.templates.getById(id);
  }

  /** Журналы организации со сводками для карточек списка (TZ 8.2). */
  async listByOrg(orgId: string): Promise<JournalSummary[]> {
    const journals = await this.journals.listByOrg(orgId);
    return Promise.all(journals.map((journal) => this.buildSummary(journal)));
  }

  /** Журнал со сводкой. */
  async getSummary(journalId: string): Promise<JournalSummary | undefined> {
    const journal = await this.journals.getById(journalId);
    return journal ? this.buildSummary(journal) : undefined;
  }

  /** Проверяет форму создания журнала. */
  validate(draft: JournalDraft): FieldErrors {
    const errors: Record<string, string> = {};
    if (draft.templateId.length === 0) {
      errors['templateId'] = 'Выберите тип журнала';
    }
    if (this.normalize(draft.title).length < MIN_TITLE_LENGTH) {
      errors['title'] = 'Введите название журнала';
    }
    if (this.normalize(draft.responsiblePerson).length < 2) {
      errors['responsiblePerson'] = 'Укажите ответственного';
    }
    if (!ISO_DATE.test(draft.startedAt)) {
      errors['startedAt'] = 'Укажите дату начала';
    }
    return errors;
  }

  /** Создаёт журнал: данные сначала в IndexedDB, затем в очередь синхронизации (TZ 8.3). */
  async create(orgId: string, draft: JournalDraft): Promise<Journal> {
    const template = draft.templateId ? await this.templates.getById(draft.templateId) : undefined;
    if (!template) {
      throw new Error('Шаблон журнала не найден');
    }
    const normalized: JournalDraft = {
      templateId: draft.templateId,
      title: this.normalize(draft.title) || template.name,
      responsiblePerson: this.normalize(draft.responsiblePerson),
      startedAt: draft.startedAt || this.date.today(),
    };
    this.assertValid(this.validate(normalized));
    return this.journals.create(orgId, normalized);
  }

  /** Обновляет название и ответственного за журнал. */
  async update(id: string, draft: JournalDraft): Promise<Journal> {
    this.assertValid(this.validate(draft));
    return this.journals.update(id, {
      ...draft,
      title: this.normalize(draft.title),
      responsiblePerson: this.normalize(draft.responsiblePerson),
    });
  }

  /** Закрывает журнал текущей датой. */
  async close(id: string): Promise<Journal> {
    return this.journals.close(id, this.date.today());
  }

  /** Помечает журнал удалённым. */
  async remove(id: string): Promise<Journal> {
    return this.journals.remove(id);
  }

  /** Записи журнала, новые сверху (TZ 8.4). */
  async listEntries(journalId: string): Promise<JournalEntry[]> {
    return this.entries.listByJournal(journalId);
  }

  /** Проверяет значения записи по колонкам шаблона (TZ 8.5). */
  validateEntry(template: JournalTemplate, data: EntryData): EntryValidationResult {
    const errors: Record<string, string> = {};
    for (const column of template.columns) {
      const value = data[column.key];
      if (column.required && this.isEmpty(value)) {
        errors[column.key] = `Заполните «${column.label}»`;
        continue;
      }
      if (this.isEmpty(value)) {
        continue;
      }
      const typeError = this.validateColumnType(column, value);
      if (typeError) {
        errors[column.key] = typeError;
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Добавляет запись: ФИО и должность сотрудника дублируются в данные,
   * если такие колонки есть в шаблоне — они нужны для печатной формы (TZ 8.5, 9.3).
   */
  async addEntry(draft: JournalEntryDraft): Promise<JournalEntry> {
    const data = await this.prepareEntryData(draft.journalId, draft.employeeId, draft.data);
    return this.entries.create({
      journalId: draft.journalId,
      employeeId: draft.employeeId,
      data,
    });
  }

  /** Обновляет значения полей записи. */
  async updateEntry(entryId: string, data: EntryData): Promise<JournalEntry> {
    const entry = await this.entries.getById(entryId);
    if (!entry) {
      throw new Error('Запись не найдена');
    }
    const composed = await this.prepareEntryData(entry.journalId, entry.employeeId, data);
    return this.entries.update(entryId, composed);
  }

  /** Помечает запись удалённой. */
  async removeEntry(entryId: string): Promise<JournalEntry> {
    return this.entries.remove(entryId);
  }

  private async buildSummary(journal: Journal): Promise<JournalSummary> {
    const [template, entries] = await Promise.all([
      this.templates.getById(journal.templateId),
      this.entries.listByJournal(journal.id),
    ]);
    return {
      journal,
      template,
      entryCount: entries.length,
      employeeCount: new Set(entries.map((entry) => entry.employeeId)).size,
    };
  }

  private async prepareEntryData(
    journalId: string,
    employeeId: string,
    data: EntryData,
  ): Promise<EntryData> {
    const journal = await this.journals.getById(journalId);
    if (!journal) {
      throw new Error('Журнал не найден');
    }
    const template = await this.templates.getById(journal.templateId);
    if (!template) {
      throw new Error('Шаблон журнала не найден');
    }
    const employee = await this.employees.getById(employeeId);
    if (!employee) {
      throw new Error('Сотрудник не найден');
    }
    const composed = this.composeData(template, employee, data);
    const validation = this.validateEntry(template, composed);
    if (!validation.valid) {
      throw new Error(Object.values(validation.errors).join('. '));
    }
    return composed;
  }

  private composeData(
    template: JournalTemplate,
    employee: Pick<Employee, 'fullName' | 'position' | 'signature'>,
    data: EntryData,
  ): EntryData {
    const keys = new Set(template.columns.map((column) => column.key));
    const composed: Record<string, string | number | null> = { ...data };
    if (keys.has('employee')) {
      composed['employee'] = employee.fullName;
    }
    if (keys.has('position')) {
      composed['position'] = employee.position;
    }
    if (!composed['signature'] && employee.signature) {
      composed['signature'] = employee.signature;
    }
    return composed;
  }

  private validateColumnType(column: ColumnDef, value: string | number | null): string | null {
    switch (column.type) {
      case 'date':
        return ISO_DATE.test(String(value)) ? null : 'Некорректная дата';
      case 'number':
        return typeof value === 'number' && Number.isFinite(value) ? null : 'Введите число';
      case 'select': {
        const options = column.options ?? [];
        return options.length === 0 || options.includes(String(value))
          ? null
          : 'Выберите значение из списка';
      }
      case 'text':
      case 'signature':
        return null;
    }
  }

  private isEmpty(value: string | number | null | undefined): boolean {
    return value === undefined || value === null || String(value).trim().length === 0;
  }

  private assertValid(errors: FieldErrors): void {
    if (Object.keys(errors).length > 0) {
      throw new Error('Заполните обязательные поля');
    }
  }

  private normalize(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
