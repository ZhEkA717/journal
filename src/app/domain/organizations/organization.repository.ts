import { Injectable } from '@angular/core';

import { SyncableRepository } from '../../core/db/syncable.repository';
import { uuid } from '../../shared/utils/uuid';
import type { Organization, OrganizationDraft } from './organization.model';

/** CRUD организации без бизнес-логики (TZ 3, 4). */
@Injectable({ providedIn: 'root' })
export class OrganizationRepository extends SyncableRepository<Organization> {
  protected readonly table = this.db.organizations;
  protected readonly entityType = 'organization' as const;

  /** Все организации устройства, кроме удалённых. */
  async list(): Promise<Organization[]> {
    return this.listActive();
  }

  /** Организация по идентификатору. */
  async getById(id: string): Promise<Organization | undefined> {
    return this.findById(id);
  }

  /** Первая доступная организация — на устройстве она одна (TZ 8.1). */
  async getFirst(): Promise<Organization | undefined> {
    return (await this.list())[0];
  }

  /** Создаёт организацию и ставит операцию в очередь синхронизации. */
  async create(draft: OrganizationDraft): Promise<Organization> {
    return this.insert({ id: uuid(), ...draft });
  }

  /** Обновляет реквизиты организации. */
  async update(id: string, draft: OrganizationDraft): Promise<Organization> {
    return this.updateExisting(id, { ...draft });
  }

  /** Помечает организацию удалённой. */
  async remove(id: string): Promise<Organization> {
    return this.softDelete(id);
  }
}
