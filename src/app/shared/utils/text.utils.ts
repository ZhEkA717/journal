/** Инициалы для аватара сотрудника: «Иванов Иван Иванович» → «ИИ». */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join('') || '—';
}

/** Короткое имя для строки таблицы: оставляет фамилию и имя. */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) {
    return parts.join(' ');
  }
  return parts.slice(0, 2).join(' ');
}
