/** Текст ошибки из `unknown`: `Error.message` либо запасной вариант (ТЗ 8.3). */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}
