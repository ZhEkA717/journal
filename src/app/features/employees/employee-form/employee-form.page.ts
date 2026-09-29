import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Форма сотрудника: ФИО, должность, дата приёма, инструктаж.
 * Реализация — T6 (TZ 8.6).
 */
@Component({
  selector: 'app-employee-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, RouterLink],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button routerLink="/employees">Отмена</ion-button>
        </ion-buttons>
        <ion-title>Новый сотрудник</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="p-screen-x py-between-sections text-body">
        <p class="text-small text-[var(--color-text-muted)]">
          Заглушка экрана. Содержимое появится в задаче T6.
        </p>
      </div>
    </ion-content>
  `,
})
export class EmployeeFormPage {}
