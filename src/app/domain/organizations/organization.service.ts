import { Injectable, inject } from '@angular/core';

import { AppDatabase } from '../../core/db/app-db';
import { seedSystemTemplates } from '../../core/db/seed';
import { DateService } from '../../core/date/date.service';
import type { FieldErrors } from '../validation.model';
import type { Organization, OrganizationDraft } from './organization.model';
import { OrganizationRepository } from './organization.repository';

const MIN_NAME_LENGTH = 2;

/** Бизнес-логика организации: валидация, онбординг, реквизиты (TZ 8.1). */
@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly repository = inject(OrganizationRepository);
  private readonly db = inject(AppDatabase);
  private readonly date = inject(DateService);

  /** Проверяет данные онбординга: поля не пустые, минимум 2 символа (TZ 8.1). */
  validate(draft: OrganizationDraft): FieldErrors {
    const errors: Record<string, string> = {};
    if (this.normalize(draft.name).length < MIN_NAME_LENGTH) {
      errors['name'] = 'Введите название организации';
    }
    if (this.normalize(draft.responsiblePerson).length < MIN_NAME_LENGTH) {
      errors['responsiblePerson'] = 'Укажите ответственного';
    }
    return errors;
  }

  /**
   * Создаёт организацию и загружает системные шаблоны журналов (TZ 8.1).
   * Данные сначала попадают в IndexedDB, затем в очередь синхронизации.
   */
  async create(draft: OrganizationDraft): Promise<Organization> {
    const errors = this.validate(draft);
    if (Object.keys(errors).length > 0) {
      throw new Error('Заполните обязательные поля организации');
    }
    const organization = await this.repository.create({
      name: this.normalize(draft.name),
      responsiblePerson: this.normalize(draft.responsiblePerson),
      inn: this.normalizeOptional(draft.inn),
      address: this.normalizeOptional(draft.address),
    });
    await seedSystemTemplates(this.db, this.date.nowTimestamp());
    return organization;
  }

  /** Текущая организация устройства либо `undefined`, если онбординг не пройден. */
  async getCurrent(): Promise<Organization | undefined> {
    return this.repository.getFirst();
  }

  /** Завершён ли онбординг (TZ 8.1). */
  async isInitialized(): Promise<boolean> {
    return (await this.getCurrent()) !== undefined;
  }

  /** Обновляет реквизиты организации. */
  async update(id: string, draft: OrganizationDraft): Promise<Organization> {
    const errors = this.validate(draft);
    if (Object.keys(errors).length > 0) {
      throw new Error('Заполните обязательные поля организации');
    }
    return this.repository.update(id, {
      name: this.normalize(draft.name),
      responsiblePerson: this.normalize(draft.responsiblePerson),
      inn: this.normalizeOptional(draft.inn),
      address: this.normalizeOptional(draft.address),
    });
  }

  private normalize(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeOptional(value: string | undefined): string | undefined {
    const normalized = value ? this.normalize(value) : '';
    return normalized.length > 0 ? normalized : undefined;
  }
}
