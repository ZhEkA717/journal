import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';

import { ToastService } from '../toast.service';

interface ToastFixture {
  readonly present: ReturnType<typeof vi.fn>;
}

function setup() {
  const toast: ToastFixture = { present: vi.fn().mockResolvedValue(undefined) };
  const create = vi.fn().mockResolvedValue(toast);
  TestBed.configureTestingModule({
    providers: [{ provide: ToastController, useValue: { create } }],
  });
  return { service: TestBed.inject(ToastService), create, toast };
}

describe('ToastService', () => {
  it('показывает нейтральный тост снизу с кнопкой OK', async () => {
    const { service, create, toast } = setup();

    await service.show('Привет');

    expect(create).toHaveBeenCalledWith({
      message: 'Привет',
      color: 'dark',
      duration: 2000,
      position: 'bottom',
      swipeGesture: 'vertical',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    expect(toast.present).toHaveBeenCalledTimes(1);
  });

  it('успех — зелёный тост', async () => {
    const { service, create } = setup();

    await service.success('Запись сохранена');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Запись сохранена', color: 'success', duration: 2000 }),
    );
  });

  it('ошибка — красный тост, показывается дольше', async () => {
    const { service, create } = setup();

    await service.error('Что-то пошло не так');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'danger', duration: 3500 }),
    );
  });
});
