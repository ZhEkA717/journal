import type { JournalTemplate } from '../journals/journal-template.model';

/**
 * Три системных шаблона по ГОСТ (TZ 7). Время создания проставляется при seed,
 * поэтому здесь только статическое содержимое.
 */
export const SYSTEM_TEMPLATES: readonly Omit<JournalTemplate, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'sys-fire-safety',
    name: 'Журнал инструктажа по пожарной безопасности',
    category: 'fire_safety',
    iconName: 'flame-outline',
    color: '#DC2626',
    isSystem: true,
    legalRef: 'Приказ МЧС России от 18.11.2021 № 806',
    columns: [
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'employee', label: 'ФИО', type: 'text', required: true },
      { key: 'position', label: 'Должность', type: 'text', required: true },
      {
        key: 'type',
        label: 'Вид инструктажа',
        type: 'select',
        required: true,
        options: ['Вводный', 'Первичный', 'Повторный', 'Внеплановый', 'Целевой'],
      },
      { key: 'reason', label: 'Причина', type: 'text', required: false },
      { key: 'signature', label: 'Подпись', type: 'signature', required: true },
    ],
  },
  {
    id: 'sys-labor-safety',
    name: 'Журнал инструктажа по охране труда',
    category: 'labor_safety',
    iconName: 'shield-checkmark-outline',
    color: '#1E40AF',
    isSystem: true,
    legalRef: 'Постановление Минтруда № 1/29 от 13.01.2003',
    columns: [
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'employee', label: 'ФИО', type: 'text', required: true },
      { key: 'position', label: 'Профессия', type: 'text', required: true },
      {
        key: 'type',
        label: 'Вид инструктажа',
        type: 'select',
        required: true,
        options: ['Вводный', 'Первичный', 'Повторный', 'Внеплановый', 'Целевой'],
      },
      { key: 'signature', label: 'Подпись', type: 'signature', required: true },
    ],
  },
  {
    id: 'sys-vacation',
    name: 'Журнал учёта отпусков',
    category: 'vacation',
    iconName: 'sunny-outline',
    color: '#16A34A',
    isSystem: true,
    columns: [
      { key: 'employee', label: 'ФИО', type: 'text', required: true },
      { key: 'position', label: 'Должность', type: 'text', required: true },
      { key: 'startDate', label: 'Дата начала', type: 'date', required: true },
      { key: 'endDate', label: 'Дата окончания', type: 'date', required: true },
      { key: 'days', label: 'Кол-во дней', type: 'number', required: true },
      { key: 'signature', label: 'Подпись', type: 'signature', required: true },
    ],
  },
];

/** Человеко-читаемые названия категорий для UI. */
export const CATEGORY_LABELS: Readonly<Record<JournalTemplate['category'], string>> = {
  fire_safety: 'Пожарная безопасность',
  labor_safety: 'Охрана труда',
  vacation: 'Учёт отпусков',
  custom: 'Свой журнал',
};

/** Название категории с запасным вариантом для неизвестных значений. */
export function categoryLabel(category: JournalTemplate['category']): string {
  return CATEGORY_LABELS[category] ?? CATEGORY_LABELS.custom;
}
