import type { Employee } from '../../../domain/employees/employee.model';
import type { JournalEntry } from '../../../domain/journals/journal-entry.model';
import type { ColumnDef, JournalTemplate } from '../../../domain/journals/journal-template.model';
import type { Journal } from '../../../domain/journals/journal.model';
import type { Organization } from '../../../domain/organizations/organization.model';
import type { Database } from '../../supabase/supabase.types';
import {
  employeeToLocal,
  employeeToRemote,
  entryToLocal,
  entryToRemote,
  isVersioned,
  journalToLocal,
  journalToRemote,
  organizationToLocal,
  organizationToRemote,
  templateToLocal,
  templateToRemote,
} from '../remote-mappers';

type Tables = Database['public']['Tables'];

function makeOrganization(): Organization {
  return {
    id: 'org-1',
    name: 'ООО Ромашка',
    inn: '7701234567',
    address: 'Москва, ул. Ленина, 1',
    responsiblePerson: 'Иванов Иван',
    createdAt: 1_000,
    updatedAt: 2_000,
    syncStatus: 'pending',
    deletedAt: 9_000,
  };
}

function makeEmployee(): Employee {
  return {
    id: 'emp-1',
    orgId: 'org-1',
    fullName: 'Петров Пётр',
    position: 'Электромонтёр',
    birthDate: '1990-05-04',
    hiredAt: '2024-03-01',
    firedAt: '2026-01-15',
    signature: 'data:image/png;base64,AAAA',
    createdAt: 1_000,
    updatedAt: 2_000,
    syncStatus: 'pending',
    deletedAt: 3_000,
  };
}

function makeJournal(): Journal {
  return {
    id: 'j-1',
    orgId: 'org-1',
    templateId: 'sys-fire-safety',
    title: 'Журнал пожарной безопасности',
    startedAt: '2026-01-01',
    closedAt: '2026-12-31',
    responsiblePerson: 'Иванов Иван',
    createdAt: 1_000,
    updatedAt: 2_000,
    syncStatus: 'pending',
  };
}

function makeEntry(): JournalEntry {
  return {
    id: 'e-1',
    journalId: 'j-1',
    employeeId: 'emp-1',
    data: { date: '2026-09-01', hours: 8 },
    createdAt: 1_000,
    updatedAt: 2_000,
    syncStatus: 'pending',
    deletedAt: 5_000,
  };
}

function makeTemplate(): JournalTemplate {
  const columns: readonly ColumnDef[] = [
    { key: 'date', label: 'Дата', type: 'date', required: true },
    {
      key: 'shift',
      label: 'Смена',
      type: 'select',
      required: false,
      options: ['1', '2'],
      width: 120,
    },
  ];
  return {
    id: 't-1',
    orgId: 'org-1',
    name: 'Внутренний шаблон',
    category: 'custom',
    columns,
    legalRef: 'ГОСТ 12.0.004-2010',
    isSystem: false,
    iconName: 'document-outline',
    color: '#64748B',
    createdAt: 1_000,
    updatedAt: 2_000,
  };
}

describe('organizationToRemote', () => {
  it('переводит поля в snake_case и подставляет user_id', () => {
    const row = organizationToRemote(makeOrganization(), 'user-1');

    expect(row).toEqual({
      id: 'org-1',
      user_id: 'user-1',
      name: 'ООО Ромашка',
      inn: '7701234567',
      address: 'Москва, ул. Ленина, 1',
      responsible_person: 'Иванов Иван',
      created_at: 1_000,
      updated_at: 2_000,
      deleted_at: 9_000,
    });
  });

  it('заменяет отсутствующие необязательные поля на null', () => {
    const organization = {
      ...makeOrganization(),
      inn: undefined,
      address: undefined,
      deletedAt: undefined,
    };
    const row = organizationToRemote(organization, 'user-1');

    expect(row.inn).toBeNull();
    expect(row.address).toBeNull();
    expect(row.deleted_at).toBeNull();
  });

  it('бросает ошибку на некорректном payload', () => {
    expect(() => organizationToRemote(null, 'user-1')).toThrow(
      'Некорректный payload операции: organization',
    );
    expect(() => organizationToRemote({ name: 'Без идентификатора' }, 'user-1')).toThrow(
      'Некорректный payload операции: organization',
    );
  });
});

describe('organizationToLocal', () => {
  it('переводит строку сервера в локальную модель со статусом synced', () => {
    const local = organizationToLocal({
      id: 'org-1',
      user_id: 'user-1',
      name: 'ООО Ромашка',
      inn: null,
      address: null,
      responsible_person: 'Иванов Иван',
      created_at: 1_000,
      updated_at: 2_000,
      deleted_at: null,
    } as Tables['organizations']['Row']);

    expect(local).toEqual({
      id: 'org-1',
      name: 'ООО Ромашка',
      inn: undefined,
      address: undefined,
      responsiblePerson: 'Иванов Иван',
      createdAt: 1_000,
      updatedAt: 2_000,
      syncStatus: 'synced',
      deletedAt: undefined,
    });
  });

  it('подставляет created_at, когда updated_at в строке пуст', () => {
    const local = organizationToLocal({
      id: 'org-1',
      name: 'ООО Ромашка',
      responsible_person: 'Иванов Иван',
      created_at: 1_000,
      updated_at: null,
    } as unknown as Tables['organizations']['Row']);

    expect(local.updatedAt).toBe(1_000);
    expect(local.responsiblePerson).toBe('Иванов Иван');
  });
});

describe('employeeToRemote / employeeToLocal', () => {
  it('переводит сотрудника в строку и обратно без потери полей', () => {
    const row = employeeToRemote(makeEmployee(), 'user-1');

    expect(row).toEqual({
      id: 'emp-1',
      user_id: 'user-1',
      org_id: 'org-1',
      full_name: 'Петров Пётр',
      position: 'Электромонтёр',
      birth_date: '1990-05-04',
      hired_at: '2024-03-01',
      fired_at: '2026-01-15',
      signature: 'data:image/png;base64,AAAA',
      created_at: 1_000,
      updated_at: 2_000,
      deleted_at: 3_000,
    });

    const local = employeeToLocal(row as Tables['employees']['Row']);
    expect(local.fullName).toBe('Петров Пётр');
    expect(local.signature).toBe('data:image/png;base64,AAAA');
    expect(local.syncStatus).toBe('synced');
    expect(local.deletedAt).toBe(3_000);
  });

  it('пустая строка сервера даёт пустые даты, а не null', () => {
    const local = employeeToLocal({
      id: 'emp-2',
      org_id: 'org-1',
      full_name: 'Сидова Аня',
      position: null,
      birth_date: null,
      hired_at: null,
      fired_at: null,
      signature: null,
      created_at: 1_000,
      updated_at: null,
      deleted_at: null,
    } as Tables['employees']['Row']);

    expect(local.position).toBe('');
    expect(local.hiredAt).toBe('');
    expect(local.birthDate).toBeUndefined();
  });
});

describe('journalToRemote / journalToLocal', () => {
  it('переводит журнал в строку и обратно', () => {
    const row = journalToRemote(makeJournal(), 'user-1');

    expect(row).toEqual({
      id: 'j-1',
      user_id: 'user-1',
      org_id: 'org-1',
      template_id: 'sys-fire-safety',
      title: 'Журнал пожарной безопасности',
      started_at: '2026-01-01',
      closed_at: '2026-12-31',
      responsible_person: 'Иванов Иван',
      created_at: 1_000,
      updated_at: 2_000,
      deleted_at: null,
    });

    const local = journalToLocal(row as Tables['journals']['Row']);
    expect(local.title).toBe('Журнал пожарной безопасности');
    expect(local.closedAt).toBe('2026-12-31');
    expect(local.syncStatus).toBe('synced');
  });
});

describe('entryToRemote / entryToLocal', () => {
  it('кладёт динамические данные записи в jsonb', () => {
    const row = entryToRemote(makeEntry(), 'user-1');

    expect(row.data).toEqual({ date: '2026-09-01', hours: 8 });
    expect(row.user_id).toBe('user-1');
    expect(row.journal_id).toBe('j-1');
    expect(row.employee_id).toBe('emp-1');

    const local = entryToLocal(row as Tables['entries']['Row']);
    expect(local.data).toEqual({ date: '2026-09-01', hours: 8 });
    expect(local.syncStatus).toBe('synced');
  });
});

describe('templateToRemote / templateToLocal', () => {
  it('переводит колонки шаблона в jsonb и обратно', () => {
    const row = templateToRemote(makeTemplate(), 'user-1');

    expect(row.org_id).toBe('org-1');
    expect(row.legal_ref).toBe('ГОСТ 12.0.004-2010');
    expect(row.is_system).toBe(false);
    expect(row.columns).toEqual([
      {
        key: 'date',
        label: 'Дата',
        type: 'date',
        required: true,
        options: undefined,
        width: undefined,
      },
      {
        key: 'shift',
        label: 'Смена',
        type: 'select',
        required: false,
        options: ['1', '2'],
        width: 120,
      },
    ]);

    const local = templateToLocal(row as Tables['templates']['Row']);
    expect(local.name).toBe('Внутренний шаблон');
    expect(local.columns).toHaveLength(2);
    expect(local.columns[1]?.options).toEqual(['1', '2']);
    expect('syncStatus' in local).toBe(false);
  });

  it('системный шаблон без организации уходит с org_id = null', () => {
    const template = { ...makeTemplate(), orgId: undefined, isSystem: true };
    const row = templateToRemote(template, 'user-1');

    expect(row.org_id).toBeNull();
    expect(row.is_system).toBe(true);
  });
});

describe('isVersioned', () => {
  it('узнаёт объект со строковым id и числовым updatedAt', () => {
    expect(isVersioned({ id: 'a', updatedAt: 1 })).toBe(true);
  });

  it('отвергает null, примитивы и объекты без полей версии', () => {
    expect(isVersioned(null)).toBe(false);
    expect(isVersioned('строка')).toBe(false);
    expect(isVersioned({ id: 'a' })).toBe(false);
    expect(isVersioned({ id: 42, updatedAt: 1 })).toBe(false);
    expect(isVersioned({ id: 'a', updatedAt: '1' })).toBe(false);
  });
});
