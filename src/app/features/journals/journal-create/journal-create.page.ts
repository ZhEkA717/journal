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
import { Router, ActivatedRoute } from '@angular/router';

import type { JournalTemplate } from '../../../domain/journals/journal-template.model';
import { DateService } from '../../../core/date/date.service';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { errorMessage } from '../../../shared/utils/error.utils';
import { JournalsStore } from '../../../stores/journals.store';
import { SessionStore } from '../../../stores/session.store';

/**
 * Создание журнала: выбор типа из системных шаблонов, название, ответственный
 * и дата начала (ТЗ 8.3). При наличии `:id` в маршруте — редактирование
 * существующего журнала (критерий ТЗ 14), тип при этом не меняется.
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
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly date = inject(DateService);

  /** Редактирование существующего журнала, если в маршруте есть `:id`. */
  protected readonly journalId = this.route.snapshot.paramMap.get('id');
  protected readonly editMode = this.journalId !== null;

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
    if (this.editMode) {
      void this.loadJournal();
    } else {
      void this.ensureTemplates();
    }
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

  /** Создаёт или сохраняет журнал и открывает его. */
  protected async save(): Promise<void> {
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
      if (this.editMode) {
        const journal = await this.store.update(this.journalId!, draft);
        await this.toast.success('Журнал сохранён');
        await this.router.navigate(['/journals', journal.id]);
      } else {
        const journal = await this.store.create(draft);
        await this.toast.success('Журнал создан');
        await this.router.navigate(['/journals', journal.id], { replaceUrl: true });
      }
    } catch (error) {
      await this.toast.error(
        errorMessage(
          error,
          this.editMode ? 'Не удалось сохранить журнал' : 'Не удалось создать журнал',
        ),
      );
    } finally {
      this.saving.set(false);
    }
  }

  /** Загружает журнал и заполняет форму в режиме редактирования. */
  private async loadJournal(): Promise<void> {
    try {
      const journal = await this.store.get(this.journalId!);
      if (!journal) {
        await this.toast.error('Журнал не найден');
        await this.router.navigateByUrl('/journals', { replaceUrl: true });
        return;
      }
      this.selectedTemplateId.set(journal.templateId);
      this.title.set(journal.title);
      this.responsiblePerson.set(journal.responsiblePerson);
      this.startedAt.set(journal.startedAt);
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось загрузить журнал'));
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
