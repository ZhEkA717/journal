import { TestBed } from '@angular/core/testing';
import { SupabaseClient, type Session, type User } from '@supabase/supabase-js';

import { AuthService } from '../auth.service';

type AuthCallback = (event: string, session: Session | null) => void;

function createClientMock() {
  const callbacks: AuthCallback[] = [];
  return {
    callbacks,
    auth: {
      onAuthStateChange: vi.fn((callback: AuthCallback) => {
        callbacks.push(callback);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInAnonymously: vi.fn(),
      signInWithOtp: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
    },
  };
}

function makeUser(id: string): User {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  };
}

function signInResult(user: User | null, error: unknown = null) {
  return { data: { user, session: null }, error };
}

describe('AuthService', () => {
  let client: ReturnType<typeof createClientMock>;
  let service: AuthService;

  beforeEach(() => {
    client = createClientMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseClient, useValue: client }],
    });
    service = TestBed.inject(AuthService);
  });

  it('подписывается на изменения сессии в конструкторе', () => {
    expect(client.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(service.currentUser()).toBeNull();
  });

  it('signInAnonymously создаёт сессию и заполняет currentUser', async () => {
    const user = makeUser('anon-1');
    client.auth.signInAnonymously.mockResolvedValue(signInResult(user));

    const result = await service.signInAnonymously();

    expect(result).toBe(user);
    expect(service.currentUser()).toBe(user);
  });

  it('signInAnonymously не создаёт вторую сессию при активной', async () => {
    client.auth.signInAnonymously.mockResolvedValue(signInResult(makeUser('anon-1')));
    await service.signInAnonymously();

    const second = await service.signInAnonymously();

    expect(second.id).toBe('anon-1');
    expect(client.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('signInAnonymously пробрасывает ошибку и не меняет currentUser', async () => {
    client.auth.signInAnonymously.mockResolvedValue(signInResult(null, new Error('network')));

    await expect(service.signInAnonymously()).rejects.toThrow('network');
    expect(service.currentUser()).toBeNull();
  });

  it('signInWithEmail отправляет magic-link на адрес', async () => {
    client.auth.signInWithOtp.mockResolvedValue({ error: null });

    await service.signInWithEmail(' admin@example.com ');

    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'admin@example.com' });
  });

  it('signInWithEmail отклоняет пустой адрес', async () => {
    await expect(service.signInWithEmail('   ')).rejects.toThrow('Укажите email');
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('linkAnonymousToEmail обновляет пользователя при активной сессии', async () => {
    client.auth.signInAnonymously.mockResolvedValue(signInResult(makeUser('anon-1')));
    await service.signInAnonymously();
    client.auth.updateUser.mockResolvedValue({ data: { user: null }, error: null });

    await service.linkAnonymousToEmail('mail@example.com');

    expect(client.auth.updateUser).toHaveBeenCalledWith({ email: 'mail@example.com' });
  });

  it('linkAnonymousToEmail отклоняет вызов без сессии', async () => {
    await expect(service.linkAnonymousToEmail('mail@example.com')).rejects.toThrow(
      'Нет активной сессии',
    );
    expect(client.auth.updateUser).not.toHaveBeenCalled();
  });

  it('signOut сбрасывает currentUser', async () => {
    client.auth.signInAnonymously.mockResolvedValue(signInResult(makeUser('anon-1')));
    await service.signInAnonymously();
    client.auth.signOut.mockResolvedValue({ error: null });

    await service.signOut();

    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
    expect(service.currentUser()).toBeNull();
  });

  it('signOut без сессии не ходит в сеть', async () => {
    await service.signOut();

    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  it('восстанавливает сессию через onAuthStateChange', () => {
    const [callback] = client.callbacks;

    callback?.('SIGNED_IN', { user: makeUser('restored') } as Session);
    expect(service.currentUser()?.id).toBe('restored');

    callback?.('SIGNED_OUT', null);
    expect(service.currentUser()).toBeNull();
  });
});

describe('AuthService без настроенного Supabase', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseClient, useValue: null }],
    });
    service = TestBed.inject(AuthService);
  });

  it('signInAnonymously сообщает, что ключи не заполнены', async () => {
    await expect(service.signInAnonymously()).rejects.toThrow('Supabase не настроен');
    expect(service.currentUser()).toBeNull();
  });

  it('signOut без клиента — безопасный no-op при отсутствии сессии', async () => {
    await expect(service.signOut()).resolves.toBeUndefined();
  });
});
