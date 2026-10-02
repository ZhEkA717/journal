import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Отчёты — заглушка вкладки. В MVP раздел не входит (TZ 14), вкладка оставлена
 * как точка входа для будущего этапа.
 */
@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Отчёты</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="p-screen-x py-between-sections text-body">
        <p class="text-small text-[var(--color-text-muted)]">
          Раздел в бэклоге MVP. Содержимое появится после задачи T9.
        </p>
      </div>
    </ion-content>
  `,
})
export class ReportsPage {}
