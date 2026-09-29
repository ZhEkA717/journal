import type { VersionedEntity } from '../../core/models/base.model';

/** Категория журнала (TZ 5.2). */
export type JournalCategory = 'fire_safety' | 'labor_safety' | 'vacation' | 'custom';

/** Тип поля в динамической форме записи (TZ 5.2). */
export type ColumnType = 'text' | 'date' | 'number' | 'select' | 'signature';

/** Описание одной колонки журнала (TZ 5.2). */
export interface ColumnDef {
  readonly key: string;
  readonly label: string;
  readonly type: ColumnType;
  readonly required: boolean;
  readonly options?: readonly string[];
  readonly width?: number;
}

/** Шаблон журнала; `isSystem` — встроенный по ГОСТ (TZ 5.2). */
export interface JournalTemplate extends VersionedEntity {
  readonly id: string;
  readonly orgId?: string;
  readonly name: string;
  readonly category: JournalCategory;
  readonly columns: readonly ColumnDef[];
  readonly legalRef?: string;
  readonly isSystem: boolean;
  readonly iconName: string;
  readonly color: string;
}
