import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  type DatetimeCustomEvent,
  type InputCustomEvent,
  type SelectCustomEvent,
  type TextareaCustomEvent,
} from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

import { DateService } from '../../../core/date/date.service';
import { NativeService } from '../../../core/native/native.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { SignaturePadComponent } from '../../../shared/ui/signature-pad/signature-pad.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { errorMessage } from '../../../shared/utils/error.utils';
import { JournalDetailStore } from '../../../stores/journal-detail.store';

/** Колонки, значения которых сервис подставляет из карточки сотрудника (ТЗ 9.3). */
const DERIVED_KEYS: readonly string[] = ['employee', 'position'];

/**
 * Динамическая форма записи: поля строятся по колонкам шаблона журнала (ТЗ 8.5).
 * Один и тот же экран редактирует существующую запись (`entries/:entryId`).
 */
@Component({
  selector: 'app-entry-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonContent,
    IonDatetime,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTextarea,
    FormFieldComponent,
    EmptyStateComponent,
    SignaturePadComponent,
  ],
  templateUrl: './entry-form.page.html',
})
export class EntryFormPage {
  /** Данные журнала, шаблон и сотрудники. */
  protected readonly store = inject(JournalDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly date = inject(DateService);
  private readonly native = inject(NativeService);

  private readonly journalId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly entryId = this.route.snapshot.paramMap.get('entryId') ?? '';

  /** Выбранный сотрудник. */
  protected readonly employeeId = signal('');
  /** Значения полей по ключам колонок шаблона. */
  protected readonly data = signal<Record<string, string | number | null>>({});
  /** Ошибки полей после попытки сохранить. */
  protected readonly errors = signal<Record<string, string>>({});
  /** Идёт сохранение. */
  protected readonly saving = signal(false);

  /** Редактируется ли существующая запись. */
  protected readonly isEditing = this.entryId.length > 0;
  /** Куда возвращаться по кнопке «назад». */
  protected readonly backHref = `/journals/${this.journalId}`;
  /** Поля формы: колонки шаблона без ФИО и должности. */
  protected readonly fields = computed(() =>
    this.store.columns().filter((column) => !DERIVED_KEYS.includes(column.key)),
  );

  constructor() {
    void this.init();
  }

  /** Текущее значение поля как строка (для `ion-input` и поля подписи). */
  protected stringValue(key: string): string {
    const value = this.data()[key];
    return value === null || value === undefined ? '' : String(value);
  }

  protected onEmployee(event: SelectCustomEvent): void {
    this.employeeId.set(String(event.detail.value ?? ''));
    this.clearError('employeeId');
  }

  protected onText(key: string, event: InputCustomEvent): void {
    this.setValue(key, event.detail.value ?? '');
  }

  protected onTextArea(key: string, event: TextareaCustomEvent): void {
    this.setValue(key, event.detail.value ?? '');
  }

  protected onNumber(key: string, event: InputCustomEvent): void {
    const raw = event.detail.value?.toString().trim() ?? '';
    this.setValue(key, raw.length === 0 ? null : Number(raw));
  }

  protected onSelect(key: string, event: SelectCustomEvent): void {
    this.setValue(key, event.detail.value === undefined ? null : String(event.detail.value));
  }

  protected onDate(key: string, event: DatetimeCustomEvent): void {
    this.setValue(key, normalizeDate(event.detail.value));
  }

  protected onSignature(key: string, signature: string): void {
    this.setValue(key, signature.length === 0 ? null : signature);
  }

  /** Сохраняет запись: создаёт новую или обновляет существующую (ТЗ 8.5). */
  protected async save(): Promise<void> {
    if (this.saving()) {
      return;
    }
    const employeeId = this.employeeId();
    if (employeeId.length === 0) {
      this.errors.set({ ...this.errors(), employeeId: 'Выберите сотрудника' });
      return;
    }
    const payload = this.data();
    const errors = this.store.validate(payload);
    this.errors.set({ ...errors });
    if (Object.keys(errors).length > 0) {
      await this.toast.error('Проверьте заполнение полей');
      return;
    }

    this.saving.set(true);
    try {
      if (this.isEditing) {
        await this.store.updateEntry(this.entryId, payload);
      } else {
        await this.store.addEntry({ journalId: this.journalId, employeeId, data: payload });
      }
      // Haptic feedback после сохранения (ТЗ 8.5.3).
      await this.native.impact();
      await this.toast.success('Запись сохранена');
      await this.router.navigateByUrl(this.backHref, { replaceUrl: true });
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось сохранить запись'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async backToList(): Promise<void> {
    await this.router.navigateByUrl('/journals', { replaceUrl: true });
  }

  private async init(): Promise<void> {
    await this.store.load(this.journalId);
    const entry = this.entryId
      ? this.store.entries().find((item) => item.id === this.entryId)
      : undefined;
    if (entry) {
      this.employeeId.set(entry.employeeId);
      this.data.set({ ...entry.data });
      return;
    }
    // Новая запись: дата по умолчанию — сегодня (ТЗ 8.5).
    const dateKey = this.store.dateColumn()?.key;
    this.data.set(dateKey ? { [dateKey]: this.date.today() } : {});
  }

  private setValue(key: string, value: string | number | null): void {
    this.data.update((current) => ({ ...current, [key]: value }));
    this.clearError(key);
  }

  private clearError(field: string): void {
    if (this.errors()[field] === undefined) {
      return;
    }
    const next = { ...this.errors() };
    delete next[field];
    this.errors.set(next);
  }
}

/** `ion-datetime` отдаёт ISO-дату; в модель кладём `YYYY-MM-DD` (ТЗ 5.1). */
function normalizeDate(value: string | string[] | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  return value.slice(0, 10);
}
