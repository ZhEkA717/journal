import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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

import { DateService } from '../../core/date/date.service';
import { AuthService } from '../../core/auth/auth.service';
import { LocalDataService } from '../../core/storage/local-data.service';
import { OnlineStatusService } from '../../core/sync/online-status.service';
import { SyncQueueService } from '../../core/sync/sync-queue.service';
import { SyncService } from '../../core/sync/sync.service';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { errorMessage } from '../../shared/utils/error.utils';
import { SessionStore } from '../../stores/session.store';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, cloudDoneOutline, cloudOfflineOutline } from 'ionicons/icons';

/** Версия приложения из `package.json` (ТЗ 8.7). */
const APP_VERSION = '0.0.0';

/** Простая проверка email перед отправкой в Supabase (ТЗ 9.4). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  private readonly sync = inject(SyncService);
  private readonly date = inject(DateService);
  private readonly localData = inject(LocalDataService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

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
  /** Человекочитаемое время последней синхронизации (ТЗ 8.7). */
  protected readonly lastSyncText = computed(() => {
    const timestamp = this.sync.lastSyncAt();
    return timestamp === null ? 'Ещё не выполнялась' : this.date.humanize(timestamp);
  });
  /** Версия приложения. */
  protected readonly version = APP_VERSION;

  /** Привязанный email аккаунта Supabase (ТЗ 9.4). */
  protected readonly accountEmail = computed(() => this.auth.currentUser()?.email ?? null);
  /** Открыта ли форма привязки email. */
  protected readonly emailEditing = signal(false);
  /** Значение поля email. */
  protected readonly email = signal('');
  /** Ошибка поля email. */
  protected readonly emailError = signal('');
  /** Идёт отправка кода/ссылки. */
  protected readonly linking = signal(false);

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

  /** Ручная синхронизация: полный цикл отправки и приёма (ТЗ 8.7, 9.2). */
  protected async syncNow(): Promise<void> {
    if (this.syncing()) {
      return;
    }
    this.syncing.set(true);
    try {
      const summary = await this.sync.syncAll();
      if (summary.pushed === 0 && summary.pulled === 0) {
        await this.toast.show('Нет изменений для синхронизации', 'dark');
      } else {
        await this.toast.success(
          `Синхронизировано: отправлено ${summary.pushed}, получено ${summary.pulled}`,
        );
      }
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Синхронизация не удалась'));
    } finally {
      this.syncing.set(false);
    }
  }

  /** Открывает/закрывает форму привязки email (ТЗ 9.4). */
  protected toggleEmailEdit(): void {
    this.emailEditing.update((open) => !open);
    this.emailError.set('');
  }

  protected onEmail(event: InputCustomEvent): void {
    this.email.set(event.detail.value ?? '');
    this.emailError.set('');
  }

  /**
   * Привязывает email к текущей (анонимной) сессии: Supabase отправит код
   * подтверждения — после него с этого email можно входить на других
   * устройствах (ТЗ 9.4, критерий ТЗ 14 о смене устройства).
   */
  protected async linkEmail(): Promise<void> {
    await this.withEmail(async (value) => {
      await this.auth.linkAnonymousToEmail(value);
      await this.toast.success('Код подтверждения отправлен на почту');
      this.emailEditing.set(false);
    }, 'Не удалось привязать email');
  }

  /** Отправляет ссылку входа на email — для входа на другом устройстве (ТЗ 9.4). */
  protected async sendSignInLink(): Promise<void> {
    await this.withEmail(async (value) => {
      await this.auth.signInWithEmail(value);
      await this.toast.success('Ссылка для входа отправлена на почту');
      this.emailEditing.set(false);
    }, 'Не удалось отправить ссылку входа');
  }

  /** Общая обёртка: валидация email, флаг `linking` и тост ошибки. */
  private async withEmail(
    action: (value: string) => Promise<void>,
    fallback: string,
  ): Promise<void> {
    if (this.linking()) {
      return;
    }
    const value = this.email().trim();
    if (!EMAIL_PATTERN.test(value)) {
      this.emailError.set('Укажите корректный email');
      return;
    }
    this.linking.set(true);
    try {
      await action(value);
    } catch (error) {
      await this.toast.error(errorMessage(error, fallback));
    } finally {
      this.linking.set(false);
    }
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
    // Отложено к T6 (см. AGENTS.md): wipe чистит только локальную БД — если не
    // завершить сессию Supabase, pull воскресит удалённые данные из облака.
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
