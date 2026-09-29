import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { RouterLink } from '@angular/router';

/**
 * Список журналов с поиском, фильтром по типу и сортировкой.
 * Реализация — T4 (TZ 8.2).
 */
@Component({
  selector: 'app-journals-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, RouterLink],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Журналы</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/journals/create">Создать</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <div class="p-screen-x py-between-sections text-body">
        <p class="text-small text-[var(--color-text-muted)]">
          Заглушка экрана. Содержимое появится в задаче T4.
        </p>
      </div>
    </ion-content>
  `,
})
export class JournalsListPage {}
