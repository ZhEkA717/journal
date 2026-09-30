import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/** Оранжевая полоса сверху, когда приложение работает без сети (ТЗ 8.2). */
@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  host: { class: 'block' },
  template: `
    @if (visible()) {
      <div
        class="flex items-center gap-2 bg-[var(--ion-color-warning)] px-screen-x py-2 text-small text-[var(--ion-color-warning-contrast)]"
        role="status"
      >
        <ion-icon [name]="icon" class="shrink-0 text-lg" aria-hidden="true" />
        <span>{{ message() }}</span>
      </div>
    }
  `,
})
export class OfflineBannerComponent {
  /** Показывать ли полосу. */
  readonly visible = input(false);
  /** Текст предупреждения. */
  readonly message = input('Нет сети — данные сохраняются на устройстве');
  /** Зарегистрированная иконка ionicons. */
  protected readonly icon = 'cloud-offline-outline';
}
