import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { ConfirmDialogComponent } from './confirm-dialog.component';

/** Параметры окна подтверждения. */
export interface ConfirmDialogOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmText?: string;
  readonly cancelText?: string;
  readonly danger?: boolean;
}

/** Диалог подтверждения: удаление записи, журнала, сотрудника. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly modalController = inject(ModalController);

  /** Показывает диалог и ждёт выбора пользователя. */
  async confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const modal = await this.modalController.create({
      component: ConfirmDialogComponent,
      componentProps: { ...options },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<boolean>();
    return data === true;
  }

  /** Подтверждение удаления с красной кнопкой. */
  async remove(title = 'Удалить?', message = 'Действие нельзя отменить.'): Promise<boolean> {
    return this.confirm({
      title,
      message,
      confirmText: 'Удалить',
      danger: true,
    });
  }
}
