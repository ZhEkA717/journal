# Приложение «Журналы» — ТЗ для AI-агента

> Имя файла спецификации: `PROJECT_SPEC.md`

## 0. КОНТЕКСТ ДЛЯ АГЕНТА

Ты — senior Angular-разработчик. Твоя задача — реализовать MVP мобильного
PWA-приложения «Журналы» для ведения производственных журналов (инструктажи
по охране труда, пожарной безопасности, учёт отпусков) в микробизнесе.

Приложение должно работать ОФЛАЙН-ПЕРВЫМ, синхронизироваться с Supabase при
наличии интернета и собираться под Web / Android / iOS через Ionic + Capacitor.

Перед генерацией любого кода:

1. Прочитай весь этот файл.
2. Проверь раздел «Правила для агента» (п. 12).
3. Не отклоняйся от стека и структуры без явного запроса.
4. Если требование противоречит другому — приоритет по п. 12.5.

---

## 1. ЦЕЛИ ПРОДУКТА

### Проблема

Микробизнес (до 20 сотрудников) ведёт бумажные журналы инструктажей и учёта.
Они теряются, заполняются задним числом, рвутся, требуют прошнуровки.
При проверке инспектора отсутствие или неправильное ведение журнала = штраф
до 130 000 ₽.

### Решение

Мобильное приложение, которое позволяет:

- вести журналы в цифре;
- ставить подпись сотрудника пальцем на экране;
- работать без интернета;
- экспортировать журнал в PDF по форме;
- синхронизировать данные между устройствами.

### Целевая аудитория

- ИП и директора микробизнеса (30–55 лет)
- Прорабы на стройке
- Владельцы мастерских, клининга, небольших производств
- Не технически подкованы, ценят простоту

### Ключевые принципы

1. Работает офлайн — не «бонус», а база.
2. Подпись пальцем — killer feature.
3. Максимум 3 тапа до добавления записи.
4. Никаких обязательных регистраций на старте.
5. Понятный русский интерфейс без англицизмов.

---

## 2. ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Обязательно

- **Angular 21+** (Standalone Components, без NgModules)
- **Angular Signals** для реактивного состояния
- **Zoneless Change Detection** (`provideZonelessChangeDetection()`)
- **Ionic 8+** для UI-компонентов и нативной упаковки
- **Capacitor 6+** для доступа к нативным API
- **Dexie.js 4+** для работы с IndexedDB (локальная БД)
- **Supabase** (Postgres + Auth + Storage) для бэкенда
- **Tailwind CSS** для кастомных стилей поверх Ionic
- **TypeScript 5.4+** в strict-режиме

### Дополнительно

- **signature_pad** — рисование подписи на canvas
- **pdf-lib** — генерация PDF на клиенте
- **@ngrx/signals** — signalStore для глобального состояния
- **Day.js** — работа с датами (все локали через `dayjs/locale/ru`)
- **Vitest** или **Jest** — юнит-тесты
- **Playwright** — e2e-тесты

### Запрещено

- NgModules
- RxJS Subject для состояния (только Signals)
- Firebase (используем Supabase)
- Angular Material (используем Ionic)
- Moment.js (используем Day.js)
- `any` в публичных API

---

## 3. АРХИТЕКТУРА

### Слои

```text
┌────────────────────────────────────────────────────────┐
│ UI (Ionic + Tailwind)                components, pages │
├────────────────────────────────────────────────────────┤
│ State (Signals + signalStore)          stores, signals │
├────────────────────────────────────────────────────────┤
│ Domain (Services)                       business logic │
├────────────────────────────────────────────────────────┤
│ Data (Repositories)                    CRUD-абстракция │
├────────────────────────────────────────────────────────┤
│ Local DB (Dexie) ↔ Sync (Supabase)         persistence │
└────────────────────────────────────────────────────────┘
```

### Правила слоёв

- UI НЕ обращается к Dexie напрямую — только через репозитории.
- Репозитории НЕ содержат бизнес-логики — только CRUD + sync queue.
- Сервисы (domain) содержат всю бизнес-логику.
- Stores хранят UI-состояние и кэш, зависят от сервисов.

### Принципы

- Local-First: все операции сначала пишутся в IndexedDB, потом ставятся
  в очередь синхронизации.
- Offline-First UI: пользователь никогда не видит «загрузку» из-за сети.
- Optimistic UI: интерфейс обновляется мгновенно, откат при ошибке sync.
- Last-Write-Wins для разрешения конфликтов на MVP-этапе.

---

## 4. СТРУКТУРА ПРОЕКТА

```text
src/
├── app/
│   ├── core/                          # Синглтоны, инфраструктура
│   │   ├── db/
│   │   │   ├── app-db.ts              # Dexie схема
│   │   │   ├── migrations.ts          # Миграции БД
│   │   │   └── seed.ts                # Системные шаблоны журналов
│   │   ├── sync/
│   │   │   ├── sync.service.ts        # Оркестратор синхронизации
│   │   │   ├── sync-queue.service.ts  # Очередь операций
│   │   │   ├── sync-conflict.service.ts
│   │   │   └── online-status.service.ts
│   │   ├── supabase/
│   │   │   ├── supabase.client.ts     # createClient + env
│   │   │   └── supabase.types.ts      # Сгенерированные типы
│   │   ├── pdf/
│   │   │   └── pdf-generator.service.ts
│   │   ├── auth/
│   │   │   └── auth.service.ts        # Анонимная + email-авторизация
│   │   ├── date/
│   │   │   └── date.service.ts        # Обёртка над Day.js
│   │   └── storage/
│   │       └── file-storage.service.ts
│   │
│   ├── domain/                        # Бизнес-логика
│   │   ├── organizations/
│   │   │   ├── organization.model.ts
│   │   │   ├── organization.repository.ts
│   │   │   └── organization.service.ts
│   │   ├── employees/
│   │   │   ├── employee.model.ts
│   │   │   ├── employee.repository.ts
│   │   │   └── employee.service.ts
│   │   ├── journals/
│   │   │   ├── journal.model.ts
│   │   │   ├── journal-template.model.ts
│   │   │   ├── journal.repository.ts
│   │   │   ├── journal-entry.repository.ts
│   │   │   └── journal.service.ts
│   │   └── templates/
│   │       └── system-templates.ts   # Дефолтные шаблоны по ГОСТ
│   │
│   ├── features/                      # Экраны (smart components)
│   │   ├── onboarding/
│   │   │   └── onboarding.page.ts
│   │   ├── journals/
│   │   │   ├── journals-list/
│   │   │   │   └── journals-list.page.ts
│   │   │   ├── journal-detail/
│   │   │   │   └── journal-detail.page.ts
│   │   │   ├── journal-create/
│   │   │   │   └── journal-create.page.ts
│   │   │   └── entry-form/
│   │   │       └── entry-form.page.ts
│   │   ├── employees/
│   │   │   ├── employees-list/
│   │   │   └── employee-form/
│   │   ├── reports/
│   │   │   └── reports.page.ts          # Заглушка вкладки, вне MVP (14)
│   │   └── settings/
│   │       └── settings.page.ts
│   │
│   ├── shared/                        # Dumb-компоненты и утилиты
│   │   ├── ui/
│   │   │   ├── signature-pad/
│   │   │   │   └── signature-pad.component.ts
│   │   │   ├── empty-state/
│   │   │   ├── offline-banner/
│   │   │   ├── sync-indicator/
│   │   │   ├── toast/
│   │   │   └── confirm-dialog/
│   │   ├── pipes/
│   │   │   ├── date-ru.pipe.ts
│   │   │   └── plural.pipe.ts
│   │   └── utils/
│   │       ├── uuid.ts
│   │       └── date.utils.ts
│   │
│   ├── app.component.ts
│   ├── app.routes.ts
│   └── app.config.ts
│
├── environments/
│   ├── environment.model.ts            # Тип Environment (общий для dev/prod)
│   ├── environment.ts
│   └── environment.prod.ts
│
├── theme/
│   └── variables.scss                # Ionic CSS-переменные
│
├── assets/
│   ├── icons/                         # Иконки приложения
│   └── templates/                     # PDF-шаблоны
│
├── manifest.webmanifest
├── ngsw-config.json
└── capacitor.config.ts
```

---

## 5. МОДЕЛИ ДАННЫХ

### 5.1. Общие правила

- Все ID — UUID v4 (генерируются на клиенте).
- Все сущности имеют `createdAt`, `updatedAt` (Unix ms).
- Все сущности имеют `syncStatus: 'synced' | 'pending' | 'conflict'`.
- Все сущности имеют `deletedAt?: number` для soft-delete.
- Даты хранятся как ISO 8601 строки.
- Работа с датами — только через `DateService` (обёртка над Day.js).

### 5.2. Модели

```typescript
interface Organization {
  id: string;
  name: string;
  inn?: string;
  address?: string;
  responsiblePerson: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  deletedAt?: number;
}

interface Employee {
  id: string;
  orgId: string;
  fullName: string;
  position: string;
  birthDate?: string;      // ISO date
  hiredAt: string;         // ISO date
  firedAt?: string;        // ISO date
  signature?: string;      // base64 PNG (эталонная подпись)
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  deletedAt?: number;
}

interface JournalTemplate {
  id: string;
  orgId?: string;          // null = системный
  name: string;
  category: 'fire_safety' | 'labor_safety' | 'vacation' | 'custom';
  columns: ColumnDef[];
  legalRef?: string;       // Ссылка на ГОСТ/приказ
  isSystem: boolean;
  iconName: string;        // ionicons name
  color: string;           // hex
  createdAt: number;
  updatedAt: number;
}

interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'signature';
  required: boolean;
  options?: string[];
  width?: number;          // для PDF
}

interface Journal {
  id: string;
  orgId: string;
  templateId: string;
  title: string;
  startedAt: string;       // ISO date
  closedAt?: string;       // ISO date
  responsiblePerson: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  deletedAt?: number;
}

interface JournalEntry {
  id: string;
  journalId: string;
  employeeId: string;
  data: Record<string, unknown>;  // динамические поля по ColumnDef
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  deletedAt?: number;
}

interface SyncQueueItem {
  id?: number;             // auto-increment
  entityType: 'organization' | 'employee' | 'journal' | 'entry' | 'template';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: number;
  retries: number;
  lastError?: string;
}

type SyncStatus = 'synced' | 'pending' | 'conflict';
```

---

## 6. DEXIE-СХЕМА

Файл: `core/db/app-db.ts`

```typescript
import Dexie, { Table } from 'dexie';

export class AppDatabase extends Dexie {
  organizations!: Table<Organization, string>;
  employees!: Table<Employee, string>;
  templates!: Table<JournalTemplate, string>;
  journals!: Table<Journal, string>;
  entries!: Table<JournalEntry, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('journal-app');

    this.version(1).stores({
      organizations: 'id, updatedAt, syncStatus, deletedAt',
      employees:     'id, orgId, fullName, updatedAt, syncStatus, deletedAt',
      templates:     'id, orgId, category, isSystem',
      journals:      'id, orgId, templateId, startedAt, updatedAt, syncStatus, deletedAt',
      entries:       'id, journalId, employeeId, updatedAt, syncStatus, deletedAt',
      syncQueue:     '++id, entityType, entityId, createdAt, retries',
    });
  }
}

export const db = new AppDatabase();
```

**Требования:**

- Имя БД — `journal-app`.
- `syncQueue` использует автоинкрементный ключ `++id`.
- Миграции схемы — в `core/db/migrations.ts`, версия увеличивается инкрементально.
- Первичное наполнение системными шаблонами — `core/db/seed.ts`.

---

## 7. СИСТЕМНЫЕ ШАБЛОНЫ ЖУРНАЛОВ

При первом запуске в БД загружаются 3 системных шаблона.

### 7.1. Журнал инструктажа по пожарной безопасности

```typescript
{
  id: 'sys-fire-safety',
  name: 'Журнал инструктажа по пожарной безопасности',
  category: 'fire_safety',
  iconName: 'flame-outline',
  color: '#DC2626',
  isSystem: true,
  legalRef: 'Приказ МЧС России от 18.11.2021 № 806',
  columns: [
    { key: 'date',      label: 'Дата',            type: 'date',      required: true },
    { key: 'employee',  label: 'ФИО',             type: 'text',      required: true },
    { key: 'position',  label: 'Должность',       type: 'text',      required: true },
    { key: 'type',      label: 'Вид инструктажа', type: 'select',    required: true,
      options: ['Вводный', 'Первичный', 'Повторный', 'Внеплановый', 'Целевой'] },
    { key: 'reason',    label: 'Причина',         type: 'text',      required: false },
    { key: 'signature', label: 'Подпись',         type: 'signature', required: true },
  ],
}
```

### 7.2. Журнал инструктажа по охране труда

```typescript
{
  id: 'sys-labor-safety',
  name: 'Журнал инструктажа по охране труда',
  category: 'labor_safety',
  iconName: 'shield-checkmark-outline',
  color: '#1E40AF',
  isSystem: true,
  legalRef: 'Постановление Минтруда № 1/29 от 13.01.2003',
  columns: [
    { key: 'date',      label: 'Дата',            type: 'date',      required: true },
    { key: 'employee',  label: 'ФИО',             type: 'text',      required: true },
    { key: 'position',  label: 'Профессия',       type: 'text',      required: true },
    { key: 'type',      label: 'Вид инструктажа', type: 'select',    required: true,
      options: ['Вводный', 'Первичный', 'Повторный', 'Внеплановый', 'Целевой'] },
    { key: 'signature', label: 'Подпись',         type: 'signature', required: true },
  ],
}
```

### 7.3. Журнал учёта отпусков

```typescript
{
  id: 'sys-vacation',
  name: 'Журнал учёта отпусков',
  category: 'vacation',
  iconName: 'sunny-outline',
  color: '#16A34A',
  isSystem: true,
  columns: [
    { key: 'employee',  label: 'ФИО',            type: 'text',      required: true },
    { key: 'position',  label: 'Должность',      type: 'text',      required: true },
    { key: 'startDate', label: 'Дата начала',    type: 'date',      required: true },
    { key: 'endDate',   label: 'Дата окончания', type: 'date',      required: true },
    { key: 'days',      label: 'Кол-во дней',    type: 'number',    required: true },
    { key: 'signature', label: 'Подпись',        type: 'signature', required: true },
  ],
}
```

---

## 8. ЭКРАНЫ И UX

### 8.1. Onboarding (первый запуск)

Файл: `features/onboarding/onboarding.page.ts`

#### Содержимое

- Иконка приложения (96×96)
- Заголовок «Журналы» (28px, Bold)
- Подзаголовок «Все журналы в одном месте. Работает без интернета.»
- Поле «Название организации» (обязательно)
- Поле «Ответственный за ведение» (обязательно)
- Кнопка «Начать работу» (primary, `#EA580C`)
- Сноска: «Данные хранятся только на вашем устройстве»

#### Логика

1. Создать Organization в Dexie.
2. Загрузить системные шаблоны.
3. Инициализировать анонимную сессию Supabase.
4. Navigate to `/journals`.
5. Валидация: поля не пустые, минимум 2 символа.

### 8.2. Список журналов

Файл: `features/journals/journals-list/journals-list.page.ts`

#### Содержимое

- IonHeader: заголовок «Мои журналы», иконка sync-статуса
- Offline-banner (если offline) — оранжевая полоса сверху
- IonList карточек журналов:
  - Иконка в цветном круге (по category)
  - Название журнала
  - Тип (человеко-читаемый)
  - Метаданные: «12 записей · 5 сотрудников · Открыт с 01.09.2026»
  - Индикатор «Не синхронизировано», если `syncStatus === 'pending'`
- IonFab (bottom-right, `#EA580C`) → `/journals/new`
- IonTabBar: Журналы | Сотрудники | Отчёты | Настройки
- Empty state: иллюстрация + «Пока нет журналов» + кнопка «Создать»

#### Логика

1. Загрузка через `journalService.listByOrg(orgId)` (из IndexedDB).
2. Реактивное обновление через Signals.

### 8.3. Создание журнала

Файл: `features/journals/journal-create/journal-create.page.ts`

#### Содержимое

- Заголовок «Новый журнал» + кнопка «Отмена»
- Секция «Тип журнала»: сетка 2×2 карточек шаблонов
- Секция «Название» (автозаполнение при выборе шаблона)
- Секция «Ответственный» (IonSelect с автокомплитом сотрудников)
- Кнопка «Создать журнал» (активна при валидности)

#### Логика

1. Пользователь выбирает шаблон → title автозаполняется.
2. Создаётся Journal в Dexie со `syncStatus: 'pending'`.
3. Элемент добавляется в `syncQueue`.
4. Navigate to `/journals/:id`.

### 8.4. Детальный вид журнала

Файл: `features/journals/journal-detail/journal-detail.page.ts`

#### Содержимое

- IonHeader: назад, название, меню (⋮)
- Подзаголовок с метаданными
- Таблица записей (IonGrid, sticky header)
- Колонки: Дата | ФИО | Вид | ✓
- Zebra-стиль
- Swipe-actions: Редактировать / Удалить
- IonFab: «+ Добавить запись»
- Внизу: кнопка «Экспорт в PDF»
- Empty state, если нет записей

#### Логика

1. Загрузка записей через `entryRepository.listByJournal(journalId)`.
2. Экспорт PDF через `pdfGeneratorService.generate(journalId)`.

### 8.5. Форма записи

Файл: `features/journals/entry-form/entry-form.page.ts`

#### Содержимое

- IonHeader: `[×] Отмена | «Новая запись» | «Сохранить»`
- Динамическая форма по `template.columns`:
  - `text` → IonInput
  - `date` → IonDatetime (default: today)
  - `select` → IonSelect с options
  - `signature` → `<app-signature-pad>` (кастомный компонент)
  - `number` → IonInput `type=number`
- Кнопка «Сохранить запись» внизу

#### Логика

1. Валидация всех required полей.
2. Сохранение в Dexie + `syncQueue`.
3. Haptic feedback (Capacitor Haptics).
4. Toast «Запись сохранена».
5. Назад к журналу.

### 8.6. Сотрудники

Файлы: `features/employees/employees-list/`, `features/employees/employee-form/`

#### Список

- Карточки: аватар с инициалами, ФИО, должность, «В компании с ...»,
  «Проинструктирован: N раз»
- Swipe: Редактировать / Удалить
- FAB «+ Добавить»
- Empty state

#### Форма

- ФИО (required)
- Должность (required)
- Дата рождения
- Дата приёма (default today)
- Кнопка «Сохранить»

### 8.7. Настройки

Файл: `features/settings/settings.page.ts`

#### Секции

- **Организация:** название, ответственный, ИНН, адрес
- **Синхронизация:** статус, время последней, кнопка «Синхронизировать»
- **Экспорт:** JSON, импорт, резервная копия
- **О приложении:** версия, политика, обратная связь
- Кнопка «Выйти» (danger)

---

## 9. КЛЮЧЕВЫЕ СЕРВИСЫ

### 9.1. DateService (обёртка над Day.js)

```typescript
@Injectable({ providedIn: 'root' })
export class DateService {
  constructor() {
    dayjs.locale('ru');
    dayjs.extend(isSameOrAfter);
    dayjs.extend(isSameOrBefore);
    dayjs.extend(customParseFormat);
  }

  now(): Dayjs;
  today(): string;                       // ISO date YYYY-MM-DD
  format(date: string | Dayjs, fmt = 'DD.MM.YYYY'): string;
  parse(input: string, fmt?: string): Dayjs;
  diffDays(a: string, b: string): number;
  isSameDay(a: string, b: string): boolean;
  addDays(date: string, days: number): string;
  humanize(date: string): string;        // «5 минут назад»
}
```

**Требования:**

- Никаких прямых импортов dayjs в компонентах — только через сервис.
- Все форматы дат для UI — `DD.MM.YYYY`.
- Все даты в БД — ISO `YYYY-MM-DD` (только дата) или Unix ms (timestamp).

### 9.2. SyncService

```typescript
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly db = inject(AppDatabase);
  private readonly supabase = inject(SupabaseClient);
  private readonly online = inject(OnlineStatusService);

  async enqueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>): Promise<void>;
  async flush(): Promise<void>;
  async pullChanges(since: number): Promise<void>;
  async resolveConflict(local: unknown, remote: unknown): Promise<unknown>;
}
```

**Требования:**

- Автоматический flush при появлении интернета.
- Retry с экспоненциальной задержкой (1s, 2s, 4s, 8s, 16s — max 5 попыток).
- После 5 неудач — пометить `syncStatus: 'conflict'`.
- Использовать `navigator.onLine` + периодический ping.

### 9.3. PdfGeneratorService

```typescript
@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {
  async generateJournal(journalId: string): Promise<Uint8Array>;
  async sharePdf(bytes: Uint8Array, filename: string): Promise<void>;
}
```

**Требования:**

- Формат A4 (595×842 pt).
- Шапка: название организации, название журнала, дата начала, ответственный.
- Таблица с колонками из шаблона.
- Подписи сотрудников вставлены как PNG-изображения.
- Внизу: место для подписи ответственного, количество листов.
- Кириллица — встроить шрифт (Roboto или PT Sans).

### 9.4. AuthService

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  async signInAnonymously(): Promise<User>;
  async signInWithEmail(email: string): Promise<void>;
  async linkAnonymousToEmail(email: string): Promise<void>;
  async signOut(): Promise<void>;
  readonly currentUser = signal<User | null>(null);
}
```

**Требования:**

- Анонимный вход при первом запуске (Supabase Anonymous Sign-In).
- Возможность позже привязать email для синхронизации между устройствами.
- Хранение сессии в Capacitor Preferences.

---

## 10. PWA И CAPACITOR

### 10.1. PWA (`ngsw-config.json`)

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "supabase-api",
      "urls": ["https://*.supabase.co/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "5s"
      }
    }
  ]
}
```

### 10.2. Capacitor (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.journals.app',
  appName: 'Журналы',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1E40AF',
    },
    Keyboard: {
      resize: 'body',
    },
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
```

### 10.3. Нативные плагины (обязательные)

| Плагин                        | Назначение             |
| ----------------------------- | ---------------------- |
| `@capacitor/haptics`         | Вибро при сохранении   |
| `@capacitor/share`           | Поделиться PDF         |
| `@capacitor/filesystem`      | Сохранение PDF         |
| `@capacitor/preferences`     | Хранение сессии        |
| `@capacitor/keyboard`        | Корректная работа с клавиатурой |
| `@capacitor/status-bar`      | Цвет статус-бара       |

---

## 11. SUPABASE

### 11.1. Таблицы

Схема идентична локальной, но с колонкой `user_id uuid` для RLS.

```sql
create table organizations (
  id uuid primary key,
  user_id uuid references auth.users not null,
  name text not null,
  inn text,
  address text,
  responsible_person text,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
);

create table employees (
  id uuid primary key,
  user_id uuid references auth.users not null,
  org_id uuid references organizations not null,
  full_name text not null,
  position text,
  birth_date date,
  hired_at date,
  fired_at date,
  signature text,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
);

create table templates (
  id uuid primary key,
  user_id uuid references auth.users,
  org_id uuid references organizations,
  name text not null,
  category text,
  columns jsonb not null,
  legal_ref text,
  is_system boolean default false,
  icon_name text,
  color text,
  created_at bigint,
  updated_at bigint
);

create table journals (
  id uuid primary key,
  user_id uuid references auth.users not null,
  org_id uuid references organizations not null,
  template_id uuid references templates not null,
  title text not null,
  started_at date,
  closed_at date,
  responsible_person text,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
);

create table entries (
  id uuid primary key,
  user_id uuid references auth.users not null,
  journal_id uuid references journals not null,
  employee_id uuid references employees not null,
  data jsonb not null,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
);

create index on employees (user_id, updated_at);
create index on journals (user_id, updated_at);
create index on entries (user_id, updated_at);
```

### 11.2. RLS-политики

Обязательно на каждой таблице:

```sql
alter table organizations enable row level security;

create policy "own_rows_select" on organizations
  for select using (auth.uid() = user_id);

create policy "own_rows_insert" on organizations
  for insert with check (auth.uid() = user_id);

create policy "own_rows_update" on organizations
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own_rows_delete" on organizations
  for delete using (auth.uid() = user_id);
```

Аналогично для `employees`, `templates`, `journals`, `entries`.

### 11.3. Синхронизация

- **Pull:** `select * from <table> where user_id = auth.uid() and updated_at > :since`
- **Push:** upsert через Supabase client.
- **Конфликты:** last-write-wins по `updated_at`.

---

## 12. ПРАВИЛА ДЛЯ АГЕНТА

### 12.1. При генерации кода

Всегда:

- Standalone Components, без NgModules.
- `inject()` вместо constructor injection.
- Signals для состояния (`signal`, `computed`, `effect`).
- `ChangeDetectionStrategy.OnPush`.
- `provideZonelessChangeDetection()` в `app.config.ts`.
- Типизация — никаких `any`.
- JSDoc на публичных методах сервисов.
- Обработка ошибок в async-методах (try/catch + лог).

Никогда:

- Не обращаться к `db` напрямую из компонентов.
- Не использовать `subscribe` без `takeUntilDestroyed`.
- Не хардкодить цвета — только CSS-переменные.
- Не импортировать dayjs в компонентах — только `DateService`.

### 12.2. Именование

- Компоненты: `feature-name.component.ts` (kebab-case).
- Страницы: `feature-name.page.ts`.
- Сервисы: `feature-name.service.ts`.
- Модели: `feature-name.model.ts`.
- Репозитории: `feature-name.repository.ts`.
- Signals: `readonly someSignal = signal<T>()`.
- Приватные поля: `private readonly`.

### 12.3. Стиль кода

- Prettier: 2 пробела, single quotes, trailing commas.
- ESLint: `@angular-eslint` + `@typescript-eslint` strict.
- Максимальная длина строки — 100 символов.
- Импорты сортируются: Angular → Ionic → внешние → внутренние.

### 12.4. Тесты

- Покрытие сервисов — минимум 70%.
- Компоненты — smoke-тесты на рендер.
- E2E — критичные сценарии (создание журнала, добавление записи, экспорт PDF).

### 12.5. Приоритеты

При конфликте требований:

1. Работоспособность офлайн.
2. Простота UI для конечного пользователя.
3. Скорость разработки MVP.
4. Красота кода.

---

## 13. ДИЗАЙН-ТОКЕНЫ (Tailwind + Ionic)

### 13.1. Цвета

CSS-переменные в `theme/variables.scss`:

```scss
:root {
  --ion-color-primary: #1E40AF;
  --ion-color-primary-rgb: 30, 64, 175;
  --ion-color-secondary: #EA580C;
  --ion-color-success: #16A34A;
  --ion-color-warning: #F59E0B;
  --ion-color-danger: #DC2626;
  --ion-background-color: #F8FAFC;
  --ion-text-color: #0F172A;
  --ion-color-medium: #64748B;
  --ion-border-color: #E2E8F0;
}
```

### 13.2. Типографика

Tailwind v4: токены задаются в блоке `@theme` (файл `src/styles.scss`), а не в
`tailwind.config.js`. Каждый токен порождает utility-класс: `--text-h1` → `text-h1`,
`--font-sans` → `font-sans`.

```scss
@theme {
  --font-sans: 'Inter', system-ui, sans-serif;

  --text-h1: 24px;
  --text-h1--line-height: 32px;
  --text-h1--font-weight: 700;

  --text-h2: 20px;
  --text-h2--line-height: 28px;
  --text-h2--font-weight: 600;

  --text-h3: 17px;
  --text-h3--line-height: 24px;
  --text-h3--font-weight: 600;

  --text-body: 16px;
  --text-body--line-height: 24px;

  --text-small: 14px;
  --text-small--line-height: 20px;

  --text-tiny: 12px;
  --text-tiny--line-height: 16px;
}
```

### 13.3. Скругления

Токены `@theme` → классы `rounded-*`:

| Элемент        | Токен              | Радиус |
| -------------- | ------------------ | ------ |
| Карточки       | `--radius-card`    | 12px   |
| Кнопки         | `--radius-button`  | 10px   |
| Поля ввода     | `--radius-input`   | 10px   |
| Модальные окна | `--radius-modal`   | 16px   |

### 13.4. Отступы (система 4px)

Токены `@theme` → классы `p-*`, `m-*`, `gap-*`:

| Контекст        | Токен                         | Значение |
| --------------- | ----------------------------- | -------- |
| Внутри карточек | `--spacing-inside-card`       | 16px     |
| Между карточками | `--spacing-between-cards`    | 12px     |
| По бокам экрана | `--spacing-screen-x`          | 16px     |
| Между секциями  | `--spacing-between-sections`  | 24px     |


---

## 14. КРИТЕРИИ ГОТОВНОСТИ MVP

Приложение считается готовым к первому релизу, когда:

- Онбординг работает, организация создаётся, шаблоны загружаются.
- Журналы: создание, просмотр, редактирование, удаление.
- Записи: создание через динамическую форму, подпись пальцем, сохранение.
- Сотрудники: CRUD, поиск, отображение статистики.
- PDF: экспорт журнала с корректной шапкой, таблицей и подписями.
- Офлайн: приложение полностью работает без интернета.
- Синхронизация: при появлении сети данные уходят в Supabase, при смене
  устройства — приходят обратно.
- PWA: устанавливается как приложение, работает офлайн.
- Android/iOS: собирается через Capacitor, проходит smoke-тест на реальном
  устройстве.
- Тесты: покрытие сервисов ≥ 70%, e2e на 3 сценария.

---

## 15. ЧТО НЕ ВХОДИТ В MVP (backlog)

- ЭЦП для юридической значимости.
- Роли и права доступа (несколько ответственных).
- Отчёты и аналитика.
- Интеграции с 1С, Мой Склад и т.п.
- Push-уведомления о приближающихся повторных инструктажах.
- Мультиязычность.
- Веб-версия для десктопа.

---

## 16. ЧЕК-ЛИСТ ПЕРВОГО ЗАПУСКА АГЕНТА

При старте работы агент должен:

1. Прочитать этот файл целиком.
2. Инициализировать проект:
   `ng new journals --standalone --style=scss --routing`.
3. Установить зависимости: Ionic, Capacitor, Dexie, Supabase, `signature_pad`,
   `pdf-lib`, `dayjs`, `@ngrx/signals`, Tailwind.
4. Настроить `provideZonelessChangeDetection()` и `provideRouter()`.
5. Настроить Tailwind + Ionic CSS-переменные.
6. Создать структуру папок из п. 4.
7. Создать модели и Dexie-схему.
8. Создать DateService (обёртка над Day.js).
9. Создать системные шаблоны и seed.
10. Создать репозитории и сервисы.
11. Создать SyncService и OnlineStatusService.
12. Создать экраны в порядке: Onboarding → Journals List → Journal Detail →
    Entry Form → Employees → Settings.
13. Настроить PWA (`ng add @angular/pwa`).
14. Настроить Capacitor (`npx cap init`).
15. Написать smoke-тесты.
16. Проверить сборку под Web, Android, iOS.


