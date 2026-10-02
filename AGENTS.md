# journals

Angular 22 + Ionic 9 + Tailwind CSS 4 приложение для ведения журналов учёта по ГОСТ.

## Спецификация

Источник истины по продукту — `.opencode/journal.tz.md`. Перед реализацией задачи
читай соответствующий раздел ТЗ. Не отклоняйся от стека и структуры без явного
запроса пользователя.

Планируется разбить работу на задачи T1–T12 (каркас → данные → shared → экраны →
Supabase/Auth → Sync → PDF → PWA/Capacitor → тесты → аудит критериев готовности).
Текущее состояние: **T1 (каркас), T2 (слой данных), T3 (shared) и T4 (stores и
экраны ТЗ 8.1–8.7) завершены**. Следующая — T5 (Supabase/Auth). PDF в детальном
виде журнала и реальная синхронизация пока заглушки (Т7 и T5/T6).

Что уже есть в слое данных:

- `core/db/app-db.ts` — `AppDatabase` (Dexie) как `@Injectable({ providedIn: 'root' })`;
  схема версий в `core/db/migrations.ts`, сид шаблонов — `core/db/seed.ts`
- `core/db/syncable.repository.ts` — общий базовый класс репозиториев: запись в БД,
  soft-delete, постановка операции в очередь синхронизации
- `core/date/date.service.ts` — единственная обёртка над Day.js
- `core/sync/sync-queue.service.ts` + `core/sync/online-status.service.ts`
- `domain/<entity>/*.repository.ts` — CRUD, `domain/<entity>/*.service.ts` — бизнес-логика
- `domain/templates/system-templates.ts` — 3 системных шаблона по ГОСТ (ТЗ 7)

Что уже есть в shared (ТЗ 4):

- `shared/pipes/date-ru.pipe.ts` — `dateRu` (DD.MM.YYYY) и `dateHuman` («вчера») через
  `DateService`
- `shared/pipes/plural.pipe.ts` — русские склонения: `n | plural:'запись':'записи':'записей'`
- `shared/ui/signature-pad/` — рисование подписи пальцем (signature_pad) → PNG base64
- `shared/ui/empty-state/`, `shared/ui/offline-banner/`, `shared/ui/sync-indicator/`
- `shared/ui/toast/toast.service.ts` — обёртка над `ToastController`
- `shared/ui/confirm-dialog/confirm-dialog.service.ts` — `ConfirmDialogService` поверх
  `ActionSheetController` (`header` + `subHeader` + кнопки `role: 'confirm'` / `role: 'cancel'`)
- `shared/utils/uuid.ts` (UUID v4), `shared/utils/date.utils.ts` (`isIsoDate`)

Что уже есть в stores и экранах (ТЗ 3, 8.1–8.7):

- `stores/session.store.ts` — организация устройства, онбординг, `organizationId`
  для остальных stores
- `stores/journals.store.ts` — список журналов со сводками, шаблоны, create/close/remove
- `stores/journal-detail.store.ts` — журнал, записи, сотрудники, `columns` шаблона
  для формы записи, `rows` для таблицы (ТЗ 8.4)
- `stores/employees.store.ts` — сотрудники, поиск, счётчики инструктажей, `fire`/`restore`
- `features/onboarding/`, `features/journals/{journals-list,journal-create,journal-detail,entry-form}/`,
  `features/employees/{employees-list,employee-form}/`, `features/settings/`
- `core/storage/local-data.service.ts` — полная очистка локальной БД для действия «Выйти»
- Оболочка `app.component.ts` строит навигацию вручную (`IonRouterOutlet` + `ion-tab-bar`),
  потому что `ion-tabs` не работает с плоскими маршрутами вкладок (см. комментарий в файле)

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
- `src/app/app.component.ts` — оболочка: `IonApp` + `IonRouterOutlet` + ручной `ion-tab-bar`
- `src/app/app.config.ts` — провайдеры: zoneless, роутер, `provideIonicAngular`, HTTP
- `src/app/app.routes.ts` — маршруты и константа вкладок `APP_TABS`
- `src/app/core/` — синглтоны и инфраструктура: `db`, `sync`, `supabase`, `pdf`, `auth`, `date`, `storage`
- `src/app/domain/` — модели, репозитории, доменные сервисы
- `src/app/features/<feature>/<screen>/` — экраны (smart components)
- `src/app/shared/` — dumb-компоненты, пайпы, утилиты
- `src/environments/` — dev/prod-конфигурация, тип в `environment.model.ts`
- `src/test-setup.ts` — `fake-indexeddb/auto` для тестов слоя данных (vitest)
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
6. **Единственный экземпляр БД.** `AppDatabase` — DI-провайдер, бери его через
   `inject(AppDatabase)`. Не создавай `new AppDatabase()`: это откроет второе
   соединение и разорвёт наблюдение за очередью. Новая версия схемы добавляется
   инкрементально в `SCHEMA_MIGRATIONS`.
7. **signalStore.** В одном `withMethods` соседние методы недоступны через `store.*`
   (они попадают в state только после применения фичей). Если метод вызывает другой
   метод того же блока — выноси общую логику в локальную `async`-функцию внутри
   `withMethods`. Зависимые `computed` разноси по нескольким `withComputed`, иначе
   получишь `NG0600` (чтение сигнала во время вычисления). Тип инстанса стора в
   тестах — `InstanceType<typeof Store>`.
8. **Автозаполняемые поля записи.** Колонки `employee` и `position` подставляются из
   карточки сотрудника при сохранении (ТЗ 9.3). Форма записи валидирует только
   пользовательский ввод через `JournalService.validateEntryInput`, а сохранение —
   полный набор через `validateEntry`. Не меняй это на `validateEntry` в сторе, иначе
   форма не даст сохранить запись.
9. **Пайп `plural`** возвращает только форму слова. Числительное выводится рядом:
   `{{ count }} {{ count | plural: 'запись' : 'записи' : 'записей' }}`.
