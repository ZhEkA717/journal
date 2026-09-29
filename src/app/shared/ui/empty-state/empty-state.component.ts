import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';

/** Заглушка для пустых списков: иконка, заголовок, пояснение и действие (ТЗ 8.2). */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonButton],
  template: `
    <div
      class="flex flex-col items-center gap-between-cards px-screen-x py-between-sections text-center"
    >
      <div
        class="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-bg)]"
        aria-hidden="true"
      >
        <ion-icon [name]="icon()" class="text-6xl text-[var(--color-text-muted)]" />
      </div>
      <h2 class="text-h3 text-[var(--color-text)]">{{ title() }}</h2>
      @if (description(); as text) {
        <p class="text-small text-[var(--color-text-muted)]">{{ text }}</p>
      }
      @if (actionLabel(); as label) {
        <ion-button
          class="rounded-button"
          [color]="accent() ? 'secondary' : 'primary'"
          (click)="action.emit()"
        >
          {{ label }}
        </ion-button>
      }
    </div>
  `,
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
