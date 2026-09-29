import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Создание журнала: название, тип, организация, шаблон.
 * Реализация — T5 (TZ 8.3).
 */
@Component({
  selector: 'app-journal-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, RouterLink],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button routerLink="/journals">Отмена</ion-button>
        </ion-buttons>
        <ion-title>Новый журнал</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="p-screen-x py-between-sections text-body">
        <p class="text-small text-[var(--color-text-muted)]">
          Заглушка экрана. Содержимое появится в задаче T5.
        </p>
      </div>
    </ion-content>
  `,
})
export class JournalCreatePage {}
