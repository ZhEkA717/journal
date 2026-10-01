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
  IonToolbar
} from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

import { DateService } from '../../../core/date/date.service';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { SignaturePadComponent } from '../../../shared/ui/signature-pad/signature-pad.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { errorMessage } from '../../../shared/utils/error.utils';
import { EmployeesStore } from '../../../stores/employees.store';

/**
 * Форма сотрудника: ФИО, должность, даты и эталонная подпись (ТЗ 8.6).
 * По маршруту `employees/new` создаёт карточку, `employees/:id/edit` — правит её.
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
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/employees" text="" />
        </ion-buttons>
        <ion-title class="text-h3 pl-4">{{
          isEditing() ? 'Сотрудник' : 'Новый сотрудник'
        }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="flex flex-col gap-between-sections p-screen-x py-between-sections">
        <app-form-field label="ФИО" [required]="true" [error]="errors()['fullName']">
          <ion-input
            class="field-control"
            [class.field-control-invalid]="errors()['fullName']"
            fill="outline"
            placeholder="Иванов Иван Иванович"
            [value]="fullName()"
            (ionInput)="onFullName($event)"
          />
        </app-form-field>

        <app-form-field label="Должность" [required]="true" [error]="errors()['position']">
          <ion-input
            class="field-control"
            [class.field-control-invalid]="errors()['position']"
            fill="outline"
            placeholder="Монтажник"
            [value]="position()"
            (ionInput)="onPosition($event)"
          />
        </app-form-field>

        <app-form-field label="Дата приёма" [required]="true" [error]="errors()['hiredAt']">
          <ion-datetime
            class="field-control"
            presentation="date"
            locale="ru"
            [value]="hiredAt() || null"
            (ionChange)="onHiredAt($event)"
          />
        </app-form-field>

        <app-form-field label="Дата рождения" hint="Необязательно">
          <ion-datetime
            class="field-control"
            presentation="date"
            locale="ru"
            [value]="birthDate() || null"
            (ionChange)="onBirthDate($event)"
          />
        </app-form-field>

        <app-form-field
          label="Подпись сотрудника"
          hint="Сохраняется в карточке и подставляется в записи журнала"
        >
          <app-signature-pad [signature]="signature()" (signatureChange)="onSignature($event)" />
        </app-form-field>

        @if (isEditing() && employee()?.firedAt) {
          <ion-button expand="block" color="medium" (click)="rehire()"
            >Вернуть на работу</ion-button
          >
        }

        <ion-button
          expand="block"
          class="h-13 text-body font-semibold"
          [disabled]="saving()"
          (click)="save()"
          color="primary"
        >
          {{ saving() ? 'Сохраняем…' : 'Сохранить' }}
        </ion-button>
      </div>
    </ion-content>
  `,
})
export class EmployeeFormPage {
  /** Сотрудники: сохранение через store, чтение — по идентификатору из маршрута. */
  protected readonly store = inject(EmployeesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
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
      await this.store.restore(this.employeeId);
      await this.toast.success('Сотрудник снова в штате');
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось вернуть сотрудника'));
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
