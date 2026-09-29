import { PluralPipe } from './plural.pipe';

describe('PluralPipe', () => {
  let pipe: PluralPipe;

  beforeEach(() => {
    pipe = new PluralPipe();
  });

  it('выбирает форму для 1', () => {
    expect(pipe.transform(1, 'запись', 'записи', 'записей')).toBe('запись');
    expect(pipe.transform(21, 'запись', 'записи', 'записей')).toBe('запись');
    expect(pipe.transform(101, 'запись', 'записи', 'записей')).toBe('запись');
  });

  it('выбирает форму для 2-4', () => {
    expect(pipe.transform(2, 'запись', 'записи', 'записей')).toBe('записи');
    expect(pipe.transform(4, 'запись', 'записи', 'записей')).toBe('записи');
    expect(pipe.transform(23, 'запись', 'записи', 'записей')).toBe('записи');
  });

  it('выбирает форму для 0, 5 и 11-14', () => {
    expect(pipe.transform(0, 'запись', 'записи', 'записей')).toBe('записей');
    expect(pipe.transform(5, 'запись', 'записи', 'записей')).toBe('записей');
    expect(pipe.transform(11, 'запись', 'записи', 'записей')).toBe('записей');
    expect(pipe.transform(12, 'запись', 'записи', 'записей')).toBe('записей');
    expect(pipe.transform(14, 'запись', 'записи', 'записей')).toBe('записей');
  });

  it('принимает формы массивом', () => {
    expect(pipe.transform(3, ['сотрудник', 'сотрудника', 'сотрудников'])).toBe('сотрудника');
  });

  it('учитывает модуль числа', () => {
    expect(pipe.transform(-1, 'запись', 'записи', 'записей')).toBe('запись');
    expect(pipe.transform(-2, 'запись', 'записи', 'записей')).toBe('записи');
  });

  it('не падает на неполном наборе форм', () => {
    expect(pipe.transform(2, 'товар')).toBe('товар');
  });
});
