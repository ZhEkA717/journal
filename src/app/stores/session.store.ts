import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { Organization, OrganizationDraft } from '../domain/organizations/organization.model';
import { OrganizationService } from '../domain/organizations/organization.service';
import type { FieldErrors } from '../domain/validation.model';

interface SessionState {
  /** Текущая организация устройства; `undefined`, пока не пройден онбординг. */
  readonly organization: Organization | undefined;
  /** Идёт первичная загрузка из IndexedDB. */
  readonly loading: boolean;
}

/**
 * Состояние сессии: организация устройства и факт прохождения онбординга (ТЗ 8.1).
 * Единственный источник `orgId` для остальных stores.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState<SessionState>({ organization: undefined, loading: true }),
  withComputed(({ organization, loading }) => ({
    /** Идентификатор организации для запросов в хранилище. */
    organizationId: computed(() => organization()?.id),
    /** Онбординг пройден: в базе есть организация. */
    isInitialized: computed(() => organization() !== undefined),
    /** Состояние прочитано — можно рендерить экраны. */
    isReady: computed(() => !loading()),
  })),
  withMethods((store) => {
    const organizationService = inject(OrganizationService);

    return {
      /** Читает организацию из IndexedDB. */
      async load(): Promise<Organization | undefined> {
        patchState(store, { loading: true });
        const organization = await organizationService.getCurrent();
        patchState(store, { organization, loading: false });
        return organization;
      },

      /** Первый запуск: создаёт организацию и системные шаблоны (ТЗ 8.1). */
      async setup(draft: OrganizationDraft): Promise<Organization> {
        const organization = await organizationService.create(draft);
        patchState(store, { organization });
        return organization;
      },

      /** Обновляет реквизиты организации (ТЗ 8.7). */
      async update(draft: OrganizationDraft): Promise<Organization> {
        const current = store.organization();
        if (!current) {
          throw new Error('Организация не создана');
        }
        const organization = await organizationService.update(current.id, draft);
        patchState(store, { organization });
        return organization;
      },

      /** Сбрасывает состояние после выхода из приложения. */
      reset(): void {
        patchState(store, { organization: undefined, loading: false });
      },

      /** Проверяет реквизиты организации перед сохранением (ТЗ 8.7). */
      validate(draft: OrganizationDraft): FieldErrors {
        return organizationService.validate(draft);
      },
    };
  }),
);
