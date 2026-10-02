import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Обёртка поля формы: подпись, подсказка и текст ошибки (ТЗ 4, 8.5).
 * Само поле (`ion-input`, `ion-select`, `ion-datetime`) вставляется через
 * проекцию содержимого, поэтому компонент остаётся «глупым».
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './form-field.component.html',
})
export class FormFieldComponent {
  /** Подпись поля. */
  readonly label = input.required<string>();
  /** Обязательное поле — в подписи появляется звёздочка. */
  readonly required = input(false);
  /** Текст ошибки; если задан, подсказка не показывается. */
  readonly error = input<string>();
  /** Подсказка под полем. */
  readonly hint = input<string>();
}
