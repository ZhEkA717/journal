import { TestBed } from '@angular/core/testing';

import type { VersionedEntity } from '../../models/base.model';
import { SyncConflictService } from '../sync-conflict.service';

function entity(id: string, updatedAt: number): VersionedEntity {
  return { id, createdAt: 1, updatedAt };
}

describe('SyncConflictService', () => {
  let service: SyncConflictService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SyncConflictService);
  });

  it('побеждает серверная версия, если она новее', () => {
    const winner = service.pickWinner(entity('a', 100), entity('a', 200));

    expect(winner.updatedAt).toBe(200);
  });

  it('побеждает локальная версия, если она новее', () => {
    const winner = service.pickWinner(entity('a', 300), entity('a', 200));

    expect(winner.updatedAt).toBe(300);
  });

  it('при равенстве времени побеждает локальная версия', () => {
    const local = entity('a', 200);
    const winner = service.pickWinner(local, entity('a', 200));

    expect(winner).toBe(local);
  });

  it('без локальной версии побеждает серверная', () => {
    const remote = entity('a', 200);

    expect(service.pickWinner(undefined, remote)).toBe(remote);
  });
});
