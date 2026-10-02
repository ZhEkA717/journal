import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { DateService } from '../../../../core/date/date.service';
import { NativeService } from '../../../../core/native/native.service';
import type { Employee } from '../../../../domain/employees/employee.model';
import type { ColumnDef } from '../../../../domain/journals/journal-template.model';
import type { Journal } from '../../../../domain/journals/journal.model';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { JournalDetailStore } from '../../../../stores/journal-detail.store';
import { EntryFormPage } from '../entry-form.page';

describe('EntryFormPage', () => {
  const journal: Journal = {
    id: 'j-1',
    orgId: 'org-1',
    templateId: 'sys-fire-safety',
    title: 'Журнал инструктажа',
    startedAt: '2026-09-01',
    responsiblePerson: 'Иванова Мария',
    createdAt: 1,
    updatedAt: 1,
    syncStatus: 'pending',
  };

  const employee: Employee = {
    id: 'e-1',
    orgId: 'org-1',
    fullName: 'Петров Пётр',
    position: 'Монтажник',
    hiredAt: '2026-01-15',
    createdAt: 1,
    updatedAt: 1,
    syncStatus: 'pending',
  };

  const columns: readonly ColumnDef[] = [
    { key: 'date', label: 'Дата', type: 'date', required: true },
    { key: 'employee', label: 'ФИО', type: 'text', required: true },
    { key: 'position', label: 'Должность', type: 'text', required: false },
    { key: 'result', label: 'Результат', type: 'text', required: true },
    { key: 'signature', label: 'Подпись', type: 'signature', required: true },
  ];

  function setup(
    options: {
      entryId?: string;
      entries?: { id: string; employeeId: string; data: Record<string, string | number | null> }[];
      activeEmployees?: readonly Employee[];
    } = {},
  ) {
    const store = {
      load: vi.fn().mockResolvedValue(undefined),
      journal: signal(journal),
      loading: signal(false),
      columns: signal(columns),
      activeEmployees: signal(options.activeEmployees ?? [employee]),
      entries: signal(options.entries ?? []),
      dateColumn: signal(columns[0]),
      validate: vi.fn(() => ({})),
      addEntry: vi.fn().mockResolvedValue({ id: 'en-2' }),
      updateEntry: vi.fn().mockResolvedValue({ id: options.entryId ?? 'en-1' }),
    };
    const toast = {
      success: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined),
      show: vi.fn().mockResolvedValue(undefined),
    };
    const native = { impact: vi.fn().mockResolvedValue(undefined) };
    const router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
      navigate: vi.fn().mockResolvedValue(true),
    };
    const route = {
      snapshot: {
        paramMap: {
          get: (key: string) => {
            if (key === 'id') return 'j-1';
            if (key === 'entryId') return options.entryId ?? null;
            return null;
          },
        },
      },
    };
    TestBed.configureTestingModule({
      imports: [EntryFormPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: JournalDetailStore, useValue: store },
        { provide: ActivatedRoute, useValue: route },
        { provide: ToastService, useValue: toast },
        { provide: NativeService, useValue: native },
        { provide: DateService, useClass: DateService },
      ],
    });
    const realRouter = TestBed.inject(Router);
    vi.spyOn(realRouter, 'navigateByUrl').mockImplementation(router.navigateByUrl);
    vi.spyOn(realRouter, 'navigate').mockImplementation(router.navigate);
    const fixture = TestBed.createComponent(EntryFormPage);
    fixture.detectChanges();
    return { fixture, store, toast, native, router };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('рендерит динамическую форму по колонкам шаблона', async () => {
    const { fixture } = setup();
    await vi.waitFor(() => expect(fixture.componentInstance['fields']()).toHaveLength(3));

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Новая запись');
    expect(text).toContain('Результат');
    expect(text).toContain('Подпись');
    expect(text).toContain('Сотрудник');
  });

  it('автозаполняемые колонки employee и position не дублируются в форме', async () => {
    const { fixture } = setup();
    await vi.waitFor(() => expect(fixture.componentInstance['fields']()).toHaveLength(3));

    const text: string = fixture.nativeElement.textContent;
    expect(text).not.toContain('ФИО');
    expect(text).not.toContain('Должность');
    expect(text).toContain('Результат');
    expect(fixture.nativeElement.querySelectorAll('app-form-field')).toHaveLength(4);
  });

  it('для новой записи дата по умолчанию — сегодня', async () => {
    const { fixture, store } = setup();
    const today = TestBed.inject(DateService).today();

    await vi.waitFor(() => expect(fixture.componentInstance['data']()).toEqual({ date: today }));
    expect(store.load).toHaveBeenCalledWith('j-1');
  });

  it('без сотрудника сохранение не уходит в store', async () => {
    const { fixture, store } = setup({ activeEmployees: [] });
    await vi.waitFor(() => expect(fixture.componentInstance['fields']()).toHaveLength(3));

    await fixture.componentInstance['save']();

    expect(fixture.componentInstance['errors']()['employeeId']).toBe('Выберите сотрудника');
    expect(store.addEntry).not.toHaveBeenCalled();
  });

  it('сохраняет запись, жужжит и возвращается в журнал', async () => {
    const { fixture, store, native, toast, router } = setup();
    await vi.waitFor(() => expect(fixture.componentInstance['fields']()).toHaveLength(3));
    fixture.componentInstance['employeeId'].set(employee.id);
    fixture.componentInstance['data'].set({ date: '2026-10-02', result: 'Допущен' });

    await fixture.componentInstance['save']();

    expect(store.addEntry).toHaveBeenCalledWith({
      journalId: 'j-1',
      employeeId: employee.id,
      data: { date: '2026-10-02', result: 'Допущен' },
    });
    expect(native.impact).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Запись сохранена');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/journals/j-1', { replaceUrl: true });
    expect(fixture.componentInstance['saving']()).toBe(false);
  });

  it('показывает ошибку при невалидных данных', async () => {
    const { fixture, store, toast } = setup();
    await vi.waitFor(() => expect(fixture.componentInstance['fields']()).toHaveLength(3));
    fixture.componentInstance['employeeId'].set(employee.id);
    store.validate.mockReturnValue({ result: 'Заполните поле' });

    await fixture.componentInstance['save']();

    expect(toast.error).toHaveBeenCalledWith('Проверьте заполнение полей');
    expect(store.addEntry).not.toHaveBeenCalled();
  });

  it('редактирует существующую запись через updateEntry', async () => {
    const { fixture, store } = setup({
      entryId: 'en-1',
      entries: [
        {
          id: 'en-1',
          employeeId: employee.id,
          data: { date: '2026-09-02', result: 'Ознакомлен' },
        },
      ],
    });
    await vi.waitFor(() =>
      expect(fixture.componentInstance['data']()).toEqual({
        date: '2026-09-02',
        result: 'Ознакомлен',
      }),
    );
    expect(fixture.componentInstance['isEditing']).toBe(true);
    expect(fixture.componentInstance['employeeId']()).toBe(employee.id);

    await fixture.componentInstance['save']();

    expect(store.updateEntry).toHaveBeenCalledWith('en-1', {
      date: '2026-09-02',
      result: 'Ознакомлен',
    });
    expect(store.addEntry).not.toHaveBeenCalled();
  });

  it('ошибка сохранения показывается тостом', async () => {
    const { fixture, store, toast } = setup();
    await vi.waitFor(() => expect(fixture.componentInstance['fields']()).toHaveLength(3));
    fixture.componentInstance['employeeId'].set(employee.id);
    store.addEntry.mockRejectedValue(new Error('db error'));

    await fixture.componentInstance['save']();

    expect(toast.error).toHaveBeenCalledWith('db error');
  });
});
