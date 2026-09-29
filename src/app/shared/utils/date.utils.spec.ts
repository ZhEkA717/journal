import { isIsoDate, optionalIsoDate } from './date.utils';

describe('isIsoDate', () => {
  it('принимает дату в формате YYYY-MM-DD', () => {
    expect(isIsoDate('2026-09-01')).toBe(true);
  });

  it('отклоняет другие форматы', () => {
    expect(isIsoDate('01.09.2026')).toBe(false);
    expect(isIsoDate('2026-9-1')).toBe(false);
    expect(isIsoDate('2026-09-01T10:00:00')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('безопасно обрабатывает пустые значения', () => {
    expect(isIsoDate(null)).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});

describe('optionalIsoDate', () => {
  it('возвращает заполненное значение', () => {
    expect(optionalIsoDate(' 2026-09-01 ')).toBe('2026-09-01');
  });

  it('возвращает undefined для пустого значения', () => {
    expect(optionalIsoDate('   ')).toBeUndefined();
    expect(optionalIsoDate(null)).toBeUndefined();
  });
});
