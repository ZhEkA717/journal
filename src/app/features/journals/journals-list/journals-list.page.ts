import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular';

import { OnlineStatusService } from '../../../core/sync/online-status.service';
import { DateRuPipe } from '../../../shared/pipes/date-ru.pipe';
import { PluralPipe } from '../../../shared/pipes/plural.pipe';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { FabComponent } from '../../../shared/ui/fab/fab.component';
import { OfflineBannerComponent } from '../../../shared/ui/offline-banner/offline-banner.component';
import { categoryLabel } from '../../../domain/templates/system-templates';
import { JournalsStore } from '../../../stores/journals.store';
import { Router, RouterLink } from '@angular/router';

/**
 * Список журналов организации: карточки со сводкой и переход в журнал (ТЗ 8.2).
 */
@Component({
  selector: 'app-journals-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    RouterLink,
    DateRuPipe,
    PluralPipe,
    EmptyStateComponent,
    FabComponent,
    OfflineBannerComponent,
  ],
  styles: `
    ion-header {
      box-shadow: 0 1px 3px rgb(15 23 42 / 8%);
    }
  `,
  template: `
    <ion-header>
      <div class="flex items-center justify-between px-screen-x py-3">
        <h1 class="text-h2 text-[var(--color-text)]">Мои журналы</h1>
        <a
          routerLink="/settings"
          aria-label="Настройки"
          class="flex h-[22px] w-[22px] items-center justify-center text-[var(--color-text-muted)]"
        >
          <ion-icon [name]="settingsIcon" class="text-[22px]" aria-hidden="true" />
        </a>
      </div>
      <app-offline-banner [visible]="online.isOffline()" />
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="p-screen-x pt-between-sections pb-[calc(var(--tab-bar-safe-height)+96px)]">
        @if (store.loading()) {
          <div class="flex justify-center py-12">
            <ion-spinner name="crescent" />
          </div>
        } @else if (!store.hasJournals()) {
          <app-empty-state
            icon="book-outline"
            title="Пока нет журналов"
            description="Нажмите + чтобы добавить"
          />
        } @else {
          <div class="flex flex-col gap-between-cards">
            @for (item of store.journals(); track item.journal.id) {
              <a
                class="card-surface block p-inside-card"
                [routerLink]="['/journals', item.journal.id]"
                [attr.aria-label]="item.journal.title"
              >
                <div class="flex items-start gap-between-cards">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    [style.background]="iconBackground(item)"
                  >
                    <ion-icon
                      [name]="item.template?.iconName ?? 'book-outline'"
                      [style.color]="item.template?.color ?? 'var(--color-text-muted)'"
                      class="text-xl"
                      aria-hidden="true"
                    />
                  </span>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <h2 class="min-w-0 flex-1 truncate text-h3 text-[var(--color-text)]">
                        {{ item.journal.title }}
                      </h2>
                      <ion-icon
                        [name]="chevronIcon"
                        class="shrink-0 text-lg text-[var(--color-border)]"
                        aria-hidden="true"
                      />
                    </div>
                    <p class="text-small text-[var(--color-text-muted)]">
                      {{ item.template ? categoryLabel(item.template.category) : 'Свой журнал' }}
                    </p>

                    <div class="mt-2 border-t border-[var(--color-border)] pt-2">
                      <p class="text-small text-[var(--color-text-muted)]">
                        {{ item.entryCount }}
                        {{ item.entryCount | plural: 'запись' : 'записи' : 'записей' }} ·
                        {{ item.employeeCount }}
                        {{
                          item.employeeCount | plural: 'сотрудник' : 'сотрудника' : 'сотрудников'
                        }}
                      </p>
                      <p class="text-small text-[var(--color-text-muted)]">
                        @if (item.journal.closedAt) {
                          Закрыт {{ item.journal.closedAt | dateRu }}
                        } @else {
                          Открыт с {{ item.journal.startedAt | dateRu }}
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </ion-content>

    <app-fab link="/journals/create" ariaLabel="Создать журнал" />
  `,
})
export class JournalsListPage {
  /** Данные списка из store. */
  protected readonly store = inject(JournalsStore);
  /** Состояние сети для баннера (ТЗ 9.2). */
  protected readonly online = inject(OnlineStatusService);
  private readonly router = inject(Router);

  /** Иконки и подписи. */
  protected readonly settingsIcon = 'settings-outline';
  protected readonly chevronIcon = 'chevron-forward-outline';
  /** Человекочитаемое название типа журнала. */
  protected readonly categoryLabel = categoryLabel;

  constructor() {
    void this.store.load();
  }

  protected iconBackground(item: { readonly template?: { readonly color?: string } }): string {
    const color = item.template?.color;
    return color ? `color-mix(in srgb, ${color} 12%, transparent)` : 'var(--color-bg)';
  }

  /** Pull-to-refresh: перечитываем журналы из IndexedDB. */
  protected async onRefresh(event: CustomEvent): Promise<void> {
    await this.store.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }

  protected create(): void {
    void this.router.navigateByUrl('/journals/create');
  }
}
