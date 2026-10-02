import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonInput,
  IonTitle,
  IonToolbar,
  type DatetimeCustomEvent,
  type InputCustomEvent,
} from '@ionic/angular';
import { Router } from '@angular/router';

import type { JournalTemplate } from '../../../domain/journals/journal-template.model';
import { DateService } from '../../../core/date/date.service';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { errorMessage } from '../../../shared/utils/error.utils';
import { JournalsStore } from '../../../stores/journals.store';
import { SessionStore } from '../../../stores/session.store';

/**
 * Создание журнала: выбор типа из системных шаблонов, название, ответственный
 * и дата начала (ТЗ 8.3).
 */
@Component({
  selector: 'app-journal-create',
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
    IonIcon,
    IonInput,
    FormFieldComponent,
  ],
  templateUrl: './journal-create.page.html',
})
export class JournalCreatePage {
  protected readonly store = inject(JournalsStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly date = inject(DateService);

  /** Выбранный шаблон журнала. */
  protected readonly selectedTemplateId = signal('');
  /** Название журнала. */
  protected readonly title = signal('');
  /** ФИО ответственного. */
  protected readonly responsiblePerson = signal('');
  /** Дата начала ведения. */
  protected readonly startedAt = signal(this.date.today());
  /** Идёт сохранение. */
  protected readonly saving = signal(false);
  /** Ошибки полей формы. */
  protected readonly errors = signal<Record<string, string>>({});

  /** Кнопка активна, когда выбран тип и заполнено название. */
  protected readonly canSubmit = computed(
    () => this.selectedTemplateId().length > 0 && this.title().trim().length > 0,
  );

  protected readonly checkIcon = 'checkmark-outline';

  constructor() {
    this.responsiblePerson.set(this.session.organization()?.responsiblePerson ?? '');
    void this.ensureTemplates();
  }

  /** Выбирает тип журнала и подставляет его название. */
  protected selectTemplate(template: JournalTemplate): void {
    this.selectedTemplateId.set(template.id);
    this.title.set(template.name);
    this.clearError('templateId');
    this.clearError('title');
  }

  /** Едва заметная подложка фирменного цвета шаблона. */
  protected softBackground(color: string): string {
    return `color-mix(in srgb, ${color} 8%, transparent)`;
  }

  protected onTitle(event: InputCustomEvent): void {
    this.title.set(event.detail.value ?? '');
    this.clearError('title');
  }

  protected onResponsible(event: InputCustomEvent): void {
    this.responsiblePerson.set(event.detail.value ?? '');
    this.clearError('responsiblePerson');
  }

  protected onStartedAt(event: DatetimeCustomEvent): void {
    this.startedAt.set(normalizeDate(event.detail.value) ?? '');
    this.clearError('startedAt');
  }

  /** Создаёт журнал и открывает его. */
  protected async create(): Promise<void> {
    if (this.saving()) {
      return;
    }
    const draft = {
      templateId: this.selectedTemplateId(),
      title: this.title(),
      responsiblePerson: this.responsiblePerson(),
      startedAt: this.startedAt(),
    };
    const errors = this.store.validate(draft);
    this.errors.set({ ...errors });
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.saving.set(true);
    try {
      const journal = await this.store.create(draft);
      await this.toast.success('Журнал создан');
      await this.router.navigate(['/journals', journal.id], { replaceUrl: true });
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось создать журнал'));
    } finally {
      this.saving.set(false);
    }
  }

  private async ensureTemplates(): Promise<void> {
    if (this.store.templates().length > 0) {
      return;
    }
    await this.store.load();
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
