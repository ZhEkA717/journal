import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { LocalDataService } from '../../../core/storage/local-data.service';
import { OnlineStatusService } from '../../../core/sync/online-status.service';
import { SyncQueueService } from '../../../core/sync/sync-queue.service';
import { SyncService } from '../../../core/sync/sync.service';
import type { Organization } from '../../../domain/organizations/organization.model';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { SessionStore } from '../../../stores/session.store';
import { SettingsPage } from '../settings.page';

describe('SettingsPage', () => {
  const organization: Organization = {
    id: 'org-1',
    name: 'ООО Ромашка',
    inn: '7701234567',
    address: 'г. Москва',
    responsiblePerson: 'Иванова Мария',
    createdAt: 1,
    updatedAt: 1,
    syncStatus: 'pending',
  };

  function setup(overrides: { offline?: boolean } = {}) {
    const session = {
      organization: signal<Organization | undefined>(organization),
      validate: vi.fn(() => ({})),
      update: vi.fn().mockResolvedValue(organization),
      reset: vi.fn(),
    };
    const online = {
      isOnline: signal(!overrides.offline),
      isOffline: signal(overrides.offline ?? false),
    };
    const queue = {
      size: signal(2),
      refreshSize: vi.fn().mockResolvedValue(undefined),
    };
    const sync = {
      lastSyncAt: signal<number | null>(null),
      syncAll: vi.fn().mockResolvedValue({ pushed: 0, pulled: 0 }),
    };
    const localData = { wipe: vi.fn().mockResolvedValue(undefined) };
    const confirm = {
      remove: vi.fn().mockResolvedValue(false),
      confirm: vi.fn().mockResolvedValue(false),
    };
    const toast = {
      show: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined),
    };
    const router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
      navigate: vi.fn().mockResolvedValue(true),
    };
    TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: SessionStore, useValue: session },
        { provide: OnlineStatusService, useValue: online },
        { provide: SyncQueueService, useValue: queue },
        { provide: SyncService, useValue: sync },
        { provide: LocalDataService, useValue: localData },
        { provide: ConfirmDialogService, useValue: confirm },
        { provide: ToastService, useValue: toast },
      ],
    });
    const realRouter = TestBed.inject(Router);
    vi.spyOn(realRouter, 'navigateByUrl').mockImplementation(router.navigateByUrl);
    vi.spyOn(realRouter, 'navigate').mockImplementation(router.navigate);
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    return { fixture, session, online, queue, sync, localData, confirm, toast, router };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('рендерит реквизиты, очередь и состояние сети', () => {
    const { fixture } = setup();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Настройки');
    expect(text).toContain('ООО Ромашка');
    expect(text).toContain('Иванова Мария');
    expect(text).toContain('2');
    expect(text).toContain('Ещё не выполнялась');
    expect(text).toContain('Онлайн');
    expect(text).toContain('0.0.0');
    expect(text).toContain('Только на устройстве');
  });

  it('показывает «Нет сети» в офлайне', () => {
    const { fixture } = setup({ offline: true });

    expect(fixture.nativeElement.textContent).toContain('Нет сети');
  });

  it('startEdit заполняет поля из организации, cancelEdit закрывает форму', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    component['startEdit']();
    fixture.detectChanges();

    expect(component['editing']()).toBe(true);
    expect(component['name']()).toBe('ООО Ромашка');
    expect(component['inn']()).toBe('7701234567');

    component['cancelEdit']();
    expect(component['editing']()).toBe(false);
    expect(component['errors']()).toEqual({});
  });

  it('save сохраняет реквизиты и закрывает редактирование', async () => {
    const { fixture, session, toast } = setup();
    const component = fixture.componentInstance;
    component['startEdit']();

    await component['save']();

    expect(session.update).toHaveBeenCalledWith({
      name: 'ООО Ромашка',
      responsiblePerson: 'Иванова Мария',
      inn: '7701234567',
      address: 'г. Москва',
    });
    expect(component['editing']()).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('Реквизиты сохранены');
  });

  it('save не сохраняет при ошибках валидации', async () => {
    const { fixture, session } = setup();
    const component = fixture.componentInstance;
    component['startEdit']();
    session.validate.mockReturnValue({ name: 'Укажите название' });

    await component['save']();

    expect(component['errors']()).toEqual({ name: 'Укажите название' });
    expect(session.update).not.toHaveBeenCalled();
  });

  it('syncNow сообщает, когда изменений нет', async () => {
    const { fixture, toast } = setup();

    await fixture.componentInstance['syncNow']();

    expect(toast.show).toHaveBeenCalledWith('Нет изменений для синхронизации', 'dark');
  });

  it('syncNow сообщает счётчики отправленного и полученного', async () => {
    const { fixture, sync, toast } = setup();
    sync.syncAll.mockResolvedValue({ pushed: 3, pulled: 1 });

    await fixture.componentInstance['syncNow']();

    expect(toast.success).toHaveBeenCalledWith('Синхронизировано: отправлено 3, получено 1');
  });

  it('syncNow показывает ошибку при сбое', async () => {
    const { fixture, sync, toast } = setup();
    sync.syncAll.mockRejectedValue(new Error('offline'));

    await fixture.componentInstance['syncNow']();

    expect(toast.error).toHaveBeenCalledWith('offline');
    expect(fixture.componentInstance['syncing']()).toBe(false);
  });

  it('logout без подтверждения ничего не стирает', async () => {
    const { fixture, confirm, localData } = setup();

    await fixture.componentInstance['logout']();

    expect(confirm.remove).toHaveBeenCalled();
    expect(localData.wipe).not.toHaveBeenCalled();
  });

  it('logout с подтверждением стирает данные и уходит на онбординг', async () => {
    const { fixture, confirm, localData, session, router } = setup();
    confirm.remove.mockResolvedValue(true);

    await fixture.componentInstance['logout']();

    expect(localData.wipe).toHaveBeenCalledTimes(1);
    expect(session.reset).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding', { replaceUrl: true });
  });

  it('logout показывает ошибку, если очистка не удалась', async () => {
    const { fixture, confirm, localData, toast } = setup();
    confirm.remove.mockResolvedValue(true);
    localData.wipe.mockRejectedValue(new Error('idb locked'));

    await fixture.componentInstance['logout']();

    expect(toast.error).toHaveBeenCalledWith('idb locked');
  });
});
