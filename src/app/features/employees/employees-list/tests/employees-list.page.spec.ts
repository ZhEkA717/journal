import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import type { Employee } from '../../../../domain/employees/employee.model';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { EmployeesStore } from '../../../../stores/employees.store';
import { EmployeesListPage } from '../employees-list.page';

describe('EmployeesListPage', () => {
  function employee(overrides: Partial<Employee> = {}): Employee {
    return {
      id: 'e-1',
      orgId: 'org-1',
      fullName: 'Петров Пётр Петрович',
      position: 'Монтажник',
      hiredAt: '2026-01-15',
      createdAt: 1,
      updatedAt: 1,
      syncStatus: 'pending',
      ...overrides,
    };
  }

  function setup(items: readonly Employee[]) {
    const query = signal('');
    const counts = new Map(items.map((item) => [item.id, 2]));
    const store = {
      loading: signal(false),
      hasEmployees: signal(items.length > 0),
      employees: signal(items),
      filtered: signal(items),
      load: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      setQuery: (value: string) => query.set(value),
      query,
      instructionsOf: () => (id: string) => counts.get(id) ?? 0,
    };
    const toast = {
      success: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined),
      show: vi.fn().mockResolvedValue(undefined),
    };
    const confirm = {
      confirm: vi.fn().mockResolvedValue(true),
      remove: vi.fn().mockResolvedValue(true),
    };
    TestBed.configureTestingModule({
      imports: [EmployeesListPage],
      providers: [
        provideIonicAngular(),
        provideRouter([
          { path: 'employees', children: [] },
          { path: 'employees/new', children: [] },
        ]),
        { provide: EmployeesStore, useValue: store },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmDialogService, useValue: confirm },
      ],
    });
    const fixture = TestBed.createComponent(EmployeesListPage);
    fixture.detectChanges();
    return { fixture, store, toast, confirm };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('показывает пустое состояние без сотрудников', () => {
    const { fixture } = setup([]);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Пока нет сотрудников');
    expect(text).toContain('Нажмите + чтобы добавить');
  });

  it('показывает карточку сотрудника с инициалами и счётчиком', () => {
    const { fixture } = setup([employee()]);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('ПП');
    expect(text).toContain('Петров Пётр Петрович');
    expect(text).toContain('Монтажник');
    expect(text).toContain('В компании с 15.01.2026');
    expect(text).toContain('2 инструктажа');
  });

  it('ведёт в карточку по ссылке', () => {
    const { fixture } = setup([employee()]);

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      'a[href="/employees/e-1/edit"]',
    );
    expect(link).not.toBeNull();
  });

  it('передаёт запрос в store и сбрасывает его вместе с поиском', () => {
    const { fixture, store } = setup([employee()]);
    const page = fixture.componentInstance as unknown as {
      onSearch(event: unknown): void;
      toggleSearch(): void;
    };

    page.onSearch({ detail: { value: 'пётр' } });
    expect(store.query()).toBe('пётр');

    page.toggleSearch();
    expect(store.query()).toBe('пётр');

    page.toggleSearch();
    expect(store.query()).toBe('');
  });

  it('открывает форму нового сотрудника', async () => {
    const { fixture } = setup([employee()]);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/employees');
    fixture.detectChanges();

    await fixture.componentInstance['openCreate']();
    await fixture.whenStable();

    expect(router.url).toBe('/employees/new');
  });

  it('карточку оборачивает свайп с опциями Редактировать/Удалить (ТЗ 8.6)', () => {
    const { fixture } = setup([employee()]);

    const options: Element[] = Array.from(
      fixture.nativeElement.querySelectorAll('ion-item-option'),
    );
    const labels = options.map((option) => option.textContent?.trim());
    expect(labels).toEqual(['Редактировать', 'Удалить']);
  });

  it('удаление сотрудника после подтверждения вызывает store.remove', async () => {
    const { fixture, store, toast } = setup([employee()]);

    await fixture.componentInstance['removeEmployee']('e-1');

    expect(store.remove).toHaveBeenCalledWith('e-1');
    expect(toast.success).toHaveBeenCalledWith('Сотрудник удалён');
  });

  it('отмена подтверждения не удаляет сотрудника', async () => {
    const { fixture, store, confirm } = setup([employee()]);
    confirm.remove.mockResolvedValue(false);

    await fixture.componentInstance['removeEmployee']('e-1');

    expect(store.remove).not.toHaveBeenCalled();
  });
});
