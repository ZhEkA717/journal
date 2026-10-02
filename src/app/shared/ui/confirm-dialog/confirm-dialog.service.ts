import { Injectable, inject } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';

/** Параметры окна подтверждения. */
export interface ConfirmDialogOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmText?: string;
  readonly cancelText?: string;
  readonly danger?: boolean;
}

/** Результат выбора пользователя: подтвердил или отказался. */
const CONFIRM_ROLE = 'confirm';
const CANCEL_ROLE = 'cancel';

/**
 * Диалог подтверждения поверх `ActionSheetController`: удаление записи,
 * журнала, сотрудника. Возвращает `true`, если пользователь выбрал действие.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly actionSheetCtrl = inject(ActionSheetController);

  /** Показывает диалог и ждёт выбора пользователя. */
  async confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: options.title,
      subHeader: options.message,
      buttons: [
        {
          text: options.cancelText ?? 'Отмена',
          role: CANCEL_ROLE,
        },
        {
          text: options.confirmText ?? 'Подтвердить',
          role: CONFIRM_ROLE,
          cssClass: options.danger ? 'danger' : undefined,
        },
      ],
    });
    await actionSheet.present();
    const { role } = await actionSheet.onDidDismiss();
    return role === CONFIRM_ROLE;
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
