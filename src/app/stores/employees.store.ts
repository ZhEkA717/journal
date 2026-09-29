import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { Employee, EmployeeDraft } from '../domain/employees/employee.model';
import { EmployeeService } from '../domain/employees/employee.service';
import type { FieldErrors } from '../domain/validation.model';
import { SessionStore } from './session.store';

interface EmployeesState {
  /** Сотрудники организации. */
  readonly employees: readonly Employee[];
  /** Сколько раз проинструктирован каждый сотрудник (ТЗ 8.6). */
  readonly instructionCounts: Readonly<Record<string, number>>;
  /** Поисковый запрос из строки поиска. */
  readonly query: string;
  /** Идёт загрузка списка. */
  readonly loading: boolean;
}

/**
 * Сотрудники: список, поиск, карточки и статистика инструктажей (ТЗ 8.6).
 */
export const EmployeesStore = signalStore(
  { providedIn: 'root' },
  withState<EmployeesState>({
    employees: [],
    instructionCounts: {},
    query: '',
    loading: false,
  }),
  withComputed(({ employees, query, instructionCounts }) => ({
    /** Отфильтрованный по запросу список. */
    filtered: computed(() => {
      const needle = query().trim().toLocaleLowerCase('ru');
      if (needle.length === 0) {
        return employees();
      }
      return employees().filter((employee) =>
        `${employee.fullName} ${employee.position}`.toLocaleLowerCase('ru').includes(needle),
      );
    }),
    /** Действующие сотрудники — их можно выбрать в записи журнала. */
    active: computed(() => employees().filter((employee) => !employee.firedAt)),
    /** Есть ли хотя бы один сотрудник. */
    hasEmployees: computed(() => employees().length > 0),
    /** Сотрудник по идентификатору. */
    byId: computed(() => {
      const map = new Map<string, Employee>();
      for (const employee of employees()) {
        map.set(employee.id, employee);
      }
      return map;
    }),
    /** Счётчик инструктажей сотрудника. */
    instructionsOf: computed(() => (id: string) => instructionCounts()[id] ?? 0),
  })),
  withMethods((store) => {
    const employeeService = inject(EmployeeService);
    const session = inject(SessionStore);

    /** Загружает сотрудников и счётчики инструктажей из IndexedDB. */
    const load = async (): Promise<void> => {
      const orgId = session.organizationId();
      if (!orgId) {
        patchState(store, { employees: [], instructionCounts: {}, loading: false });
        return;
      }
      patchState(store, { loading: true });
      const employees = await employeeService.listByOrg(orgId);
      const counts = await Promise.all(
        employees.map(
          async (employee) =>
            [employee.id, await employeeService.instructionCount(employee.id)] as const,
        ),
      );
      patchState(store, {
        employees,
        instructionCounts: Object.fromEntries(counts),
        loading: false,
      });
    };

    return {
      load,

      /** Устанавливает поисковый запрос. */
      setQuery(query: string): void {
        patchState(store, { query });
      },

      /** Создаёт сотрудника и перезагружает список. */
      async create(draft: EmployeeDraft): Promise<Employee> {
        const orgId = session.organizationId();
        if (!orgId) {
          throw new Error('Организация не создана');
        }
        const employee = await employeeService.create(orgId, draft);
        await load();
        return employee;
      },

      /** Обновляет карточку сотрудника и перезагружает список. */
      async update(id: string, draft: EmployeeDraft): Promise<Employee> {
        const employee = await employeeService.update(id, draft);
        await load();
        return employee;
      },

      /** Помечает сотрудника уволенным и перезагружает список. */
      async fire(id: string): Promise<Employee> {
        const employee = await employeeService.fire(id);
        await load();
        return employee;
      },

      /** Возвращает сотрудника в штат и перезагружает список. */
      async restore(id: string): Promise<Employee> {
        const employee = await employeeService.restore(id);
        await load();
        return employee;
      },

      /** Удаляет сотрудника и перезагружает список. */
      async remove(id: string): Promise<Employee> {
        const employee = await employeeService.remove(id);
        await load();
        return employee;
      },

      /** Проверяет карточку сотрудника перед сохранением (ТЗ 8.6). */
      validate(draft: EmployeeDraft): FieldErrors {
        return employeeService.validate(draft);
      },
    };
  }),
);
