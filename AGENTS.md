# journals

Angular 22 + Ionic 9 + Tailwind CSS 4 приложение для ведения журналов учёта по ГОСТ.

## Спецификация

Источник истины по продукту — `.opencode/journal.tz.md`. Перед реализацией задачи
читай соответствующий раздел ТЗ. Не отклоняйся от стека и структуры без явного
запроса пользователя.

Планируется разбить работу на задачи T1–T12 (каркас → данные → shared → экраны →
Supabase/Auth → Sync → PDF → PWA/Capacitor → тесты → аудит критериев готовности).
Текущее состояние: **T1 (каркас) завершён**, все 9 экранов — заглушки.

## Команды

| Задача       | Команда             |
| ------------ | ------------------- |
| Dev-сервер   | `npm start`         |
| Сборка       | `npm run build`     |
| Тесты        | `npm test`          |
| Линт         | `npm run lint`      |
| Типы         | `npm run typecheck` |
| Форматирование | `npm run format`  |

Все команды перед коммитом должны проходить.

## Структура

- `src/main.ts` — entrypoint, вызывает `bootstrapApplication(AppComponent, appConfig)`
- `src/app/app.component.ts` — оболочка: `IonApp` + `IonTabs` + `IonRouterOutlet`
- `src/app/app.config.ts` — провайдеры: zoneless, роутер, `provideIonicAngular`, HTTP
- `src/app/app.routes.ts` — маршруты и константа вкладок `APP_TABS`
- `src/app/core/` — синглтоны и инфраструктура: `db`, `sync`, `supabase`, `pdf`, `auth`, `date`, `storage`
- `src/app/domain/` — модели, репозитории, доменные сервисы
- `src/app/features/<feature>/<screen>/` — экраны (smart components)
- `src/app/shared/` — dumb-компоненты, пайпы, утилиты
- `src/environments/` — dev/prod-конфигурация, тип в `environment.model.ts`
- `src/theme/variables.scss` — Ionic CSS-переменные
- `src/styles.scss` — `@use 'tailwindcss'` и блок `@theme` с токенами дизайна
- `docs/prototype-reference.tsx` — React-прототип как UI-референс, в сборку не входит

## Стек и запреты

Разрешено и обязательно (ТЗ 2): Angular 22 standalone + Signals + Zoneless CD,
Ionic 9, Tailwind 4, Dexie 4, Supabase, Capacitor 6+, TypeScript strict.

Запрещено: NgModules, `Subject` для состояния, Firebase, Angular Material,
Moment.js, `any` в публичных API, хардкод цветов вне токенов.

## Соглашения по именованию

- Страницы: `feature-name.page.ts`
- Dumb-компоненты: `feature-name.component.ts`
- Сервисы: `feature-name.service.ts`, репозитории: `feature-name.repository.ts`
- Модели: `feature-name.model.ts`

## Правила, которые легко нарушить

1. **Слои.** UI не ходит в Dexie напрямую — только через репозиторий. Репозиторий не
   содержит бизнес-логики. Логика живёт в доменных сервисах, кэш и UI-состояние — в
   stores (ТЗ 3).
2. **Change detection.** По умолчанию `OnPush`. Компоненты оболочки между корнем и
   `ion-router-outlet`/`ion-tabs` обязаны явно иметь `ChangeDetectionStrategy.Eager`
   (ТЗ 4.2). Линт-правило `prefer-on-push-component-change-detection` отключено в
   `eslint.config.js` именно по этой причине — не отключай его обратно молча.
3. **Даты.** Любая работа с датами идёт через `DateService` (Day.js + `dayjs/locale/ru`).
   В моделях даты — ISO 8601 строки, таймстемпы — Unix ms (ТЗ 5.1).
4. **Токены.** Цвета и типографика — только через Tailwind-токены из `src/styles.scss`
   (`text-h1`, `rounded-card`, `p-screen-x`, …) и Ionic-переменные из
   `src/theme/variables.scss` (ТЗ 13).
5. **Локальность данных.** Любая запись сначала уходит в IndexedDB, потом в очередь
   синхронизации. Пользователь не должен видеть «загрузку из-за сети» (ТЗ 3).
