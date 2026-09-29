import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  cloudOfflineOutline,
  syncOutline,
  warningOutline,
} from 'ionicons/icons';

import type { SyncStatus } from '../../../core/models/base.model';

/** Состояние индикатора: из статуса записи плюс отсутствие сети. */
export type SyncIndicatorState = SyncStatus | 'offline';

const STATE_ICON: Readonly<Record<SyncIndicatorState, string>> = {
  synced: 'checkmark-circle-outline',
  pending: 'sync-outline',
  conflict: 'warning-outline',
  offline: 'cloud-offline-outline',
};

const STATE_COLOR: Readonly<Record<SyncIndicatorState, string>> = {
  synced: 'var(--ion-color-success)',
  pending: 'var(--ion-color-medium)',
  conflict: 'var(--ion-color-warning)',
  offline: 'var(--color-text-muted)',
};

/** Иконка статуса синхронизации для шапки журнала (ТЗ 8.2). */
@Component({
  selector: 'app-sync-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    <span
      class="inline-flex items-center gap-1 text-tiny text-[var(--color-text-muted)]"
      [attr.aria-label]="label()"
    >
      <ion-icon
        [name]="icon()"
        [style.color]="color()"
        [class.animate-spin]="state() === 'pending'"
        aria-hidden="true"
      />
      @if (showLabel()) {
        <span>{{ label() }}</span>
      }
    </span>
  `,
})
export class SyncIndicatorComponent {
  /** Состояние синхронизации. */
  readonly state = input<SyncIndicatorState>('synced');
  /** Показывать ли текст рядом с иконкой. */
  readonly showLabel = input(false);

  /** Имя иконки для состояния. */
  protected readonly icon = computed(() => STATE_ICON[this.state()]);
  /** Цвет иконки из токенов темы. */
  protected readonly color = computed(() => STATE_COLOR[this.state()]);
  /** Текстовая подпись состояния. */
  protected readonly label = computed(() => {
    const labels: Readonly<Record<SyncIndicatorState, string>> = {
      synced: 'Синхронизировано',
      pending: 'Не синхронизировано',
      conflict: 'Нужна синхронизация',
      offline: 'Нет сети',
    };
    return labels[this.state()];
  });
}

addIcons({ checkmarkCircleOutline, cloudOfflineOutline, syncOutline, warningOutline });
