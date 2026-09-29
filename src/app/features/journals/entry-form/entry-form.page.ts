import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Динамическая форма записи по `template.columns` (text/date/select/signature/number).
 * Реализация — T5 (TZ 8.5).
 */
@Component({
  selector: 'app-entry-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Новая запись</ion-title>
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
export class EntryFormPage {
  readonly id = input<string>();
}
