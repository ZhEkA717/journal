/**
 * Типы базы Supabase (ТЗ 11.1). Соответствуют SQL-схеме из
 * `docs/supabase-schema.sql` — при изменении схемы обновлять вручную или
 * перегенерировать через `supabase gen types typescript`.
 */

/** Значение колонки `jsonb` (`templates.columns`, `entries.data`). */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * `interface ... extends Record<string, unknown>` нужен, чтобы строки
 * удовлетворяли `GenericTable` из supabase-js: интерфейсы без явного
 * индексного поля не наследуют неявную сигнатуру Record (TS #15300).
 */
interface UserForeignKey {
  foreignKeyName: string;
  columns: ['user_id'];
  referencedRelation: 'users';
  referencedColumns: ['id'];
}

interface OrganizationRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  name: string;
  inn: string | null;
  address: string | null;
  responsible_person: string | null;
  created_at: number | null;
  updated_at: number | null;
  deleted_at: number | null;
}

interface OrganizationInsert extends Record<string, unknown> {
  id: string;
  user_id: string;
  name: string;
  inn?: string | null;
  address?: string | null;
  responsible_person?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
  deleted_at?: number | null;
}

interface EmployeeRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  org_id: string;
  full_name: string;
  position: string | null;
  birth_date: string | null;
  hired_at: string | null;
  fired_at: string | null;
  signature: string | null;
  created_at: number | null;
  updated_at: number | null;
  deleted_at: number | null;
}

interface EmployeeInsert extends Record<string, unknown> {
  id: string;
  user_id: string;
  org_id: string;
  full_name: string;
  position?: string | null;
  birth_date?: string | null;
  hired_at?: string | null;
  fired_at?: string | null;
  signature?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
  deleted_at?: number | null;
}

interface TemplateRow extends Record<string, unknown> {
  id: string;
  user_id: string | null;
  org_id: string | null;
  name: string;
  category: string | null;
  columns: Json;
  legal_ref: string | null;
  is_system: boolean | null;
  icon_name: string | null;
  color: string | null;
  created_at: number | null;
  updated_at: number | null;
}

interface TemplateInsert extends Record<string, unknown> {
  id: string;
  user_id?: string | null;
  org_id?: string | null;
  name: string;
  category?: string | null;
  columns: Json;
  legal_ref?: string | null;
  is_system?: boolean | null;
  icon_name?: string | null;
  color?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
}

interface JournalRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  org_id: string;
  template_id: string;
  title: string;
  started_at: string | null;
  closed_at: string | null;
  responsible_person: string | null;
  created_at: number | null;
  updated_at: number | null;
  deleted_at: number | null;
}

interface JournalInsert extends Record<string, unknown> {
  id: string;
  user_id: string;
  org_id: string;
  template_id: string;
  title: string;
  started_at?: string | null;
  closed_at?: string | null;
  responsible_person?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
  deleted_at?: number | null;
}

interface EntryRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  journal_id: string;
  employee_id: string;
  data: Json;
  created_at: number | null;
  updated_at: number | null;
  deleted_at: number | null;
}

interface EntryInsert extends Record<string, unknown> {
  id: string;
  user_id: string;
  journal_id: string;
  employee_id: string;
  data: Json;
  created_at?: number | null;
  updated_at?: number | null;
  deleted_at?: number | null;
}

/** Схема публичных таблиц проекта (ТЗ 11.1). */
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: OrganizationInsert;
        Update: Partial<OrganizationRow>;
        Relationships: [UserForeignKey & { foreignKeyName: 'organizations_user_id_fkey' }];
      };
      employees: {
        Row: EmployeeRow;
        Insert: EmployeeInsert;
        Update: Partial<EmployeeRow>;
        Relationships: [
          UserForeignKey & { foreignKeyName: 'employees_user_id_fkey' },
          {
            foreignKeyName: 'employees_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      templates: {
        Row: TemplateRow;
        Insert: TemplateInsert;
        Update: Partial<TemplateRow>;
        Relationships: [
          UserForeignKey & { foreignKeyName: 'templates_user_id_fkey' },
          {
            foreignKeyName: 'templates_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      journals: {
        Row: JournalRow;
        Insert: JournalInsert;
        Update: Partial<JournalRow>;
        Relationships: [
          UserForeignKey & { foreignKeyName: 'journals_user_id_fkey' },
          {
            foreignKeyName: 'journals_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'journals_template_id_fkey';
            columns: ['template_id'];
            referencedRelation: 'templates';
            referencedColumns: ['id'];
          },
        ];
      };
      entries: {
        Row: EntryRow;
        Insert: EntryInsert;
        Update: Partial<EntryRow>;
        Relationships: [
          UserForeignKey & { foreignKeyName: 'entries_user_id_fkey' },
          {
            foreignKeyName: 'entries_journal_id_fkey';
            columns: ['journal_id'];
            referencedRelation: 'journals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entries_employee_id_fkey';
            columns: ['employee_id'];
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
