import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
  type InputCustomEvent,
} from '@ionic/angular';
import { Router } from '@angular/router';

import { LocalDataService } from '../../core/storage/local-data.service';
import { OnlineStatusService } from '../../core/sync/online-status.service';
import { SyncQueueService } from '../../core/sync/sync-queue.service';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { errorMessage } from '../../shared/utils/error.utils';
import { SessionStore } from '../../stores/session.store';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, cloudDoneOutline, cloudOfflineOutline } from 'ionicons/icons';

/** Версия приложения из `package.json` (ТЗ 8.7). */
const APP_VERSION = '0.0.0';

/**
 * Настройки: реквизиты организации, состояние синхронизации и выход из
 * приложения с полной очисткой локальных данных (ТЗ 8.7).
 */
@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonSpinner,
    FormFieldComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title class="text-h2">Настройки</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="flex flex-col gap-between-sections p-screen-x py-between-sections">
        <section>
          <h2
            class="mb-between-cards text-tiny font-semibold tracking-widest text-[var(--color-text-muted)] uppercase"
          >
            Организация
          </h2>
          @if (editing()) {
            <div class="card-surface flex flex-col gap-between-cards p-inside-card">
              <app-form-field label="Название" [required]="true" [error]="errors()['name']">
                <ion-input
                  class="field-control"
                  fill="outline"
                  [value]="name()"
                  (ionInput)="onName($event)"
                />
              </app-form-field>
              <app-form-field
                label="Ответственный"
                [required]="true"
                [error]="errors()['responsiblePerson']"
              >
                <ion-input
                  class="field-control"
                  fill="outline"
                  [value]="responsiblePerson()"
                  (ionInput)="onResponsible($event)"
                />
              </app-form-field>
              <app-form-field label="ИНН" hint="Необязательно">
                <ion-input
                  class="field-control"
                  fill="outline"
                  [value]="inn()"
                  (ionInput)="onInn($event)"
                />
              </app-form-field>
              <app-form-field label="Адрес" hint="Необязательно">
                <ion-input
                  class="field-control"
                  fill="outline"
                  [value]="address()"
                  (ionInput)="onAddress($event)"
                />
              </app-form-field>
              <div class="flex gap-between-cards">
                <ion-button expand="block" fill="clear" color="medium" (click)="cancelEdit()">
                  Отмена
                </ion-button>
                <ion-button expand="block" [disabled]="saving()" (click)="save()">
                  Сохранить
                </ion-button>
              </div>
            </div>
          } @else {
            <div class="card-surface overflow-hidden">
              <button
                type="button"
                class="flex w-full items-center justify-between px-inside-card py-3.5"
                (click)="startEdit()"
              >
                <span class="text-body text-[var(--color-text)]">Реквизиты</span>
                <span class="flex items-center gap-2">
                  <span class="max-w-45 truncate text-small text-[var(--color-text-muted)]">
                    {{ organization()?.name }}
                  </span>
                  <ion-icon [name]="chevronIcon" class="text-sm text-[var(--color-border)]" />
                </span>
              </button>
              <div
                class="flex items-center justify-between border-t border-[var(--color-border)] px-inside-card py-3.5"
              >
                <span class="text-body text-[var(--color-text)]">Ответственный</span>
                <span class="max-w-45 truncate text-small text-[var(--color-text-muted)]">
                  {{ organization()?.responsiblePerson }}
                </span>
              </div>
              @if (organization()?.inn || organization()?.address) {
                <div
                  class="flex items-center justify-between border-t border-[var(--color-border)] px-inside-card py-3.5"
                >
                  <span class="text-body text-[var(--color-text)]">ИНН / адрес</span>
                  <span class="max-w-45 truncate text-small text-[var(--color-text-muted)]">
                    {{ organization()?.inn }} {{ organization()?.address }}
                  </span>
                </div>
              }
            </div>
          }
        </section>

        <section>
          <h2
            class="mb-between-cards text-tiny font-semibold tracking-widest text-[var(--color-text-muted)] uppercase"
          >
            Синхронизация
          </h2>
          <div class="card-surface overflow-hidden">
            <div class="flex items-center justify-between px-inside-card py-3.5">
              <span class="text-body text-[var(--color-text)]">Состояние</span>
              <span class="flex items-center gap-2 text-small">
                <ion-icon
                  [name]="online.isOffline() ? offlineIcon : onlineIcon"
                  [style.color]="
                    online.isOffline() ? 'var(--color-warning)' : 'var(--color-success)'
                  "
                  aria-hidden="true"
                />
                <span
                  [style.color]="
                    online.isOffline() ? 'var(--color-warning)' : 'var(--color-success)'
                  "
                >
                  {{ online.isOffline() ? 'Нет сети' : 'Онлайн' }}
                </span>
              </span>
            </div>
            <div
              class="flex items-center justify-between border-t border-[var(--color-border)] px-inside-card py-3.5"
            >
              <span class="text-body text-[var(--color-text)]">Операций в очереди</span>
              <span class="text-small text-[var(--color-text-muted)]">{{ queueSize() }}</span>
            </div>
            <button
              type="button"
              class="flex w-full items-center justify-between border-t border-[var(--color-border)] px-inside-card py-3.5 text-left"
              (click)="syncNow()"
            >
              <span class="text-body text-[var(--color-text)]">Синхронизировать сейчас</span>
              <ion-icon [name]="chevronIcon" class="text-sm text-[var(--color-border)]" />
            </button>
          </div>
          @if (syncing()) {
            <div class="mt-2 flex justify-center">
              <ion-spinner name="crescent" />
            </div>
          }
        </section>

        <section>
          <h2
            class="mb-between-cards text-tiny font-semibold tracking-widest text-[var(--color-text-muted)] uppercase"
          >
            О приложении
          </h2>
          <div class="card-surface overflow-hidden">
            <div class="flex items-center justify-between px-inside-card py-3.5">
              <span class="text-body text-[var(--color-text)]">Версия</span>
              <span class="text-small text-[var(--color-text-muted)]">{{ version }}</span>
            </div>
            <div
              class="flex items-center justify-between border-t border-[var(--color-border)] px-inside-card py-3.5"
            >
              <span class="text-body text-[var(--color-text)]">Хранение данных</span>
              <span class="text-small text-[var(--color-text-muted)]">Только на устройстве</span>
            </div>
          </div>
        </section>

        <ion-button expand="block" color="danger" fill="outline" (click)="logout()">
          Выйти и удалить данные
        </ion-button>
      </div>
    </ion-content>
  `,
})
export class SettingsPage {
  private readonly session = inject(SessionStore);
  protected readonly online = inject(OnlineStatusService);
  private readonly queue = inject(SyncQueueService);
  private readonly localData = inject(LocalDataService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Редактируются ли реквизиты организации. */
  protected readonly editing = signal(false);
  /** Идёт сохранение реквизитов. */
  protected readonly saving = signal(false);
  /** Идёт ручная синхронизация. */
  protected readonly syncing = signal(false);
  /** Ошибки полей формы. */
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly name = signal('');
  protected readonly responsiblePerson = signal('');
  protected readonly inn = signal('');
  protected readonly address = signal('');

  /** Текущая организация. */
  protected readonly organization = this.session.organization;
  /** Размер очереди синхронизации. */
  protected readonly queueSize = this.queue.size;
  /** Версия приложения. */
  protected readonly version = APP_VERSION;

  protected readonly chevronIcon = 'chevron-forward-outline';
  protected readonly onlineIcon = 'cloud-done-outline';
  protected readonly offlineIcon = 'cloud-offline-outline';

  constructor() {
    void this.queue.refreshSize();
  }

  protected startEdit(): void {
    const organization = this.organization();
    this.name.set(organization?.name ?? '');
    this.responsiblePerson.set(organization?.responsiblePerson ?? '');
    this.inn.set(organization?.inn ?? '');
    this.address.set(organization?.address ?? '');
    this.errors.set({});
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.errors.set({});
  }

  protected onName(event: InputCustomEvent): void {
    this.name.set(event.detail.value ?? '');
  }

  protected onResponsible(event: InputCustomEvent): void {
    this.responsiblePerson.set(event.detail.value ?? '');
  }

  protected onInn(event: InputCustomEvent): void {
    this.inn.set(event.detail.value ?? '');
  }

  protected onAddress(event: InputCustomEvent): void {
    this.address.set(event.detail.value ?? '');
  }

  /** Сохраняет реквизиты организации. */
  protected async save(): Promise<void> {
    if (this.saving()) {
      return;
    }
    const draft = {
      name: this.name(),
      responsiblePerson: this.responsiblePerson(),
      inn: this.inn() || undefined,
      address: this.address() || undefined,
    };
    const errors = this.session.validate(draft);
    this.errors.set({ ...errors });
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.saving.set(true);
    try {
      await this.session.update(draft);
      this.editing.set(false);
      await this.toast.success('Реквизиты сохранены');
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось сохранить реквизиты'));
    } finally {
      this.saving.set(false);
    }
  }

  /** Синхронизация появится в задаче T6; сейчас только отчёт о состоянии. */
  protected async syncNow(): Promise<void> {
    if (this.syncing()) {
      return;
    }
    this.syncing.set(true);
    await this.online.ping();
    this.syncing.set(false);
    await this.toast.show(
      this.online.isOffline() ? 'Нет подключения к интернету' : 'Синхронизация появится позже',
      this.online.isOffline() ? 'warning' : 'dark',
    );
  }

  /** Выход: подтверждение, очистка локальной базы и возврат на онбординг. */
  protected async logout(): Promise<void> {
    const confirmed = await this.confirm.remove(
      'Удалить все данные?',
      'Журналы, записи и сотрудники будут стёрты с устройства без возможности восстановления.',
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.localData.wipe();
      this.session.reset();
      await this.router.navigateByUrl('/onboarding', { replaceUrl: true });
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось удалить данные'));
    }
  }
}

addIcons({ chevronForwardOutline, cloudDoneOutline, cloudOfflineOutline });
