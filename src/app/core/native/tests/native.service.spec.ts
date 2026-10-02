import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { StatusBar } from '@capacitor/status-bar';

import { NativeService } from '../native.service';

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn() },
  ImpactStyle: { Medium: 'MEDIUM' },
}));
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setBackgroundColor: vi.fn() },
}));

describe('NativeService', () => {
  let service: NativeService;
  let nativeSpy: { mockRestore(): void };

  beforeEach(() => {
    service = new NativeService();
    nativeSpy = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    nativeSpy.mockRestore();
  });

  it('вибрирует при сохранении на нативной платформе', async () => {
    await service.impact();

    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
  });

  it('не трогает Haptics в браузере', async () => {
    nativeSpy.mockRestore();
    nativeSpy = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    await service.impact();

    expect(Haptics.impact).not.toHaveBeenCalled();
  });

  it('ставит цвет статус-бара при старте', async () => {
    await service.init();

    expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#1E40AF' });
  });

  it('падение плагина не роняет инициализацию', async () => {
    vi.mocked(StatusBar.setBackgroundColor).mockRejectedValueOnce(new Error('unimplemented'));

    await expect(service.init()).resolves.toBeUndefined();
  });
});
