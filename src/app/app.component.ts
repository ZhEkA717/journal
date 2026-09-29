import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { barChartOutline, listOutline, peopleOutline, settingsOutline } from 'ionicons/icons';

import { APP_TABS } from './app.routes';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonApp, IonTabs, IonTabBar, IonTabButton, IonLabel, IonIcon, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-tabs>
        <ion-tab-bar slot="bottom">
          @for (tab of tabs; track tab.id) {
            <ion-tab-button [tab]="tab.id" [href]="tab.href">
              <ion-icon [name]="tab.icon" aria-hidden="true" />
              <ion-label>{{ tab.label }}</ion-label>
            </ion-tab-button>
          }
        </ion-tab-bar>
        <ion-router-outlet />
      </ion-tabs>
    </ion-app>
  `,
  styles: `
    ion-tab-bar {
      --border: 1px solid var(--color-border, #e5e7eb);
    }
  `,
})
export class AppComponent {
  protected readonly tabs = APP_TABS;
}

addIcons({ barChartOutline, listOutline, peopleOutline, settingsOutline });
