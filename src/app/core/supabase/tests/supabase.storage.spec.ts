import { Preferences } from '@capacitor/preferences';

import { createSupabaseStorage } from '../supabase.storage';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

const KEY = 'sb-test-auth-token';

function mockGet(value: string | null): void {
  vi.mocked(Preferences.get).mockResolvedValue({ value });
}

describe('createSupabaseStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('читает значение из Preferences', async () => {
    const storage = createSupabaseStorage();
    mockGet('{"access_token":"a"}');

    await expect(storage.getItem(KEY)).resolves.toBe('{"access_token":"a"}');
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it('переносит сессию из localStorage, если в Preferences пусто', async () => {
    localStorage.setItem(KEY, '{"access_token":"legacy"}');
    const storage = createSupabaseStorage();
    mockGet(null);

    await expect(storage.getItem(KEY)).resolves.toBe('{"access_token":"legacy"}');
    expect(Preferences.set).toHaveBeenCalledWith({
      key: KEY,
      value: '{"access_token":"legacy"}',
    });
  });

  it('возвращает null, когда ни Preferences, ни localStorage пусты', async () => {
    const storage = createSupabaseStorage();
    mockGet(null);

    await expect(storage.getItem(KEY)).resolves.toBeNull();
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it('после миграции не ищет ключ в localStorage повторно', async () => {
    localStorage.setItem(KEY, 'legacy');
    const storage = createSupabaseStorage();
    mockGet(null);

    await storage.getItem(KEY);
    // Ключ уже «посещён»: даже если запись в localStorage осталась, не трогаем её.
    localStorage.removeItem(KEY);
    await expect(storage.getItem(KEY)).resolves.toBeNull();
    expect(Preferences.set).toHaveBeenCalledTimes(1);
  });

  it('пишет и удаляет через Preferences', async () => {
    const storage = createSupabaseStorage();

    await storage.setItem(KEY, 'value');
    await storage.removeItem(KEY);

    expect(Preferences.set).toHaveBeenCalledWith({ key: KEY, value: 'value' });
    expect(Preferences.remove).toHaveBeenCalledWith({ key: KEY });
  });
});
