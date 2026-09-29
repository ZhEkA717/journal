import { TestBed } from '@angular/core/testing';

import { DateService } from './date.service';

describe('DateService', () => {
  let service: DateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DateService);
  });

  it('возвращает сегодняшнюю дату в ISO-формате', () => {
    expect(service.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('форматирует дату по умолчанию как DD.MM.YYYY', () => {
    expect(service.format('2026-09-01')).toBe('01.09.2026');
  });

  it('поддерживает произвольный формат', () => {
    expect(service.format('2026-09-01', 'YYYY/MM')).toBe('2026/09');
  });

  it('считает разницу в днях независимо от времени суток', () => {
    expect(service.diffDays('2026-09-03T23:00:00', '2026-09-01T01:00:00')).toBe(2);
  });

  it('определяет совпадение календарных дней', () => {
    expect(service.isSameDay('2026-09-01T08:00:00', '2026-09-01T20:00:00')).toBe(true);
    expect(service.isSameDay('2026-09-01', '2026-09-02')).toBe(false);
  });

  it('смещает дату и возвращает ISO-строку', () => {
    expect(service.addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(service.addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('разбирает дату по маске в строгом режиме', () => {
    expect(service.parse('01.09.2026', 'DD.MM.YYYY').isValid()).toBe(true);
    expect(service.parse('32.09.2026', 'DD.MM.YYYY').isValid()).toBe(false);
  });

  it('humanize отдаёт относительное время для сегодняшнего дня', () => {
    const fiveMinutesAgo = service.now().subtract(5, 'minute').toISOString();
    expect(service.humanize(fiveMinutesAgo)).toContain('минут');
  });

  it('humanize отдаёт «вчера» для вчерашнего дня', () => {
    expect(service.humanize(service.addDays(service.today(), -1))).toBe('вчера');
  });

  it('humanize отдаёт дату для старых дней', () => {
    expect(service.humanize('2020-05-05')).toBe('05.05.2020');
  });

  it('nowTimestamp возвращает Unix-мс', () => {
    const before = Date.now();
    const stamp = service.nowTimestamp();
    expect(stamp).toBeGreaterThanOrEqual(before);
    expect(stamp).toBeLessThanOrEqual(Date.now());
  });
});
