import { uuid } from './uuid';

describe('uuid', () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('генерирует UUID v4', () => {
    expect(uuid()).toMatch(UUID_V4);
  });

  it('генерирует уникальные значения', () => {
    const values = new Set(Array.from({ length: 100 }, () => uuid()));
    expect(values.size).toBe(100);
  });

  it('работает без crypto.randomUUID', () => {
    const original = globalThis.crypto.randomUUID;
    try {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: undefined,
        configurable: true,
      });
      expect(uuid()).toMatch(UUID_V4);
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: original,
        configurable: true,
      });
    }
  });
});
