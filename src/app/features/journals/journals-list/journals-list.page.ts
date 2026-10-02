import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { Router, RouterLink } from '@angular/router';

import { OnlineStatusService } from '../../../core/sync/online-status.service';
import { DateRuPipe } from '../../../shared/pipes/date-ru.pipe';
import { PluralPipe } from '../../../shared/pipes/plural.pipe';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { FabComponent } from '../../../shared/ui/fab/fab.component';
import { OfflineBannerComponent } from '../../../shared/ui/offline-banner/offline-banner.component';
import { categoryLabel } from '../../../domain/templates/system-templates';
import { JournalsStore } from '../../../stores/journals.store';

/**
 * Список журналов организации: карточки со сводкой и переход в журнал (ТЗ 8.2).
 */
@Component({
  selector: 'app-journals-list',
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
    IonSpinner,
    RouterLink,
    DateRuPipe,
    PluralPipe,
    EmptyStateComponent,
    FabComponent,
    OfflineBannerComponent,
  ],
  templateUrl: './journals-list.page.html',
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
