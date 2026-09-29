import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Список сотрудников с карточками и историей инструктажей.
 * Реализация — T6 (TZ 8.6).
 */
@Component({
  selector: 'app-employees-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, RouterLink],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Сотрудники</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/employees/new">Создать</ion-button>
        </ion-buttons>
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
export class EmployeesListPage {}
