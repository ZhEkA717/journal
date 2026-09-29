import { Injectable } from '@angular/core';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import relativeTime from 'dayjs/plugin/relativeTime';

/** Единственная точка входа для работы с датами (TZ 9.1). */
@Injectable({ providedIn: 'root' })
export class DateService {
  /** Текущий момент. */
  now(): Dayjs {
    return dayjs();
  }

  /** Сегодняшняя дата в формате ISO `YYYY-MM-DD`. */
  today(): string {
    return dayjs().format(ISO_DATE);
  }

  /** Текущий момент как Unix-таймстемп в миллисекундах. */
  nowTimestamp(): number {
    return dayjs().valueOf();
  }

  /** Форматирование даты; по умолчанию `DD.MM.YYYY` (TZ 9.1). */
  format(date: string | number | Dayjs, fmt: string = RU_DATE): string {
    return this.toDayjs(date).format(fmt);
  }

  /** Разбор строки; при `fmt` используется строгий разбор по маске. */
  parse(input: string, fmt?: string): Dayjs {
    return fmt ? dayjs(input, fmt, true) : dayjs(input);
  }

  /** Число дней от `b` до `a` (положительное, если `a` позже). */
  diffDays(a: string | Dayjs, b: string | Dayjs): number {
    return this.toDayjs(a).startOf('day').diff(this.toDayjs(b).startOf('day'), 'day');
  }

  /** Совпадают ли календарные дни. */
  isSameDay(a: string | number | Dayjs, b: string | number | Dayjs): boolean {
    return this.toDayjs(a).isSame(this.toDayjs(b), 'day');
  }

  /** Смещение даты на `days` с возвратом в ISO-формате. */
  addDays(date: string | number | Dayjs, days: number): string {
    return this.toDayjs(date).add(days, 'day').format(ISO_DATE);
  }

  /** «5 минут назад», «вчера» или `DD.MM.YYYY` — для UI. */
  humanize(date: string | number | Dayjs): string {
    const value = this.toDayjs(date);
    if (value.isSame(dayjs(), 'day')) {
      return value.fromNow();
    }
    if (value.isSame(dayjs().subtract(1, 'day'), 'day')) {
      return 'вчера';
    }
    return value.format(RU_DATE);
  }

  /** Значение для `IonDatetime` (ISO 8601 с таймзоной). */
  toIsoDatetime(date: string | number | Dayjs): string {
    return this.toDayjs(date).toISOString();
  }

  private toDayjs(date: string | number | Dayjs): Dayjs {
    return dayjs.isDayjs(date) ? date : dayjs(date);
  }
}

const ISO_DATE = 'YYYY-MM-DD';
const RU_DATE = 'DD.MM.YYYY';

dayjs.locale('ru');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);
