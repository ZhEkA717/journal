import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClient, type User } from '@supabase/supabase-js';

import type { Database } from '../supabase/supabase.types';

/**
 * Авторизация Supabase (ТЗ 9.4): анонимный вход при первом запуске,
 * вход по email и привязка email для синхронизации между устройствами.
 *
 * Сохранённую сессию восстанавливает сам supabase-js через
 * `onAuthStateChange` в конструкторе: на web она хранится в localStorage,
 * перенос хранения в Capacitor Preferences — задача T8 (ТЗ 9.4, 10.3).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Клиент Supabase; `null`, пока ключи проекта не заполнены в environment. */
  private readonly supabase = inject(SupabaseClient, {
    optional: true,
  }) as SupabaseClient<Database> | null;

  /** Текущий пользователь Supabase или `null`, если сессии нет. */
  readonly currentUser = signal<User | null>(null);

  constructor() {
    this.supabase?.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  /**
   * Анонимный вход при первом запуске (ТЗ 9.4).
   * Если сессия уже есть — возвращает текущего пользователя.
   */
  async signInAnonymously(): Promise<User> {
    const supabase = this.requireClient();
    const existing = this.currentUser();
    if (existing) {
      return existing;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw error;
    }
    if (!data.user) {
      throw new Error('Supabase не вернул пользователя');
    }
    this.currentUser.set(data.user);
    return data.user;
  }

  /** Вход по email: отправляет ссылку входа на почту (ТЗ 9.4). */
  async signInWithEmail(email: string): Promise<void> {
    const supabase = this.requireClient();
    const normalized = this.normalizeEmail(email);
    const { error } = await supabase.auth.signInWithOtp({ email: normalized });
    if (error) {
      throw error;
    }
  }

  /**
   * Привязывает email к анонимной сессии: Supabase отправит код
   * подтверждения, после которого можно входить с того же email на другом
   * устройстве (ТЗ 9.4).
   */
  async linkAnonymousToEmail(email: string): Promise<void> {
    const supabase = this.requireClient();
    const normalized = this.normalizeEmail(email);
    if (!this.currentUser()) {
      throw new Error('Нет активной сессии Supabase');
    }
    const { error } = await supabase.auth.updateUser({ email: normalized });
    if (error) {
      throw error;
    }
  }

  /** Выход из Supabase; локальные данные приложения не трогает (ТЗ 9.4). */
  async signOut(): Promise<void> {
    if (!this.currentUser()) {
      return;
    }
    const supabase = this.requireClient();
    const { error } = await supabase.auth.signOut();
    this.currentUser.set(null);
    if (error) {
      throw error;
    }
  }

  private requireClient(): SupabaseClient<Database> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен: заполните supabaseUrl и supabaseAnonKey');
    }
    return this.supabase;
  }

  private normalizeEmail(email: string): string {
    const normalized = email.trim();
    if (normalized.length === 0) {
      throw new Error('Укажите email');
    }
    return normalized;
  }
}
