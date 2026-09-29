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
  template: `
    <div class="flex flex-col gap-1.5">
      <!-- Поле приходит через проекцию содержимого, поэтому правило не видит связи. -->
      <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
      <label class="text-small font-medium text-[var(--color-text-muted)]">
        {{ label() }}
        @if (required()) {
          <span class="text-[var(--color-accent)]" aria-hidden="true">*</span>
        }
      </label>
      <ng-content />
      @if (error(); as message) {
        <p class="text-tiny text-[var(--color-danger)]" role="alert">{{ message }}</p>
      } @else if (hint(); as text) {
        <p class="text-tiny text-[var(--color-text-muted)]">{{ text }}</p>
      }
    </div>
  `,
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
