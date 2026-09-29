import { Routes } from '@angular/router';

export interface AppTab {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

export const APP_TABS: readonly AppTab[] = [
  { id: 'journals', href: '/journals', label: 'Журналы', icon: 'list-outline' },
  { id: 'employees', href: '/employees', label: 'Сотрудники', icon: 'people-outline' },
  { id: 'reports', href: '/reports', label: 'Отчёты', icon: 'bar-chart-outline' },
  { id: 'settings', href: '/settings', label: 'Настройки', icon: 'settings-outline' },
];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'journals' },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
    title: 'Первый запуск',
  },
  {
    path: 'journals',
    loadComponent: () =>
      import('./features/journals/journals-list/journals-list.page').then(
        (m) => m.JournalsListPage,
      ),
    title: 'Журналы',
  },
  {
    path: 'journals/create',
    loadComponent: () =>
      import('./features/journals/journal-create/journal-create.page').then(
        (m) => m.JournalCreatePage,
      ),
    title: 'Новый журнал',
  },
  {
    path: 'journals/:id',
    loadComponent: () =>
      import('./features/journals/journal-detail/journal-detail.page').then(
        (m) => m.JournalDetailPage,
      ),
    title: 'Журнал',
  },
  {
    path: 'journals/:id/entries/new',
    loadComponent: () =>
      import('./features/journals/entry-form/entry-form.page').then((m) => m.EntryFormPage),
    title: 'Новая запись',
  },
  {
    path: 'employees',
    loadComponent: () =>
      import('./features/employees/employees-list/employees-list.page').then(
        (m) => m.EmployeesListPage,
      ),
    title: 'Сотрудники',
  },
  {
    path: 'employees/new',
    loadComponent: () =>
      import('./features/employees/employee-form/employee-form.page').then(
        (m) => m.EmployeeFormPage,
      ),
    title: 'Новый сотрудник',
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
    title: 'Отчёты',
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
    title: 'Настройки',
  },
  { path: '**', redirectTo: 'journals' },
];
