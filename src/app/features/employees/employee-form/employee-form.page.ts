import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  type DatetimeCustomEvent,
  type InputCustomEvent,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

import { DateService } from '../../../core/date/date.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { SignaturePadComponent } from '../../../shared/ui/signature-pad/signature-pad.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { errorMessage } from '../../../shared/utils/error.utils';
import { EmployeesStore } from '../../../stores/employees.store';

/**
 * Форма сотрудника: ФИО, должность, даты и эталонная подпись (ТЗ 8.6).
 * По маршруту `employees/new` создаёт карточку, `employees/:id/edit` — правит её;
 * оттуда же увольняют и возвращают в штат (ТЗ 14: CRUD).
 */
@Component({
  selector: 'app-employee-form',
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
    FormFieldComponent,
    SignaturePadComponent,
  ],
  templateUrl: './employee-form.page.html',
})
export class EmployeeFormPage {
  /** Сотрудники: сохранение через store, чтение — по идентификатору из маршрута. */
  protected readonly store = inject(EmployeesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly date = inject(DateService);

  private readonly employeeId = this.route.snapshot.paramMap.get('id') ?? '';

  /** ФИО сотрудника. */
  protected readonly fullName = signal('');
  /** Должность. */
  protected readonly position = signal('');
  /** Дата приёма; по умолчанию — сегодня (ТЗ 8.6). */
  protected readonly hiredAt = signal(this.date.today());
  /** Дата рождения. */
  protected readonly birthDate = signal('');
  /** Эталонная подпись в base64 PNG. */
  protected readonly signature = signal('');
  /** Ошибки полей формы. */
  protected readonly errors = signal<Record<string, string>>({});
  /** Идёт сохранение. */
  protected readonly saving = signal(false);

  constructor() {
    void this.init();
  }

  /** Редактируется ли существующий сотрудник. */
  protected readonly isEditing = signal(this.employeeId.length > 0);
  /** Загруженный сотрудник. */
  protected readonly employee = signal(this.store.byId().get(this.employeeId));

  protected onFullName(event: InputCustomEvent): void {
    this.fullName.set(event.detail.value ?? '');
    this.clearError('fullName');
  }

  protected onPosition(event: InputCustomEvent): void {
    this.position.set(event.detail.value ?? '');
    this.clearError('position');
  }

  protected onHiredAt(event: DatetimeCustomEvent): void {
    this.hiredAt.set(normalizeDate(event.detail.value) ?? '');
    this.clearError('hiredAt');
  }

  protected onBirthDate(event: DatetimeCustomEvent): void {
    this.birthDate.set(normalizeDate(event.detail.value) ?? '');
  }

  protected onSignature(signature: string): void {
    this.signature.set(signature);
  }

  /** Сохраняет карточку сотрудника. */
  protected async save(): Promise<void> {
    if (this.saving()) {
      return;
    }
    const draft = {
      fullName: this.fullName(),
      position: this.position(),
      hiredAt: this.hiredAt(),
      birthDate: this.birthDate() || undefined,
      signature: this.signature() || undefined,
    };
    const errors = this.store.validate(draft);
    this.errors.set({ ...errors });
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.saving.set(true);
    try {
      if (this.employeeId.length > 0) {
        await this.store.update(this.employeeId, draft);
      } else {
        await this.store.create(draft);
      }
      await this.toast.success('Сотрудник сохранён');
      await this.router.navigateByUrl('/employees', { replaceUrl: true });
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось сохранить сотрудника'));
    } finally {
      this.saving.set(false);
    }
  }

  /** Снимает отметку об увольнении. */
  protected async rehire(): Promise<void> {
    try {
      const employee = await this.store.restore(this.employeeId);
      this.employee.set(employee);
      await this.toast.success('Сотрудник снова в штате');
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось вернуть сотрудника'));
    }
  }

  /** Помечает сотрудника уволенным: он остаётся в записях журнала (ТЗ 8.6). */
  protected async fire(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Уволить сотрудника?',
      message: 'Он останется в прошлых записях, но исчезнет из списка для новых.',
      confirmText: 'Уволить',
    });
    if (!confirmed) {
      return;
    }
    try {
      const employee = await this.store.fire(this.employeeId);
      this.employee.set(employee);
      await this.toast.success('Сотрудник уволен');
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось уволить сотрудника'));
    }
  }

  private async init(): Promise<void> {
    if (this.employeeId.length === 0) {
      return;
    }
    await this.store.load();
    const employee = this.store.byId().get(this.employeeId);
    this.employee.set(employee);
    if (!employee) {
      return;
    }
    this.fullName.set(employee.fullName);
    this.position.set(employee.position);
    this.hiredAt.set(employee.hiredAt);
    this.birthDate.set(employee.birthDate ?? '');
    this.signature.set(employee.signature ?? '');
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
