import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Настройки: организация, аккаунт, синхронизация, экспорт/импорт данных.
 * Реализация — T6 (TZ 8.7).
 */
@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Настройки</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="p-screen-x py-between-sections text-body">
        <p class="text-small text-[var(--color-text-muted)]">
          Заглушка экрана. Содержимое появится в задаче T6.
        </p>
      </div>
    </ion-content>
  `,
})
export class SettingsPage {}
