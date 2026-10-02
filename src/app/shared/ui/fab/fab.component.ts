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
  templateUrl: './fab.component.html',
})
export class FabComponent {
  /** Адрес маршрута, куда ведёт кнопка. */
  readonly link = input<string>();
  /** Имя иконки ionicons. */
  readonly icon = input('add-outline');
  /** Подпись для скринридеров; без неё — «Добавить». */
  readonly ariaLabel = input<string>('Добавить');
}
