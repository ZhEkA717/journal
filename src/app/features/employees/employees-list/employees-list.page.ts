import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
  templateUrl: './employees-list.page.html',
})
export class EmployeesListPage {
  /** Сотрудники, поиск и счётчики инструктажей. */
  protected readonly store = inject(EmployeesStore);
  /** Состояние сети для баннера (ТЗ 9.2). */
  protected readonly online = inject(OnlineStatusService);
  private readonly router = inject(Router);

  /** Ссылка на `<ion-searchbar>` через template ref: нужен и `setFocus()` (через
   * прототип custom element), и доступ к `shadowRoot` для правки отступа. */
  private readonly searchbarRef = viewChild<IonSearchbar>('searchbar');
  /** Показывать ли строку поиска. */
  protected readonly searchVisible = signal(false);
  /** Инициалы для аватара. */
  protected readonly initialsOf = initials;

  protected readonly searchIcon = 'search-outline';

  constructor() {
    void this.store.load();
    // Когда панель поиска появляется — фокусируем внутренний `<input>` и
    // увеличиваем отступ слева, чтобы между иконкой и текстом было больше
    // воздуха (по умолчанию Ionic рисует 30px на iOS и 55px на MD, а на iOS
    // зазор получается слишком тесным — около 3px).
    effect(() => {
      if (!this.searchVisible()) {
        return;
      }
      this.focusAndSpaceSearch();
    });
  }

  /** Ждём следующий кадр, чтобы Stencil успел завести shadow DOM,
   * затем ставим фокус и расширяем отступ слева у внутреннего `<input>`. */
  private focusAndSpaceSearch(): void {
    const host = this.searchbarRef();
    if (!host) {
      return;
    }

    host.getInputElement().then((value) => {
      value.focus();
    });
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
