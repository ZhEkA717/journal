import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { AppComponent } from './app.component';
import { SessionStore } from './stores/session.store';

/** Пустые маршруты: тест проверяет только оболочку, без экранов. */
const testRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'journals' },
  { path: 'journals', children: [] },
  { path: 'journals/:id/entries/new', children: [] },
  { path: 'employees', children: [] },
  { path: 'reports', children: [] },
  { path: 'settings', children: [] },
];

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
});
