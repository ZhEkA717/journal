import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
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
import { SupabaseClient } from '@supabase/supabase-js';

import { routes } from './app.routes';
import { SyncService } from './core/sync/sync.service';
import { createSupabaseClient } from './core/supabase/supabase.client';

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
    // Клиент Supabase (ТЗ 11): `null`, пока в environment не заполнены ключи.
    { provide: SupabaseClient, useFactory: createSupabaseClient },
    // Создаёт SyncService при старте: на нём живут effects авто-синхронизации
    // (ТЗ 9.2), а без инъекции сервис бы никогда не инициализировался.
    provideAppInitializer(() => {
      inject(SyncService);
    }),
    // `swipeBackEnabled` в `mode: 'md'` выключен по умолчанию — включаем явно.
    // При свайпе жест водит штатную транзицию сам, а после pop() Ionic играл её же
    // повторно (вниз + fade) — двойная анимация; `navAnimation` гасит только повтор.
    provideIonicAngular({
      mode: 'ios',
    }),
    provideHttpClient(withFetch()),
  ],
};
