import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';
import type { Database } from './supabase.types';

/**
 * Фабрика клиента Supabase для DI (ТЗ 4, 11.3).
 *
 * Возвращает `null`, пока в `environment` не заполнены ключи проекта:
 * приложение обязано работать офлайн и без настроенного Supabase (ТЗ 12.5).
 */
export function createSupabaseClient(): SupabaseClient<Database> | null {
  if (environment.supabaseUrl.length === 0 || environment.supabaseAnonKey.length === 0) {
    return null;
  }
  return createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey);
}
