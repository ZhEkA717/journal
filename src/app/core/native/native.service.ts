import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar } from '@capacitor/status-bar';

/** Цвет статус-бара и splash — primary из дизайн-токенов (ТЗ 13.1, 10.3). */
const PRIMARY_COLOR = '#1E40AF';

/**
 * Нативные мосты Capacitor (ТЗ 10.3).
 *
 * В браузере методы тихо ничего не делают: плагины без моста бросают
 * `unimplemented`, нам же нужен безошибочный веб-фоллбек (ТЗ 12.5).
 */
@Injectable({ providedIn: 'root' })
export class NativeService {
  /** Вибро при сохранении записи (ТЗ 8.5.3, 10.3). */
  async impact(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Отсутствие вибрации на устройстве — не повод ломать сохранение.
    }
  }

  /** Цвет статус-бара при старте (ТЗ 10.3). */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await StatusBar.setBackgroundColor({ color: PRIMARY_COLOR });
    } catch {
      // iOS не поддерживает backgroundColor статус-бара — там цвет задаёт система.
    }
  }
}
