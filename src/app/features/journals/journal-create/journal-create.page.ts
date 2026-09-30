import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonTitle,
  IonToolbar,
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
    IonIcon,
    IonInput,
    FormFieldComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/journals" text="" />
        </ion-buttons>
        <ion-title class="text-h2 pl-4">Новый журнал</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="flex flex-col gap-between-sections p-screen-x py-between-sections">
        <section>
          <h2
            class="mb-between-cards text-tiny font-semibold tracking-wide text-[var(--color-text-muted)] uppercase"
          >
            Тип журнала
          </h2>
          <div class="grid grid-cols-2 gap-between-cards">
            @for (template of store.templates(); track template.id) {
              <button
                type="button"
                class="relative flex h-25 flex-col items-center justify-center gap-2 rounded-card border-2 p-4"
                [style.background]="
                  template.id === selectedTemplateId()
                    ? softBackground(template.color)
                    : 'var(--color-surface)'
                "
                [style.border-color]="
                  template.id === selectedTemplateId() ? template.color : 'var(--color-border)'
                "
                [attr.aria-pressed]="template.id === selectedTemplateId()"
                (click)="selectTemplate(template)"
              >
                @if (template.id === selectedTemplateId()) {
                  <span
                    class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                    [style.background]="template.color"
                  >
                    <ion-icon [name]="checkIcon" class="text-xs text-white" aria-hidden="true" />
                  </span>
                }
                <ion-icon
                  [name]="template.iconName"
                  class="text-2xl"
                  [style.color]="
                    template.id === selectedTemplateId()
                      ? template.color
                      : 'var(--color-text-muted)'
                  "
                  aria-hidden="true"
                />
                <span
                  class="text-small text-center leading-snug font-medium text-[var(--color-text)]"
                >
                  {{ template.name }}
                </span>
              </button>
            }
          </div>
          @if (errors()['templateId']; as message) {
            <p class="mt-2 text-tiny text-[var(--color-danger)]" role="alert">{{ message }}</p>
          }
        </section>

        <app-form-field label="Название журнала" [required]="true" [error]="errors()['title']">
          <ion-input
            class="field-control"
            [class.field-control-invalid]="errors()['title']"
            fill="outline"
            placeholder="Введите название"
            [value]="title()"
            (ionInput)="onTitle($event)"
          />
        </app-form-field>

        <app-form-field
          label="Ответственный"
          [required]="true"
          [error]="errors()['responsiblePerson']"
        >
          <ion-input
            class="field-control"
            [class.field-control-invalid]="errors()['responsiblePerson']"
            fill="outline"
            placeholder="Иванов И.И."
            [value]="responsiblePerson()"
            (ionInput)="onResponsible($event)"
          />
        </app-form-field>

        <app-form-field label="Дата начала" [required]="true" [error]="errors()['startedAt']">
          <ion-input
            class="field-control"
            [class.field-control-invalid]="errors()['startedAt']"
            fill="outline"
            type="date"
            [value]="startedAt()"
            (ionInput)="onStartedAt($event)"
          />
        </app-form-field>

        <ion-button
          expand="block"
          class="h-13 text-body font-semibold"
          [disabled]="saving()"
          (click)="create()"
        >
          {{ saving() ? 'Создаём…' : 'Создать журнал' }}
        </ion-button>
      </div>
    </ion-content>
  `,
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

  protected onStartedAt(event: InputCustomEvent): void {
    this.startedAt.set(event.detail.value ?? '');
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
