# Журналы по ГОСТ

Local-first приложение для ведения журналов учёта по ГОСТ. Спецификация проекта —
`.opencode/journal.tz.md`. React-прототип, на который опирается UI, сохранён в
`docs/prototype-reference.tsx` как справочник, в сборку не входит.

## Стек

| Слой        | Технология                            |
| ----------- | ------------------------------------- |
| UI          | Angular 22, Ionic 9, Tailwind CSS 4   |
| Состояние   | Signals (+ signalStore в T2)          |
| Change det. | Zoneless (`provideZonelessChangeDetection`) |
| Локальная БД| Dexie 4 (IndexedDB) — T2              |
| Бэкенд      | Supabase (Auth + Postgres + Storage) — T7 |
| Нативка     | Capacitor 6+ — T10                    |
| Тесты       | Vitest (unit), Playwright (e2e)      |

## Требования

- Node.js `^24.15.0` (закреплено в `.mise.toml`)
- npm (единственный пакетный менеджер, lock-файл — `package-lock.json`)

## Команды

```bash
npm install
npm start          # dev-сервер на http://localhost:4200
npm run build      # production-сборка в dist/journals
npm test           # unit-тесты (Vitest + jsdom)
npm run lint       # ESLint (angular-eslint, strict)
npm run typecheck  # tsc --noEmit
npm run format     # Prettier
```

## Структура

- `src/app/core/` — синглтоны и инфраструктура (db, sync, supabase, pdf, auth, date, storage)
- `src/app/domain/` — модели, репозитории, бизнес-сервисы
- `src/app/features/` — экраны (smart components), по папке на экран
- `src/app/shared/` — dumb-компоненты, пайпы, утилиты
- `src/environments/` — конфигурация dev/prod, подменяется через `fileReplacements`
- `src/theme/variables.scss` — Ionic CSS-переменные
- `src/styles.scss` — точка входа Tailwind и блок `@theme` с токенами дизайна

## Маршруты

| Путь                          | Экран            |
| ----------------------------- | ---------------- |
| `/onboarding`                 | Онбординг        |
| `/journals`                   | Список журналов  |
| `/journals/create`            | Создание журнала |
| `/journals/:id`               | Журнал           |
| `/journals/:id/entries/new`   | Форма записи     |
| `/employees`                  | Сотрудники       |
| `/employees/new`              | Сотрудник        |
| `/reports`                    | Отчёты (заглушка)|
| `/settings`                   | Настройки        |

Корень редиректит на `/journals`.

## Правила разработки

- Standalone-компоненты, NgModules запрещены (ТЗ 2).
- Состояние только на Signals, `any` в публичных API запрещён (ТЗ 2, 12.1).
- UI не обращается к Dexie напрямую — только через репозитории (ТЗ 3).
- Страницы именуются `*.page.ts`, dumb-компоненты — `*.component.ts` (ТЗ 12.2).
- Компоненты оболочки между корнем и `ion-router-outlet` используют
  `ChangeDetectionStrategy.Eager` (ТЗ 4.2).
- Цвета берутся из токенов в `src/theme/variables.scss` и `@theme`, хардкод запрещён (ТЗ 13).
