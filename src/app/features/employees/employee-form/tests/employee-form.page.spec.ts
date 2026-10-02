import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import type { Employee } from '../../../../domain/employees/employee.model';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { EmployeesStore } from '../../../../stores/employees.store';
import { EmployeeFormPage } from '../employee-form.page';

describe('EmployeeFormPage', () => {
  const employee: Employee = {
    id: 'e-1',
    orgId: 'org-1',
    fullName: 'Петров Пётр Петрович',
    position: 'Монтажник',
    hiredAt: '2026-01-15',
    birthDate: '1990-04-12',
    firedAt: '2026-09-01',
    createdAt: 1,
    updatedAt: 1,
    syncStatus: 'pending',
  };

  function setup(employeeId = '') {
    const store = {
      byId: vi.fn(() => new Map([[employee.id, employee]])),
      load: vi.fn().mockResolvedValue(undefined),
      validate: vi.fn(() => ({})),
      create: vi.fn().mockResolvedValue(employee),
      update: vi.fn().mockResolvedValue(employee),
      restore: vi.fn().mockResolvedValue(employee),
    };
    const toast = {
      success: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined),
      show: vi.fn().mockResolvedValue(undefined),
    };
    const router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
      navigate: vi.fn().mockResolvedValue(true),
    };
    const route = {
      snapshot: { paramMap: { get: (key: string) => (key === 'id' ? employeeId : null) } },
    };
    TestBed.configureTestingModule({
      imports: [EmployeeFormPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: EmployeesStore, useValue: store },
        { provide: ActivatedRoute, useValue: route },
        { provide: ToastService, useValue: toast },
      ],
    });
    const realRouter = TestBed.inject(Router);
    vi.spyOn(realRouter, 'navigateByUrl').mockImplementation(router.navigateByUrl);
    vi.spyOn(realRouter, 'navigate').mockImplementation(router.navigate);
    const fixture = TestBed.createComponent(EmployeeFormPage);
    fixture.detectChanges();
    return { fixture, store, toast, router };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('рендерит форму нового сотрудника', async () => {
    const { fixture } = setup();
    await vi.waitFor(() => expect(fixture.componentInstance['isEditing']()).toBe(false));

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Новый сотрудник');
    expect(text).toContain('ФИО');
    expect(text).toContain('Дата приёма');
    expect(fixture.componentInstance['hiredAt']()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('загружает существующего сотрудника по идентификатору', async () => {
    const { fixture, store } = setup('e-1');

    await vi.waitFor(() =>
      expect(fixture.componentInstance['fullName']()).toBe('Петров Пётр Петрович'),
    );
    expect(store.load).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['position']()).toBe('Монтажник');
    expect(fixture.componentInstance['birthDate']()).toBe('1990-04-12');
    expect(fixture.componentInstance['isEditing']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Сотрудник');
  });

  it('показывает кнопку возврата уволенному и вызывает restore', async () => {
    const { fixture, store, toast } = setup('e-1');
    await vi.waitFor(() => expect(store.load).toHaveBeenCalledTimes(1));

    expect(fixture.nativeElement.textContent).toContain('Вернуть на работу');

    await fixture.componentInstance['rehire']();
    expect(store.restore).toHaveBeenCalledWith('e-1');
    expect(toast.success).toHaveBeenCalledWith('Сотрудник снова в штате');
  });

  it('создаёт нового сотрудника и уходит в список', async () => {
    const { fixture, store, toast, router } = setup();
    const component = fixture.componentInstance;
    component['onFullName']({ detail: { value: 'Сидорова Анна' } } as never);
    component['onPosition']({ detail: { value: 'Слесарь' } } as never);

    await component['save']();

    expect(store.create).toHaveBeenCalledWith({
      fullName: 'Сидорова Анна',
      position: 'Слесарь',
      hiredAt: component['hiredAt'](),
      birthDate: undefined,
      signature: undefined,
    });
    expect(toast.success).toHaveBeenCalledWith('Сотрудник сохранён');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/employees', { replaceUrl: true });
  });

  it('обновляет существующего сотрудника', async () => {
    const { fixture, store } = setup('e-1');
    await vi.waitFor(() => expect(store.load).toHaveBeenCalledTimes(1));

    await fixture.componentInstance['save']();

    expect(store.update).toHaveBeenCalledWith(
      'e-1',
      expect.objectContaining({ fullName: 'Петров Пётр Петрович' }),
    );
    expect(store.create).not.toHaveBeenCalled();
  });

  it('не сохраняет при ошибках валидации', async () => {
    const { fixture, store } = setup();
    store.validate.mockReturnValue({ fullName: 'Укажите ФИО' });

    await fixture.componentInstance['save']();

    expect(fixture.componentInstance['errors']()).toEqual({ fullName: 'Укажите ФИО' });
    expect(store.create).not.toHaveBeenCalled();
  });

  it('ошибка сохранения показывается тостом', async () => {
    const { fixture, store, toast } = setup();
    store.create.mockRejectedValue(new Error('db error'));

    await fixture.componentInstance['save']();

    expect(toast.error).toHaveBeenCalledWith('db error');
    expect(fixture.componentInstance['saving']()).toBe(false);
  });
});
