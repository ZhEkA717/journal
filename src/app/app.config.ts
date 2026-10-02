import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withComponentInputBinding,
  withNavigationErrorHandler,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withComponentInputBinding(),
      withNavigationErrorHandler((error) => console.error('Navigation error:', error)),
    ),
    // Required for the Angular router to drive Ionic transitions (TZ 4, 12.2).
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // `swipeBackEnabled` в `mode: 'md'` выключен по умолчанию — включаем явно.
    // При свайпе жест водит штатную транзицию сам, а после pop() Ionic играл её же
    // повторно (вниз + fade) — двойная анимация; `navAnimation` гасит только повтор.
    provideIonicAngular({
      mode: 'ios',
    }),
    provideHttpClient(withFetch()),
  ],
};
