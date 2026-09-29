import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Детальный вид журнала: метаданные, таблица записей, swipe-actions, экспорт в PDF.
 * Реализация — T5 (TZ 8.4). `id` приходит из роута через withComponentInputBinding.
 */
@Component({
  selector: 'app-journal-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Журнал</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="p-screen-x py-between-sections text-body">
        <p class="text-small text-[var(--color-text-muted)]">
          Заглушка экрана. Журнал: {{ id() || '—' }}
        </p>
      </div>
    </ion-content>
  `,
})
export class JournalDetailPage {
  readonly id = input<string>();
}
