import { Preferences } from '@capacitor/preferences';
import type { SupportedStorage } from '@supabase/supabase-js';

/**
 * Storage сессии Supabase на Capacitor Preferences (ТЗ 9.4, 10.3).
 *
 * На нативных платформах это Preferences, в браузере — web-тот же пакет
 * (localStorage с префиксом `CapacitorStorage:`). Сессии, сохранённые до T8
 * в «сыром» localStorage, переносятся при первом чтении ключа, чтобы после
 * обновления не потерять привязку (анонимный вход создал бы нового юзера).
 */
export function createSupabaseStorage(): SupportedStorage {
  const migrated = new Set<string>();

  return {
    getItem: async (key: string): Promise<string | null> => {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        return value;
      }
      if (migrated.has(key) || typeof localStorage === 'undefined') {
        return null;
      }
      migrated.add(key);
      const legacy = localStorage.getItem(key);
      if (legacy === null) {
        return null;
      }
      await Preferences.set({ key, value: legacy });
      return legacy;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      await Preferences.set({ key, value });
    },
    removeItem: async (key: string): Promise<void> => {
      await Preferences.remove({ key });
    },
  };
}
