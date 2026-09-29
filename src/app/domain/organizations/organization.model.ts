import type { SyncableEntity } from '../../core/models/base.model';

/** Организация — владелец всех журналов и сотрудников (TZ 5.2). */
export interface Organization extends SyncableEntity {
  readonly id: string;
  readonly name: string;
  readonly inn?: string;
  readonly address?: string;
  readonly responsiblePerson: string;
}

/** Поля, которые пользователь вводит при создании/редактировании. */
export interface OrganizationDraft {
  readonly name: string;
  readonly responsiblePerson: string;
  readonly inn?: string;
  readonly address?: string;
}
