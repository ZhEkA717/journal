import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

import { environment } from '../../../environments/environment';

const PING_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 5_000;

/**
 * Отслеживает доступность сети: `navigator.onLine` + события окна + периодический
 * ping (TZ 9.2). Пользовательский интерфейс не должен ждать эту проверку.
 */
@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly onlineState = signal<boolean>(this.readNavigatorState());

  /** Есть ли сеть прямо сейчас. */
  readonly isOnline = this.onlineState.asReadonly();

  /** `true`, если приложение работает без подключения к серверу. */
  readonly isOffline = computed(() => !this.onlineState());

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    fromEvent(window, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onlineState.set(true));
    fromEvent(window, 'offline')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onlineState.set(false));

    const timer = setInterval(() => void this.ping(), PING_INTERVAL_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  /** Проверяет доступность бэкенда; при отсутствии URL остаётся на `navigator.onLine`. */
  async ping(): Promise<void> {
    if (!this.onlineState() || !environment.supabaseUrl) {
      return;
    }
    try {
      const response = await fetch(`${environment.supabaseUrl}/auth/v1/health`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });
      this.onlineState.set(response.ok);
    } catch {
      this.onlineState.set(false);
    }
  }

  private readNavigatorState(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }
}
