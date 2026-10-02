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
  templateUrl: './confirm-dialog.component.html',
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
