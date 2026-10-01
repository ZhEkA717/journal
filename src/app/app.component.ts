import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { IonApp, IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { filter, map } from 'rxjs';

import { APP_TABS } from './app.routes';
import { SessionStore } from './stores/session.store';

/** Кнопка вкладки: `ion-tab-button` проксирует клик как обычный `Event`. */
interface TabButtonElement extends HTMLElement {
  readonly tab?: string;
}

/**
 * Оболочка приложения: `IonApp`, единственный `ion-router-outlet` и нижняя панель
 * вкладок (ТЗ 8.2). Панель показывается только на корневых маршрутах вкладок, поэтому
 * экраны журнала, формы и настройки открываются на всю высоту.
 *
 * Единственный аутлет роутера живёт внутри `ion-tabs` и рендерится всегда, пока
 * сессия готова. Раньше здесь был и корневой `<ion-router-outlet />`, и аутлет
 * внутри `ion-tabs`: оба регистрируются в корневом `ChildrenOutletContexts` под
 * одним именем `PRIMARY_OUTLET`, последний перетирает `context.outlet`, а при
 * уничтожении `ion-tabs` Ionic не вызывает `onChildOutletDestroyed` — контекст
 * продолжает указывать на мёртвый аутлет, роутер пишет в него, и URL меняется,
 * а экран остаётся прежним до перезагрузки.
 *
 * `ion-tabs` не участвует в навигации: Ionic 9 строит корневой URL вкладки как
 * `tabsPrefix + '/' + tab`, а для вкладок в корне роутера `tabsPrefix` равен `/`,
 * что даёт `//<tab>`. Поэтому клик по вкладке обрабатывается здесь, а всплытие
 * `ionTabButtonClick` глушится в `onTabClick`.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IonApp, IonTabs, IonTabBar, IonTabButton, IonLabel, IonIcon],
  template: `
    <ion-app>
      @if (session.isReady()) {
        <ion-tabs>
          @if (activeTab(); as tab) {
            <ion-tab-bar
              slot="bottom"
              [selectedTab]="tab.id"
              (click)="onTabClick($event)"
            >
              @for (item of tabs; track item.id) {
                <ion-tab-button [tab]="item.id" [href]="item.href">
                  <ion-icon [name]="item.icon" aria-hidden="true" />
                  <ion-label>{{ item.label }}</ion-label>
                </ion-tab-button>
              }
            </ion-tab-bar>
          }
        </ion-tabs>
      }
    </ion-app>
  `,
  styles: `
    ion-tab-bar {
      --border: none;
      /* Высота панели вкладок задаётся токеном: на неё опирается app-fab. */
      height: var(--tab-bar-safe-height);
      box-shadow: 0 -1px 3px rgb(15 23 42 / 8%);
    }
  `,
})
export class AppComponent {
  protected readonly tabs = APP_TABS;
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Активная вкладка, если текущий маршрут — корень одной из вкладок. */
  protected readonly activeTab = computed(() => {
    const path = cleanPath(this.url());
    return APP_TABS.find((tab) => tab.href === path);
  });

  constructor() {
    afterNextRender(() => void this.bootstrap());
  }

  /**
   * Переключение вкладки: заменяем текущий маршрут, чтобы не плодить историю.
   *
   * Всплытие глушится обязательно: иначе `IonTabs.select()` построит
   * `tabsPrefix + '/' + tab` (`//<tab>`) и вторым navigate затрёт наш переход.
   */
  protected onTabClick(event: Event): void {
    event.stopPropagation();
    const tabId = (event.target as TabButtonElement).tab;
    const target = APP_TABS.find((tab) => tab.id === tabId);
    if (target && target.href !== this.router.url) {
      void this.router.navigateByUrl(target.href, { replaceUrl: true });
    }
  }

  /** Первый запуск приложения: читаем организацию и решаем, куда открыть (ТЗ 8.1). */
  private async bootstrap(): Promise<void> {
    try {
      await this.session.load();
    } finally {
      await this.redirectToProperRoot();
    }
  }

  private async redirectToProperRoot(): Promise<void> {
    const onOnboarding = this.router.url.startsWith('/onboarding');
    if (!this.session.isInitialized() && !onOnboarding) {
      await this.router.navigateByUrl('/onboarding', { replaceUrl: true });
    } else if (this.session.isInitialized() && onOnboarding) {
      await this.router.navigateByUrl('/journals', { replaceUrl: true });
    }
  }
}

function cleanPath(url: string): string {
  return `/${url.split(/[?#]/)[0].split('/').filter(Boolean).join('/')}`;
}
