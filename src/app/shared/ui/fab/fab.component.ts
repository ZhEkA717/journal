import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon, IonLabel } from '@ionic/angular';

/**
 * Плавающая кнопка действия поверх списка (ТЗ 13.1, 8.2).
 * Внутри настоящая ссылка: у неё есть `href`, а не только обработчик клика.
 * Смещение снизу оставляет место панели вкладок.
 */
@Component({
  selector: 'app-fab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonLabel, IonIcon, RouterLink],
  host: {
    class: 'fixed right-screen-x z-30',
    // Панель вкладок видна только на корневых маршрутах, поэтому смещение
    // задаётся из оболочки: `--tab-bar-height` живёт там же, где сама панель.
    style: 'bottom: calc(var(--tab-bar-safe-height, 0px) + var(--fab-offset, 16px));',
  },
  template: `
    <a
      class="flex h-14 items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 text-body font-semibold text-white shadow-lg"
      [routerLink]="link()"
    >
      <ion-icon [name]="icon()" class="text-xl" aria-hidden="true" />
      @if (label(); as text) {
        <ion-label>{{ text }}</ion-label>
      }
    </a>
  `,
})
export class FabComponent {
  /** Адрес маршрута, куда ведёт кнопка. */
  readonly link = input<string>();
  /** Имя иконки ionicons. */
  readonly icon = input('add');
  /** Подпись рядом с иконкой; без неё кнопка круглая. */
  readonly label = input<string>();
}
