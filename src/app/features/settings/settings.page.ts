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
  templateUrl: './settings.page.html',
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
