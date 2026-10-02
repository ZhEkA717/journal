import { TestBed } from '@angular/core/testing';

import { DateHumanPipe, DateRuPipe } from '../date-ru.pipe';

describe('DateRuPipe', () => {
  let pipe: DateRuPipe;

  beforeEach(() => {
    pipe = TestBed.runInInjectionContext(() => new DateRuPipe());
  });

  it('форматирует дату как DD.MM.YYYY', () => {
    expect(pipe.transform('2026-09-01')).toBe('01.09.2026');
  });

  it('поддерживает свой формат', () => {
    expect(pipe.transform('2026-09-01', 'MMMM YYYY')).toBe('сентябрь 2026');
  });

  it('возвращает прочерк для пустого значения', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('')).toBe('—');
  });
});

describe('DateHumanPipe', () => {
  let pipe: DateHumanPipe;

  beforeEach(() => {
    pipe = TestBed.runInInjectionContext(() => new DateHumanPipe());
  });

  it('возвращает прочерк для пустого значения', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('возвращает дату для старых значений', () => {
    expect(pipe.transform('2020-05-05')).toBe('05.05.2020');
  });
});
