import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';

/** Заглушка для пустых списков: иконка, заголовок, пояснение и действие (ТЗ 8.2). */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonButton],
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  /** Имя иконки ionicons. */
  readonly icon = input.required<string>();
  /** Заголовок, например «Пока нет журналов». */
  readonly title = input.required<string>();
  /** Пояснение под заголовком. */
  readonly description = input<string>();
  /** Подпись кнопки действия; без неё кнопка не показывается. */
  readonly actionLabel = input<string>();
  /** Оранжевая кнопка (основное действие, ТЗ 13.1). */
  readonly accent = input(false);
  /** Нажатие на кнопку действия. */
  readonly action = output<void>();
}
