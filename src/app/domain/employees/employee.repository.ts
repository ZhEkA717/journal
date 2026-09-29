import { Injectable } from '@angular/core';

import { SyncableRepository } from '../../core/db/syncable.repository';
import { uuid } from '../../shared/utils/uuid';
import type { Employee, EmployeeSave } from './employee.model';

/** CRUD сотрудников без бизнес-логики (TZ 3, 4). */
@Injectable({ providedIn: 'root' })
export class EmployeeRepository extends SyncableRepository<Employee> {
  protected readonly table = this.db.employees;
  protected readonly entityType = 'employee' as const;

  /** Сотрудники организации, кроме удалённых. */
  async listByOrg(orgId: string): Promise<Employee[]> {
    const items = await this.table.where('orgId').equals(orgId).toArray();
    return items
      .filter((item) => item.deletedAt === undefined)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
  }

  /** Сотрудник по идентификатору. */
  async getById(id: string): Promise<Employee | undefined> {
    return this.findById(id);
  }

  /** Создаёт сотрудника и ставит операцию в очередь синхронизации. */
  async create(orgId: string, draft: EmployeeSave): Promise<Employee> {
    return this.insert({ id: uuid(), orgId, ...draft });
  }

  /** Обновляет карточку сотрудника, включая эталонную подпись. */
  async update(id: string, draft: EmployeeSave): Promise<Employee> {
    return this.updateExisting(id, { ...draft });
  }

  /** Сохраняет эталонную подпись сотрудника (base64 PNG). */
  async setSignature(id: string, signature: string): Promise<Employee> {
    return this.updateExisting(id, { signature });
  }

  /** Помечает сотрудника уволенным: заполняет `firedAt`. */
  async markFired(id: string, firedAt: string): Promise<Employee> {
    return this.updateExisting(id, { firedAt });
  }

  /** Возвращает сотрудника в штат: сбрасывает `firedAt`. */
  async restore(id: string): Promise<Employee> {
    return this.updateExisting(id, { firedAt: undefined });
  }

  /** Помечает сотрудника удалённым. */
  async remove(id: string): Promise<Employee> {
    return this.softDelete(id);
  }
}
