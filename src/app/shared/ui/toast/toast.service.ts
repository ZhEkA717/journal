import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** Тон тоста: нейтральный, успех, предупреждение или ошибка. */
export type ToastColor = 'dark' | 'success' | 'warning' | 'danger';

/** Короткие уведомления пользователю: «Запись сохранена» (ТЗ 8.5). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastController = inject(ToastController);

  /** Показывает тост и ждёт его закрытия. */
  async show(message: string, color: ToastColor = 'dark', durationMs = 2000): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: durationMs,
      position: 'bottom',
      swipeGesture: 'vertical',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await toast.present();
  }

  /** Сообщение об успешном действии. */
  async success(message: string): Promise<void> {
    await this.show(message, 'success');
  }

  /** Сообщение об ошибке — показывается дольше обычного. */
  async error(message: string): Promise<void> {
    await this.show(message, 'danger', 3500);
  }
}
