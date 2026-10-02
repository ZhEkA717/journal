import { Component, inject, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router, type Routes } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { AppComponent } from '../app.component';
import { routes as appRoutes } from '../app.routes';
import { SessionStore } from '../stores/session.store';

/** Страница-заглушка: печатает URL, который реально занял роутер. */
@Component({
  selector: 'app-routed-stub',
  template: '<div class="routed-page" [attr.data-url]="url"></div>',
})
class RoutedStubPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly url = `/${this.route.snapshot.url.map((segment) => segment.path).join('/')}`;
}

/** Реальные маршруты (ТЗ 8.1–8.7): ленивая страница заменяется заглушкой. */
const testRoutes: Routes = appRoutes.map((route) => {
  const { loadComponent, ...rest } = route;
  return loadComponent ? { ...rest, component: RoutedStubPage } : route;
});

const TAB_ROOTS = ['/journals', '/employees', '/reports', '/settings'];

/** Внутренние маршруты: корни вкладок, создание сущностей и их детальные страницы. */
const INTERNAL_URLS = [
  '/journals',
  '/journals/create',
  '/journals/1',
  '/journals/1/entries/new',
  '/journals/1/entries/42',
  '/employees',
  '/employees/new',
  '/employees/7/edit',
  '/reports',
  '/settings',
  '/onboarding',
];

const renderedUrls = (fixture: ComponentFixture<AppComponent>): string[] => {
  const root = fixture.nativeElement as HTMLElement;
  return Array.from(root.querySelectorAll('.routed-page')).map(
    (element) => element.getAttribute('data-url') ?? '',
  );
};

describe('AppComponent', () => {
  const session = {
    isReady: signal(true),
    isInitialized: signal(true),
    organizationId: signal('org-1'),
    load: () => Promise.resolve(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(testRoutes),
        provideIonicAngular(),
        { provide: SessionStore, useValue: session },
      ],
    }).compileComponents();
  });

  it('создаётся', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('рендерит четыре вкладки на корне вкладки', async () => {
    await TestBed.inject(Router).navigateByUrl('/journals');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('ion-tab-button').length).toBe(4);
  });

  it('скрывает панель вкладок вне корневых маршрутов', async () => {
    await TestBed.inject(Router).navigateByUrl('/journals/1/entries/new');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('ion-tab-bar').length).toBe(0);
  });

  it('переключает вкладку по клику', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/journals');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelectorAll('ion-tab-button')[1];
    button.dispatchEvent(
      new CustomEvent('ionTabButtonClick', {
        bubbles: true,
        detail: { tab: 'employees' },
      }),
    );
    await fixture.whenStable();

    expect(router.url).toBe('/employees');
  });

  it('держит единственный ion-router-outlet и одну ion-tabs на любом маршруте', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    for (const url of INTERNAL_URLS) {
      await router.navigateByUrl(url);
      fixture.detectChanges();

      const label = `маршрут ${url}`;
      expect(fixture.nativeElement.querySelectorAll('ion-tabs').length, label).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('ion-router-outlet').length, label).toBe(1);
    }
  });

  it('открывает каждый внутренний маршрут: корни вкладок, создание и детальные страницы', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    for (const url of INTERNAL_URLS) {
      await router.navigateByUrl(url);
      fixture.detectChanges();

      const label = `маршрут ${url}`;
      expect(renderedUrls(fixture), label).toContain(url);
      expect(fixture.nativeElement.querySelectorAll('ion-tab-bar').length, label).toBe(
        TAB_ROOTS.includes(url) ? 1 : 0,
      );
    }
  });

  it('возвращает на корень вкладки после ухода в детальную страницу', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    await router.navigateByUrl('/journals');
    fixture.detectChanges();
    expect(renderedUrls(fixture)).toContain('/journals');

    await router.navigateByUrl('/journals/1');
    fixture.detectChanges();
    expect(renderedUrls(fixture)).toContain('/journals/1');

    await router.navigateByUrl('/journals');
    fixture.detectChanges();

    expect(renderedUrls(fixture)).toContain('/journals');
    expect(fixture.nativeElement.querySelectorAll('ion-tab-bar').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('ion-router-outlet').length).toBe(1);
  });
});
