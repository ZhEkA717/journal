import { Pipe, type PipeTransform, inject } from '@angular/core';

import { DateService } from '../../core/date/date.service';

const EMPTY_PLACEHOLDER = '—';

/** Форматирование даты для UI: по умолчанию `DD.MM.YYYY` (ТЗ 9.1). */
@Pipe({ name: 'dateRu' })
export class DateRuPipe implements PipeTransform {
  private readonly date = inject(DateService);

  transform(value: string | number | null | undefined, format?: string): string {
    if (value === null || value === undefined || value === '') {
      return EMPTY_PLACEHOLDER;
    }
    return this.date.format(value, format);
  }
}

/** Относительная дата: «5 минут назад», «вчера», иначе `DD.MM.YYYY`. */
@Pipe({ name: 'dateHuman' })
export class DateHumanPipe implements PipeTransform {
  private readonly date = inject(DateService);

  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return EMPTY_PLACEHOLDER;
    }
    return this.date.humanize(value);
  }
}
