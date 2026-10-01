import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';

/**
 * Плавающая кнопка действия поверх списка (ТЗ 13.1, 8.2).
 * Круглая оранжевая кнопка с иконкой «+»; клик и переход по маршруту — через
 * настоящую ссылку, поэтому у неё есть `href`, а не только обработчик.
 * Смещение снизу оставляет место панели вкладок.
 */
@Component({
  selector: 'app-fab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, RouterLink],
  host: {
    class: 'fixed right-screen-x z-30',
    // Панель вкладок видна только на корневых маршрутах, поэтому смещение
    // задаётся из оболочки: `--tab-bar-height` живёт там же, где сама панель.
    style: 'bottom: calc(var(--tab-bar-safe-height, 0px) + var(--fab-offset, 16px));',
  },
  template: `
    <a
      class="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-lg"
      [routerLink]="link()"
      [attr.aria-label]="ariaLabel()"
    >
      <ion-icon [name]="icon()" class="text-3xl" aria-hidden="true" />
    </a>
  `,
})
export class FabComponent {
  /** Адрес маршрута, куда ведёт кнопка. */
  readonly link = input<string>();
  /** Имя иконки ionicons. */
  readonly icon = input('add-outline');
  /** Подпись для скринридеров; без неё — «Добавить». */
  readonly ariaLabel = input<string>('Добавить');
}
