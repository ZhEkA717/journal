import type { VersionedEntity } from '../models/base.model';
import type { SyncEntityType } from '../models/sync-queue.model';
import type { Employee } from '../../domain/employees/employee.model';
import type { JournalEntry } from '../../domain/journals/journal-entry.model';
import type { ColumnDef, JournalTemplate } from '../../domain/journals/journal-template.model';
import type { Journal } from '../../domain/journals/journal.model';
import type { Organization } from '../../domain/organizations/organization.model';
import type { Database, Json } from '../supabase/supabase.types';

/** Таблицы публичной схемы Supabase (ТЗ 11.1). */
type Tables = Database['public']['Tables'];

/**
 * Преобразует локальную сущность в строку Supabase: camelCase → snake_case,
 * `user_id` из активной сессии, отсутствующие поля → `null` (ТЗ 11.1, 11.3).
 */
export function organizationToRemote(
  payload: unknown,
  userId: string,
): Tables['organizations']['Insert'] {
  const organization = requireEntity<Organization>(payload, 'organization');
  return {
    id: organization.id,
    user_id: userId,
    name: organization.name,
    inn: organization.inn ?? null,
    address: organization.address ?? null,
    responsible_person: organization.responsiblePerson,
    created_at: organization.createdAt,
    updated_at: organization.updatedAt,
    deleted_at: organization.deletedAt ?? null,
  };
}

/** Строка Supabase → локальная организация (`syncStatus: 'synced'`). */
export function organizationToLocal(row: Tables['organizations']['Row']): Organization {
  return {
    id: row.id,
    name: row.name,
    inn: row.inn ?? undefined,
    address: row.address ?? undefined,
    responsiblePerson: row.responsible_person ?? '',
    createdAt: row.created_at ?? 0,
    updatedAt: row.updated_at ?? row.created_at ?? 0,
    syncStatus: 'synced',
    deletedAt: row.deleted_at ?? undefined,
  };
}

/** Локальный сотрудник → строка Supabase. */
export function employeeToRemote(payload: unknown, userId: string): Tables['employees']['Insert'] {
  const employee = requireEntity<Employee>(payload, 'employee');
  return {
    id: employee.id,
    user_id: userId,
    org_id: employee.orgId,
    full_name: employee.fullName,
    position: employee.position || null,
    birth_date: employee.birthDate ?? null,
    hired_at: employee.hiredAt || null,
    fired_at: employee.firedAt ?? null,
    signature: employee.signature ?? null,
    created_at: employee.createdAt,
    updated_at: employee.updatedAt,
    deleted_at: employee.deletedAt ?? null,
  };
}

/** Строка Supabase → локальный сотрудник. */
export function employeeToLocal(row: Tables['employees']['Row']): Employee {
  return {
    id: row.id,
    orgId: row.org_id,
    fullName: row.full_name,
    position: row.position ?? '',
    birthDate: row.birth_date ?? undefined,
    hiredAt: row.hired_at ?? '',
    firedAt: row.fired_at ?? undefined,
    signature: row.signature ?? undefined,
    createdAt: row.created_at ?? 0,
    updatedAt: row.updated_at ?? row.created_at ?? 0,
    syncStatus: 'synced',
    deletedAt: row.deleted_at ?? undefined,
  };
}

/** Локальный журнал → строка Supabase. */
export function journalToRemote(payload: unknown, userId: string): Tables['journals']['Insert'] {
  const journal = requireEntity<Journal>(payload, 'journal');
  return {
    id: journal.id,
    user_id: userId,
    org_id: journal.orgId,
    template_id: journal.templateId,
    title: journal.title,
    started_at: journal.startedAt || null,
    closed_at: journal.closedAt ?? null,
    responsible_person: journal.responsiblePerson || null,
    created_at: journal.createdAt,
    updated_at: journal.updatedAt,
    deleted_at: journal.deletedAt ?? null,
  };
}

/** Строка Supabase → локальный журнал. */
export function journalToLocal(row: Tables['journals']['Row']): Journal {
  return {
    id: row.id,
    orgId: row.org_id,
    templateId: row.template_id,
    title: row.title ?? '',
    startedAt: row.started_at ?? '',
    closedAt: row.closed_at ?? undefined,
    responsiblePerson: row.responsible_person ?? '',
    createdAt: row.created_at ?? 0,
    updatedAt: row.updated_at ?? row.created_at ?? 0,
    syncStatus: 'synced',
    deletedAt: row.deleted_at ?? undefined,
  };
}

/** Локальная запись журнала → строка Supabase. */
export function entryToRemote(payload: unknown, userId: string): Tables['entries']['Insert'] {
  const entry = requireEntity<JournalEntry>(payload, 'entry');
  return {
    id: entry.id,
    user_id: userId,
    journal_id: entry.journalId,
    employee_id: entry.employeeId,
    data: entry.data as Json,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    deleted_at: entry.deletedAt ?? null,
  };
}

/** Строка Supabase → локальная запись журнала. */
export function entryToLocal(row: Tables['entries']['Row']): JournalEntry {
  return {
    id: row.id,
    journalId: row.journal_id,
    employeeId: row.employee_id,
    data: row.data as JournalEntry['data'],
    createdAt: row.created_at ?? 0,
    updatedAt: row.updated_at ?? row.created_at ?? 0,
    syncStatus: 'synced',
    deletedAt: row.deleted_at ?? undefined,
  };
}

/** Локальный шаблон → строка Supabase. */
export function templateToRemote(payload: unknown, userId: string): Tables['templates']['Insert'] {
  const template = requireEntity<JournalTemplate>(payload, 'template');
  return {
    id: template.id,
    user_id: userId,
    org_id: template.orgId ?? null,
    name: template.name,
    category: template.category,
    columns: columnsToRemote(template.columns),
    legal_ref: template.legalRef ?? null,
    is_system: template.isSystem,
    icon_name: template.iconName,
    color: template.color,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

/** Строка Supabase → локальный шаблон. */
export function templateToLocal(row: Tables['templates']['Row']): JournalTemplate {
  return {
    id: row.id,
    orgId: row.org_id ?? undefined,
    name: row.name,
    category: row.category as JournalTemplate['category'],
    // jsonb-схема колонок задана клиентом и подтверждена типами ТЗ 5.2.
    columns: row.columns as unknown as readonly ColumnDef[],
    legalRef: row.legal_ref ?? undefined,
    isSystem: row.is_system ?? false,
    iconName: row.icon_name ?? 'book-outline',
    color: row.color ?? '#64748B',
    createdAt: row.created_at ?? 0,
    updatedAt: row.updated_at ?? row.created_at ?? 0,
  };
}

/** Колонки шаблона → `jsonb` без readonly-модификаторов. */
function columnsToRemote(columns: readonly ColumnDef[]): Json {
  return columns.map((column) => ({
    key: column.key,
    label: column.label,
    type: column.type,
    required: column.required,
    options: column.options ? [...column.options] : undefined,
    width: column.width,
  })) as Json;
}

/** Проверяет, что payload операции — объект с идентификатором. */
function requireEntity<T>(payload: unknown, entityType: SyncEntityType): T {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(`Некорректный payload операции: ${entityType}`);
  }
  const id = (payload as { id?: unknown }).id;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(`Некорректный payload операции: ${entityType}`);
  }
  return payload as T;
}

/** Определяет, похоже ли значение на версионную сущность (ТЗ 5.1). */
export function isVersioned(value: unknown): value is VersionedEntity {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { id?: unknown; updatedAt?: unknown };
  return typeof record.id === 'string' && typeof record.updatedAt === 'number';
}
