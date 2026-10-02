import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { OnlineStatusService } from '../online-status.service';

const originalUrl = environment.supabaseUrl;

function setup() {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return { service: TestBed.inject(OnlineStatusService), fetchMock };
}

describe('OnlineStatusService', () => {
  beforeEach(() => {
    (environment as { supabaseUrl: string }).supabaseUrl = 'https://example.supabase.co';
    window.dispatchEvent(new Event('online'));
  });

  afterEach(() => {
    (environment as { supabaseUrl: string }).supabaseUrl = originalUrl;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('онлайн по умолчанию в браузере', () => {
    const { service } = setup();
    expect(service.isOnline()).toBe(true);
    expect(service.isOffline()).toBe(false);
  });

  it('события offline/online окна меняют состояние', () => {
    const { service } = setup();

    window.dispatchEvent(new Event('offline'));
    expect(service.isOffline()).toBe(true);

    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
  });

  it('ping при отсутствии сети не ходит в сеть', async () => {
    const { service, fetchMock } = setup();
    window.dispatchEvent(new Event('offline'));

    await service.ping();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.isOffline()).toBe(true);
  });

  it('ping при успехе бэкенда подтверждает онлайн', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValue({ ok: true });

    await service.ping();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/health',
      expect.objectContaining({ method: 'HEAD', cache: 'no-store' }),
    );
    expect(service.isOnline()).toBe(true);
  });

  it('ping с не-OK ответом переводит в офлайн', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValue({ ok: false });

    await service.ping();

    expect(service.isOffline()).toBe(true);
  });

  it('ping при сетевой ошибке переводит в офлайн', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockRejectedValue(new Error('network down'));

    await service.ping();

    expect(service.isOffline()).toBe(true);
  });

  it('ping без URL бэкенда не ходит в сеть', async () => {
    (environment as { supabaseUrl: string }).supabaseUrl = '';
    const { service, fetchMock } = setup();

    await service.ping();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.isOnline()).toBe(true);
  });
});
