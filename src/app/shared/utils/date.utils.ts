/** Паттерн даты в формате ISO `YYYY-MM-DD`, который хранится в БД (ТЗ 5.1). */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Строка является датой в ISO-формате (без проверки календарной корректности). */
export function isIsoDate(value: string | null | undefined): boolean {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value);
}

/** Значение поля даты, если оно заполнено, иначе `undefined`. */
export function optionalIsoDate(value: string | null | undefined): string | undefined {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
}
