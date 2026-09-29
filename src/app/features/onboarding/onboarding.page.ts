import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonButton, IonContent, IonIcon, IonInput } from '@ionic/angular';
import { Router } from '@angular/router';
import type { InputCustomEvent } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookOutline, lockClosedOutline } from 'ionicons/icons';

import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { errorMessage } from '../../shared/utils/error.utils';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { SessionStore } from '../../stores/session.store';

/**
 * Онбординг: название организации и ответственный за ведение (ТЗ 8.1).
 * Данные уходят в IndexedDB и только потом в очередь синхронизации.
 */
@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent, IonButton, IonIcon, IonInput, FormFieldComponent],
  template: `
    <ion-content [fullscreen]="true" class="bg-[var(--color-bg)]">
      <div class="flex min-h-full flex-col justify-between">
        <div class="flex flex-1 flex-col items-center justify-center gap-between-cards">
          <div
            class="flex h-24 w-24 items-center justify-center rounded-modal bg-[var(--ion-color-primary)]"
          >
            <ion-icon [name]="bookIcon" class="text-6xl text-white" aria-hidden="true" />
          </div>
          <div class="px-screen-x text-center">
            <h1 class="text-h1 text-[var(--color-text)]">Журналы</h1>
            <p class="mt-2 text-body text-[var(--color-text-muted)]">
              Все журналы учёта в одном месте. Работает без интернета.
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-between-cards px-screen-x pb-between-sections">
          <app-form-field
            label="Название организации"
            [required]="true"
            [error]="errors()['name']"
            [hint]="'Например, ООО «Ромашка»'"
          >
            <ion-input
              class="field-control"
              [class.field-control-invalid]="errors()['name']"
              fill="outline"
              labelPlacement="stacked"
              placeholder="ООО «Ромашка»"
              [value]="name()"
              (ionInput)="onName($event)"
              (ionBlur)="submitIfValid()"
            />
          </app-form-field>

          <app-form-field
            label="Ответственный за ведение"
            [required]="true"
            [error]="errors()['responsiblePerson']"
            hint="Иванов И.И."
          >
            <ion-input
              class="field-control"
              [class.field-control-invalid]="errors()['responsiblePerson']"
              fill="outline"
              labelPlacement="stacked"
              placeholder="Иванов И.И."
              [value]="responsiblePerson()"
              (ionInput)="onResponsible($event)"
              (ionBlur)="submitIfValid()"
            />
          </app-form-field>

          <ion-button
            expand="block"
            color="secondary"
            class="h-13 text-body font-semibold"
            [disabled]="saving()"
            (click)="start()"
          >
            {{ saving() ? 'Сохраняем…' : 'Начать работу' }}
          </ion-button>

          <p
            class="flex items-center justify-center gap-1.5 text-tiny text-[var(--color-text-muted)]"
          >
            <ion-icon [name]="lockIcon" class="text-sm" aria-hidden="true" />
            Данные хранятся только на вашем устройстве
          </p>
        </div>
      </div>
    </ion-content>
  `,
})
export class OnboardingPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Название организации. */
  protected readonly name = signal('');
  /** ФИО ответственного. */
  protected readonly responsiblePerson = signal('');
  /** Идёт сохранение. */
  protected readonly saving = signal(false);
  /** Ошибки полей после попытки сохранить. */
  protected readonly errors = signal<Record<string, string>>({});

  /** Кнопка активна, только когда оба поля заполнены. */
  protected readonly canSubmit = computed(
    () => this.name().trim().length > 0 && this.responsiblePerson().trim().length > 0,
  );

  protected readonly bookIcon = 'book-outline';
  protected readonly lockIcon = 'lock-closed-outline';

  protected onName(event: InputCustomEvent): void {
    this.name.set(event.detail.value ?? '');
    this.clearError('name');
  }

  protected onResponsible(event: InputCustomEvent): void {
    this.responsiblePerson.set(event.detail.value ?? '');
    this.clearError('responsiblePerson');
  }

  /** Создаёт организацию и открывает список журналов. */
  protected async start(): Promise<void> {
    if (this.saving()) {
      return;
    }
    const draft = {
      name: this.name(),
      responsiblePerson: this.responsiblePerson(),
    };
    const errors = this.session.validate(draft);
    this.errors.set({ ...errors });
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.saving.set(true);
    try {
      await this.session.setup(draft);
      await this.router.navigateByUrl('/journals', { replaceUrl: true });
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось сохранить организацию'));
    } finally {
      this.saving.set(false);
    }
  }

  /** Начать работу по Enter, если поля уже заполнены. */
  protected async submitIfValid(): Promise<void> {
    if (this.canSubmit() && Object.keys(this.errors()).length === 0) {
      await this.start();
    }
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

addIcons({ bookOutline, lockClosedOutline });
