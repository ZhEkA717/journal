import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/** Оранжевая полоса сверху, когда приложение работает без сети (ТЗ 8.2). */
@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  host: { class: 'block' },
  templateUrl: './offline-banner.component.html',
})
export class OfflineBannerComponent {
  /** Показывать ли полосу. */
  readonly visible = input(false);
  /** Текст предупреждения. */
  readonly message = input('Нет сети — данные сохраняются на устройстве');
  /** Зарегистрированная иконка ionicons. */
  protected readonly icon = 'cloud-offline-outline';
}
