import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { Journal, JournalDraft, JournalSummary } from '../domain/journals/journal.model';
import type { JournalTemplate } from '../domain/journals/journal-template.model';
import { JournalService } from '../domain/journals/journal.service';
import type { FieldErrors } from '../domain/validation.model';
import { SessionStore } from './session.store';

interface JournalsState {
  /** Сводки журналов организации из IndexedDB. */
  readonly journals: readonly JournalSummary[];
  /** Шаблоны, доступные при создании журнала. */
  readonly templates: readonly JournalTemplate[];
  /** Идёт загрузка списка. */
  readonly loading: boolean;
}

/**
 * Список журналов и шаблонов (ТЗ 8.2, 8.3). Кэширует данные из IndexedDB,
 * запись всегда идёт через `JournalService` — сначала локально, потом в очередь.
 */
export const JournalsStore = signalStore(
  { providedIn: 'root' },
  withState<JournalsState>({ journals: [], templates: [], loading: false }),
  withComputed(({ journals, templates }) => ({
    /** Есть ли хотя бы один журнал — влияет на empty state. */
    hasJournals: computed(() => journals().length > 0),
    /** Сколько журналов ждут синхронизации. */
    pendingCount: computed(
      () => journals().filter((item) => item.journal.syncStatus !== 'synced').length,
    ),
    /** Суммарное количество записей во всех журналах. */
    totalEntries: computed(() => journals().reduce((sum, item) => sum + item.entryCount, 0)),
    /** Системные шаблоны для сетки выбора типа журнала. */
    systemTemplates: computed(() => templates().filter((template) => template.isSystem)),
  })),
  withMethods((store) => {
    const journalService = inject(JournalService);
    const session = inject(SessionStore);

    /** Загружает журналы и шаблоны текущей организации. */
    const load = async (): Promise<void> => {
      const orgId = session.organizationId();
      if (!orgId) {
        patchState(store, { journals: [], templates: [], loading: false });
        return;
      }
      patchState(store, { loading: true });
      const [journals, templates] = await Promise.all([
        journalService.listByOrg(orgId),
        journalService.listTemplates(orgId),
      ]);
      patchState(store, { journals, templates, loading: false });
    };

    return {
      load,

      /** Создаёт журнал и обновляет список (ТЗ 8.3). */
      async create(draft: JournalDraft): Promise<Journal> {
        const orgId = session.organizationId();
        if (!orgId) {
          throw new Error('Организация не создана');
        }
        const journal = await journalService.create(orgId, draft);
        await load();
        return journal;
      },

      /** Переименовывает журнал и обновляет список. */
      async update(id: string, draft: JournalDraft): Promise<Journal> {
        const journal = await journalService.update(id, draft);
        await load();
        return journal;
      },

      /** Журнал для экрана редактирования. */
      async get(id: string): Promise<Journal | undefined> {
        return journalService.get(id);
      },

      /** Закрывает журнал (ТЗ 8.4, меню журнала). */
      async close(id: string): Promise<Journal> {
        const journal = await journalService.close(id);
        await load();
        return journal;
      },

      /** Удаляет журнал вместе с записями и обновляет список. */
      async remove(id: string): Promise<Journal> {
        const journal = await journalService.remove(id);
        await load();
        return journal;
      },

      /** Проверяет форму создания журнала (ТЗ 8.3). */
      validate(draft: JournalDraft): FieldErrors {
        return journalService.validate(draft);
      },
    };
  }),
);
