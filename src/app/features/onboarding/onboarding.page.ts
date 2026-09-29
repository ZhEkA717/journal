import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Онбординг: выбор организации, подключение аккаунта, объяснение Local-First.
 * Реализация — T4 (TZ 8.1).
 */
@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Добро пожаловать</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="p-screen-x py-between-sections text-body">
        <h1 class="text-h1">Журналы по ГОСТ</h1>
        <p class="text-small text-[var(--color-text-muted)]">
          Заглушка экрана. Содержимое появится в задаче T4.
        </p>
      </div>
    </ion-content>
  `,
})
export class OnboardingPage {}
