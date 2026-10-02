import { Injectable, inject } from '@angular/core';

import { AppDatabase } from '../../core/db/app-db';
import { seedSystemTemplates } from '../../core/db/seed';
import { DateService } from '../../core/date/date.service';
import { SyncQueueService } from '../../core/sync/sync-queue.service';
import { SYSTEM_TEMPLATES } from '../templates/system-templates';
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
  private readonly queue = inject(SyncQueueService);

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
    const created = await seedSystemTemplates(this.db, this.date.nowTimestamp());
    // Сид пишет в Dexie напрямую, поэтому сами шаблоны ставим в очередь здесь:
    // без этого на втором устройстве не придут шаблоны и журналы окажутся без
    // колонок (ТЗ 14: синхронизация при смене устройства).
    if (created > 0) {
      for (const { id } of SYSTEM_TEMPLATES) {
        const template = await this.db.templates.get(id);
        if (template) {
          await this.queue.enqueue({
            entityType: 'template',
            entityId: id,
            action: 'create',
            payload: template,
          });
        }
      }
    }
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
