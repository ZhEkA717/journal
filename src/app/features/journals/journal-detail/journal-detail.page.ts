import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonList,
  IonItemSliding,
  IonPopover,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DateRuPipe } from '../../../shared/pipes/date-ru.pipe';
import { PluralPipe } from '../../../shared/pipes/plural.pipe';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { OfflineBannerComponent } from '../../../shared/ui/offline-banner/offline-banner.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { shortName } from '../../../shared/utils/text.utils';
import { errorMessage } from '../../../shared/utils/error.utils';
import { OnlineStatusService } from '../../../core/sync/online-status.service';
import { JournalDetailStore } from '../../../stores/journal-detail.store';
import { JournalsStore } from '../../../stores/journals.store';
import { FabComponent } from '../../../shared/ui/fab/fab.component';

/**
 * Детальный вид журнала: шапка, меню и таблица записей (ТЗ 8.4).
 * Записи удаляются свайпом, редактируются по тапу.
 */
@Component({
  selector: 'app-journal-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonContent,
    IonFooter,
    IonIcon,
    IonPopover,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonList,
    RouterLink,
    DateRuPipe,
    PluralPipe,
    EmptyStateComponent,
    OfflineBannerComponent,
    FabComponent,
  ],
  styles: `
    ion-footer.export-footer {
      background: var(--color-bg);
      height: var(--tab-bar-safe-height);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
    }

    ion-footer.export-footer .export-button {
      margin: 0;
      width: 100%;
    }
  `,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/journals" text="" />
        </ion-buttons>
        <ion-title class="text-h3 pl-4">{{ store.journal()?.title ?? 'Журнал' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button id="journal-menu-button" aria-label="Меню журнала" fill="clear">
            <ion-icon slot="icon-only" [name]="menuIcon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <app-offline-banner [visible]="online.isOffline()" />
    </ion-header>

    <ion-popover
      [dismissOnSelect]="true"
      class="journal-menu"
      trigger="journal-menu-button"
      triggerAction="click"
    >
      <ng-template>
        <div class="flex w-full flex-col py-1">
          <button
            type="button"
            class="flex items-center gap-3 px-4 py-3 text-body text-[var(--color-text)]"
            [disabled]="store.isClosed()"
            (click)="close()"
          >
            <ion-icon [name]="closeIcon" class="text-lg" aria-hidden="true" />
            Закрыть журнал
          </button>
          <button
            type="button"
            class="flex items-center gap-3 px-4 py-3 text-body text-[var(--color-danger)]"
            (click)="remove()"
          >
            <ion-icon [name]="trashIcon" class="text-lg" aria-hidden="true" />
            Удалить журнал
          </button>
        </div>
      </ng-template>
    </ion-popover>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      @if (store.loading()) {
        <div class="flex justify-center py-12">
          <ion-spinner name="crescent" />
        </div>
      } @else if (!store.journal()) {
        <app-empty-state
          icon="alert-circle-outline"
          title="Журнал не найден"
          description="Возможно, он был удалён"
          actionLabel="К списку журналов"
          (action)="backToList()"
        />
      } @else {
        <div
          class="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-screen-x py-3"
        >
          <p class="text-small text-[var(--color-text-muted)]">
            @if (store.isClosed()) {
              Закрыт {{ store.journal()?.closedAt | dateRu }} · Ответственный:
              {{ store.journal()?.responsiblePerson }}
            } @else {
              Открыт с {{ store.journal()?.startedAt | dateRu }} · Ответственный:
              {{ store.journal()?.responsiblePerson }}
            }
          </p>
          <div class="mt-1 flex items-center justify-between">
            <span class="text-body font-medium text-[var(--color-text)]">
              {{ store.entryCount() }}
              {{ store.entryCount() | plural: 'запись' : 'записи' : 'записей' }}
            </span>
            @if (store.isClosed()) {
              <span
                class="rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-tiny text-[var(--color-text-muted)]"
              >
                Журнал закрыт
              </span>
            }
          </div>
        </div>

        @if (!store.hasEntries()) {
          <app-empty-state
            icon="create-outline"
            title="Нет записей"
            description="Нажмите + чтобы добавить"
          />
        } @else {
          <div
            class="sticky top-0 z-10 grid grid-cols-[72px_1fr_96px_32px] gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-screen-x py-2"
          >
            <span
              class="text-tiny font-semibold tracking-wide text-[var(--color-text-muted)] uppercase"
            >
              Дата
            </span>
            <span
              class="text-tiny font-semibold tracking-wide text-[var(--color-text-muted)] uppercase"
            >
              ФИО
            </span>
            <span
              class="text-tiny font-semibold tracking-wide text-[var(--color-text-muted)] uppercase"
            >
              Вид
            </span>
            <span class="sr-only">Подпись</span>
          </div>

          <ion-list lines="none">
            @for (row of store.rows(); track row.id) {
              <ion-item-sliding>
                <ion-item type="button" [routerLink]="entryLink(row.id)" [detail]="false">
                  <div
                    class="grid w-full grid-cols-[72px_1fr_96px_32px] gap-2 py-2 text-small text-[var(--color-text)]"
                  >
                    <span class="truncate">{{ row.date | dateRu }}</span>
                    <span class="truncate">{{ shortName(row.employeeName) }}</span>
                    <span class="truncate text-[var(--color-text-muted)]">{{ row.kind }}</span>
                    <span class="flex justify-center">
                      @if (row.signed) {
                        <ion-icon
                          [name]="signedIcon"
                          class="text-lg text-[var(--color-success)]"
                          aria-label="Подпись есть"
                        />
                      } @else {
                        <ion-icon
                          [name]="unsignedIcon"
                          class="text-lg text-[var(--color-warning)]"
                          aria-label="Без подписи"
                        />
                      }
                    </span>
                  </div>
                </ion-item>
                <ion-item-options side="end">
                  <ion-item-option color="primary" (click)="editEntry(row.id)"
                    >Изменить</ion-item-option
                  >
                  <ion-item-option color="danger" (click)="removeEntry(row.id)"
                    >Удалить</ion-item-option
                  >
                </ion-item-options>
              </ion-item-sliding>
            }
          </ion-list>
        }
      }
    </ion-content>

    @if (store.journal() && !store.isClosed()) {
      <ion-footer class="export-footer">
        <ion-button
          expand="block"
          fill="outline"
          color="primary"
          class="export-button h-11 font-semibold"
          (click)="exportPdf()"
        >
          <ion-icon slot="start" [name]="downloadIcon" aria-hidden="true" />
          Экспорт в PDF
        </ion-button>
      </ion-footer>
      <app-fab ariaLabel="Добавить запись" (click)="addEntry()"></app-fab>
    }
  `,
})
export class JournalDetailPage {
  /** Данные журнала и записей. */
  protected readonly store = inject(JournalDetailStore);
  private readonly journals = inject(JournalsStore);
  protected readonly online = inject(OnlineStatusService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  /** Короткое имя сотрудника в строке таблицы. */
  protected readonly shortName = shortName;
  /** Идентификатор журнала из маршрута. */
  private readonly journalId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly menuIcon = 'ellipsis-vertical-outline';
  protected readonly closeIcon = 'close-outline';
  protected readonly trashIcon = 'trash-outline';
  protected readonly downloadIcon = 'download-outline';
  protected readonly signedIcon = 'checkmark-circle-outline';
  protected readonly unsignedIcon = 'warning-outline';

  /** Ссылки на записи для `routerLink` вычисляются один раз. */
  protected readonly entryLink = (entryId: string): string[] => [
    '/journals',
    this.journalId,
    'entries',
    entryId,
  ];

  constructor() {
    void this.store.load(this.journalId);
  }

  protected async onRefresh(event: CustomEvent): Promise<void> {
    await this.store.load(this.journalId);
    await (event.target as HTMLIonRefresherElement).complete();
  }

  protected addEntry(): void {
    void this.router.navigate(['/journals', this.journalId, 'entries', 'new']);
  }

  protected editEntry(entryId: string): void {
    void this.router.navigate(this.entryLink(entryId));
  }

  /** Закрывает журнал: новые записи больше не добавляются. */
  protected async close(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Закрыть журнал?',
      message: 'Новые записи добавить не получится. Действие можно отменить позже.',
      confirmText: 'Закрыть',
    });
    if (!confirmed) {
      return;
    }
    try {
      await this.journals.close(this.journalId);
      await this.store.load(this.journalId);
      await this.journals.load();
      await this.toast.success('Журнал закрыт');
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось закрыть журнал'));
    }
  }

  /** Удаляет журнал вместе с записями. */
  protected async remove(): Promise<void> {
    const count = this.store.entryCount();
    const confirmed = await this.confirm.remove(
      'Удалить журнал?',
      `Все ${count} ${count === 1 ? 'запись' : 'записи'} будут удалены без возможности восстановления.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.journals.remove(this.journalId);
      await this.toast.success('Журнал удалён');
      await this.backToList();
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось удалить журнал'));
    }
  }

  protected async removeEntry(entryId: string): Promise<void> {
    const confirmed = await this.confirm.remove('Удалить запись?', 'Запись нельзя восстановить.');
    if (!confirmed) {
      return;
    }
    try {
      await this.store.removeEntry(entryId);
      await this.toast.success('Запись удалена');
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось удалить запись'));
    }
  }

  /** Экспорт в PDF появится в задаче T7. */
  protected async exportPdf(): Promise<void> {
    await this.toast.show('Экспорт в PDF появится в следующих обновлениях');
  }

  protected async backToList(): Promise<void> {
    await this.router.navigateByUrl('/journals', { replaceUrl: true });
  }
}
