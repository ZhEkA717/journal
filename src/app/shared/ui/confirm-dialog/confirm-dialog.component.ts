import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { IonModalToken } from '@ionic/angular/common';

/**
 * Модальное окно подтверждения действия (ТЗ 8.4, 8.7).
 * Внутри `ion-modal` получает ссылку на модалку через `IonModalToken` и закрывает
 * её с результатом: `true` — подтверждено, `false` — отменено.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonFooter, IonButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title class="pl-4">{{ title() }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="text-body text-[var(--color-text)]">{{ message() }}</p>
    </ion-content>
    <ion-footer class="ion-no-border">
      <ion-toolbar class="ion-padding">
        <ion-buttons slot="start">
          <ion-button class="rounded-button" (click)="cancel()">{{ cancelText() }}</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            class="rounded-button"
            [color]="danger() ? 'danger' : 'primary'"
            (click)="confirm()"
          >
            {{ confirmText() }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  `,
})
export class ConfirmDialogComponent {
  /** Заголовок окна. */
  readonly title = input.required<string>();
  /** Пояснение, что именно произойдёт. */
  readonly message = input.required<string>();
  /** Подпись кнопки подтверждения. */
  readonly confirmText = input('Подтвердить');
  /** Подпись кнопки отмены. */
  readonly cancelText = input('Отмена');
  /** Красная кнопка подтверждения — для удаления. */
  readonly danger = input(false);

  private readonly modal = inject(IonModalToken, { optional: true });

  /** Подтверждает действие. */
  confirm(): void {
    void this.modal?.dismiss(true, 'confirmed');
  }

  /** Отменяет действие. */
  cancel(): void {
    void this.modal?.dismiss(false, 'cancelled');
  }
}
