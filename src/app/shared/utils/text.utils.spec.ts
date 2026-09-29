import { describe, expect, it } from 'vitest';

import { initials, shortName } from './text.utils';

describe('text utils', () => {
  describe('initials', () => {
    it('берёт первые буквы фамилии и имени', () => {
      expect(initials('Иванов Иван Иванович')).toBe('ИИ');
    });

    it('берёт одну букву, если имя одно', () => {
      expect(initials('Пётр')).toBe('П');
    });

    it('возвращает прочерк для пустой строки', () => {
      expect(initials('   ')).toBe('—');
    });
  });

  describe('shortName', () => {
    it('оставляет фамилию и имя', () => {
      expect(shortName('Иванов Иван Иванович')).toBe('Иванов Иван');
    });

    it('не меняет короткие имена', () => {
      expect(shortName('Иванов Иван')).toBe('Иванов Иван');
    });

    it('обрезает лишние пробелы', () => {
      expect(shortName('  Иванов   Иван  ')).toBe('Иванов Иван');
    });
  });
});
