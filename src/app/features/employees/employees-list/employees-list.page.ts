import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  type SearchbarCustomEvent,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { addOutline, searchOutline } from 'ionicons/icons';

import { DateRuPipe } from '../../../shared/pipes/date-ru.pipe';
import { PluralPipe } from '../../../shared/pipes/plural.pipe';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { FabComponent } from '../../../shared/ui/fab/fab.component';
import { OfflineBannerComponent } from '../../../shared/ui/offline-banner/offline-banner.component';
import { initials } from '../../../shared/utils/text.utils';
import { OnlineStatusService } from '../../../core/sync/online-status.service';
import { EmployeesStore } from '../../../stores/employees.store';

/**
 * Список сотрудников с поиском по ФИО и должности (ТЗ 8.6, 14).
 */
@Component({
  selector: 'app-employees-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSpinner,
    RouterLink,
    DateRuPipe,
    PluralPipe,
    EmptyStateComponent,
    FabComponent,
    OfflineBannerComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title class="text-h2">Сотрудники</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="toggleSearch()" [attr.aria-label]="searchButtonLabel">
            <ion-icon slot="icon-only" [name]="searchIcon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      @if (searchVisible()) {
        <div class="px-screen-x pb-2">
          <ion-searchbar
            placeholder="Поиск по имени или должности"
            [value]="store.query()"
            (ionInput)="onSearch($event)"
          />
        </div>
      }

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
        } @else if (!store.hasEmployees()) {
          <app-empty-state
            icon="people-outline"
            title="Пока нет сотрудников"
            description="Добавьте сотрудников, чтобы вести записи в журналах"
            actionLabel="Добавить сотрудника"
            (action)="openCreate()"
          />
        } @else if (store.filtered().length === 0) {
          <app-empty-state
            icon="search-outline"
            title="Никого не найдено"
            description="Измените поисковый запрос"
            actionLabel="Сбросить поиск"
            (action)="resetSearch()"
          />
        } @else {
          <div class="flex flex-col gap-between-cards">
            @for (employee of store.filtered(); track employee.id) {
              <a
                class="card-surface block p-inside-card"
                [class.opacity-60]="employee.firedAt"
                [routerLink]="['/employees', employee.id, 'edit']"
              >
                <div class="flex items-start gap-between-cards">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-small font-semibold text-[var(--ion-color-primary)]"
                    aria-hidden="true"
                  >
                    {{ initialsOf(employee.fullName) }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <h2 class="min-w-0 flex-1 truncate text-h3 text-[var(--color-text)]">
                        {{ employee.fullName }}
                      </h2>
                      @if (employee.firedAt) {
                        <span
                          class="shrink-0 rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-tiny text-[var(--color-text-muted)]"
                        >
                          Уволен
                        </span>
                      }
                    </div>
                    <p class="text-small text-[var(--color-text-muted)]">{{ employee.position }}</p>
                    <div class="mt-2 border-t border-[var(--color-border)] pt-2">
                      <p class="text-small text-[var(--color-text-muted)]">
                        В компании с {{ employee.hiredAt | dateRu }}
                      </p>
                      <p class="text-small text-[var(--color-text-muted)]">
                        {{ store.instructionsOf()(employee.id) }}
                        {{
                          store.instructionsOf()(employee.id)
                            | plural: 'инструктаж' : 'инструктажа' : 'инструктажей'
                        }}
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

    <app-fab link="/employees/new" icon="add" label="Добавить" />
  `,
})
export class EmployeesListPage {
  /** Сотрудники, поиск и счётчики инструктажей. */
  protected readonly store = inject(EmployeesStore);
  /** Состояние сети для баннера (ТЗ 9.2). */
  protected readonly online = inject(OnlineStatusService);
  private readonly router = inject(Router);

  /** Показывать ли строку поиска. */
  protected readonly searchVisible = signal(false);
  /** Инициалы для аватара. */
  protected readonly initialsOf = initials;

  protected readonly searchIcon = 'search-outline';

  constructor() {
    void this.store.load();
  }

  protected get searchButtonLabel(): string {
    return this.searchVisible() ? 'Скрыть поиск' : 'Поиск сотрудников';
  }

  protected toggleSearch(): void {
    this.searchVisible.update((visible) => !visible);
    if (!this.searchVisible()) {
      this.store.setQuery('');
    }
  }

  protected onSearch(event: SearchbarCustomEvent): void {
    this.store.setQuery(event.detail.value ?? '');
  }

  protected resetSearch(): void {
    this.store.setQuery('');
  }

  protected openCreate(): void {
    void this.router.navigateByUrl('/employees/new');
  }

  protected async onRefresh(event: CustomEvent): Promise<void> {
    await this.store.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }
}

addIcons({ addOutline, searchOutline });
