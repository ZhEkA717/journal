import { Injectable, inject } from '@angular/core';

import { DateService } from '../../core/date/date.service';
import type { FieldErrors } from '../validation.model';
import { JournalEntryRepository } from '../journals/journal-entry.repository';
import type { Employee, EmployeeDraft, EmployeeSave } from './employee.model';
import { EmployeeRepository } from './employee.repository';

const MIN_NAME_LENGTH = 2;

/** Бизнес-логика сотрудников: валидация, поиск, статистика (TZ 8.6). */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly repository = inject(EmployeeRepository);
  private readonly entries = inject(JournalEntryRepository);
  private readonly date = inject(DateService);

  /** Сотрудники организации. */
  async listByOrg(orgId: string): Promise<Employee[]> {
    return this.repository.listByOrg(orgId);
  }

  /** Поиск по ФИО и должности (TZ 14: поиск сотрудников). */
  async search(orgId: string, query: string): Promise<Employee[]> {
    const employees = await this.repository.listByOrg(orgId);
    const needle = this.normalize(query).toLocaleLowerCase('ru');
    if (needle.length === 0) {
      return employees;
    }
    return employees.filter((employee) => {
      const haystack = `${employee.fullName} ${employee.position}`.toLocaleLowerCase('ru');
      return haystack.includes(needle);
    });
  }

  /** Сотрудник по идентификатору. */
  async getById(id: string): Promise<Employee | undefined> {
    return this.repository.getById(id);
  }

  /** Проверяет карточку сотрудника. */
  validate(draft: EmployeeDraft): FieldErrors {
    const errors: Record<string, string> = {};
    if (this.normalize(draft.fullName).length < MIN_NAME_LENGTH) {
      errors['fullName'] = 'Введите ФИО';
    }
    if (this.normalize(draft.position).length === 0) {
      errors['position'] = 'Укажите должность';
    }
    if (this.normalize(draft.hiredAt ?? '').length === 0) {
      errors['hiredAt'] = 'Укажите дату приёма';
    }
    return errors;
  }

  /** Создаёт сотрудника; дата приёма по умолчанию — сегодня (TZ 8.6). */
  async create(orgId: string, draft: EmployeeDraft): Promise<Employee> {
    const normalized = this.normalizeDraft(draft);
    this.assertValid(this.validate(normalized));
    return this.repository.create(orgId, normalized);
  }

  /** Обновляет карточку сотрудника. */
  async update(id: string, draft: EmployeeDraft): Promise<Employee> {
    const normalized = this.normalizeDraft(draft);
    this.assertValid(this.validate(normalized));
    return this.repository.update(id, normalized);
  }

  /** Сохраняет эталонную подпись сотрудника (base64 PNG). */
  async saveSignature(id: string, signature: string): Promise<Employee> {
    return this.repository.setSignature(id, signature);
  }

  /** Помечает сотрудника уволенным. */
  async fire(id: string): Promise<Employee> {
    return this.repository.markFired(id, this.date.today());
  }

  /** Возвращает уволенного сотрудника в штат (ТЗ 8.6). */
  async restore(id: string): Promise<Employee> {
    return this.repository.restore(id);
  }

  /** Помечает сотрудника удалённым. */
  async remove(id: string): Promise<Employee> {
    return this.repository.remove(id);
  }

  /** Сколько раз сотрудник проинструктирован (TZ 8.6). */
  async instructionCount(id: string): Promise<number> {
    return this.entries.countByEmployee(id);
  }

  private normalizeDraft(draft: EmployeeDraft): EmployeeSave {
    return {
      fullName: this.normalize(draft.fullName),
      position: this.normalize(draft.position),
      hiredAt: draft.hiredAt || this.date.today(),
      birthDate: this.normalizeOptional(draft.birthDate),
      signature: this.normalizeOptional(draft.signature),
    };
  }

  private assertValid(errors: FieldErrors): void {
    if (Object.keys(errors).length > 0) {
      throw new Error('Заполните обязательные поля сотрудника');
    }
  }

  private normalize(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeOptional(value: string | undefined): string | undefined {
    const normalized = value ? this.normalize(value) : '';
    return normalized.length > 0 ? normalized : undefined;
  }
}
