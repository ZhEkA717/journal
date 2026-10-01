import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

/**
 * Отчёты — заглушка вкладки. В MVP раздел не входит (TZ 14), вкладка оставлена
 * как точка входа для будущего этапа.
 */
@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonContent],
  styles: `
    ion-header {
      box-shadow: 0 1px 3px rgb(15 23 42 / 8%);
    }
  `,
  template: `
    <ion-header>
      <div class="flex items-center justify-between px-screen-x py-3">
        <h1 class="text-h2 text-[var(--color-text)]">Отчёты</h1>
      </div>
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
