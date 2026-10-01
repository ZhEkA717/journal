import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { IonButton, ModalController } from '@ionic/angular';

/**
 * Модальное окно подтверждения действия (ТЗ 8.4, 8.7).
 * Закрывается через `ModalController.dismiss`, результат (`true`/`false`)
 * передаётся в `data`.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton],
  template: `
    <div class="flex h-full w-full flex-col gap-6 bg-[var(--color-surface)] p-6">
      <div>
        <h2 class="text-h3 text-[var(--color-text)]">{{ title }}</h2>
        <p class="mt-2 text-body text-[var(--color-text-muted)]">{{ message }}</p>
      </div>
      <div class="mt-auto flex gap-3">
        <ion-button expand="block" fill="clear" color="medium" class="flex-1" (click)="cancel()">
          {{ cancelText }}
        </ion-button>
        <ion-button
          expand="block"
          class="flex-1"
          [color]="danger ? 'danger' : 'primary'"
          (click)="confirm()"
        >
          {{ confirmText }}
        </ion-button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  /** Заголовок окна. */
  @Input() title = '';
  /** Пояснение, что именно произойдёт. */
  @Input() message = '';
  /** Подпись кнопки подтверждения. */
  @Input() confirmText = 'Подтвердить';
  /** Подпись кнопки отмены. */
  @Input() cancelText = 'Отмена';
  /** Красная кнопка подтверждения — для удаления. */
  @Input() danger = false;

  private readonly modalCtrl = inject(ModalController);

  /** Подтверждает действие. */
  async confirm(): Promise<void> {
    await this.modalCtrl.dismiss(true, 'confirmed');
  }

  /** Отменяет действие. */
  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss(false, 'cancelled');
  }
}
