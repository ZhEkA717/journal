import type { SyncableEntity } from '../../core/models/base.model';

/** Сотрудник организации (TZ 5.2). */
export interface Employee extends SyncableEntity {
  readonly id: string;
  readonly orgId: string;
  readonly fullName: string;
  readonly position: string;
  readonly birthDate?: string;
  readonly hiredAt: string;
  readonly firedAt?: string;
  readonly signature?: string;
}

/** Поля формы сотрудника (TZ 8.6). Дата приёма по умолчанию — сегодня. */
export interface EmployeeDraft {
  readonly fullName: string;
  readonly position: string;
  readonly hiredAt?: string;
  readonly birthDate?: string;
  readonly signature?: string;
}

/** Данные, готовые к записи: сервис гарантирует заполненную дату приёма. */
export type EmployeeSave = EmployeeDraft & { readonly hiredAt: string };
