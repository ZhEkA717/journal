import { Injectable } from '@angular/core';

import type { VersionedEntity } from '../models/base.model';

/**
 * Разрешение конфликтов синхронизации: Last-Write-Wins по `updatedAt` —
 * побеждает более поздняя запись, при равенстве — локальная (ТЗ 3, 9.2).
 */
@Injectable({ providedIn: 'root' })
export class SyncConflictService {
  /**
   * Возвращает победителя из локальной и серверной версии записи.
   * Если локальной версии нет — побеждает серверная.
   */
  pickWinner<T extends VersionedEntity>(local: T | undefined, remote: T): T {
    if (!local) {
      return remote;
    }
    return remote.updatedAt > local.updatedAt ? remote : local;
  }
}
