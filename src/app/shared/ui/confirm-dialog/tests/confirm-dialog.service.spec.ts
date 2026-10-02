import { TestBed } from '@angular/core/testing';
import { ActionSheetController } from '@ionic/angular';

import { ConfirmDialogService } from '../confirm-dialog.service';

interface SheetFixture {
  readonly present: ReturnType<typeof vi.fn>;
  readonly onDidDismiss: ReturnType<typeof vi.fn>;
}

function setup(role: string) {
  const sheet: SheetFixture = {
    present: vi.fn().mockResolvedValue(undefined),
    onDidDismiss: vi.fn().mockResolvedValue({ role }),
  };
  const create = vi.fn().mockResolvedValue(sheet);
  TestBed.configureTestingModule({
    providers: [{ provide: ActionSheetController, useValue: { create } }],
  });
  return { service: TestBed.inject(ConfirmDialogService), create, sheet };
}

describe('ConfirmDialogService', () => {
  it('возвращает true, когда пользователь подтвердил', async () => {
    const { service, create } = setup('confirm');

    await expect(
      service.confirm({ title: 'Удалить запись?', message: 'Действие необратимо' }),
    ).resolves.toBe(true);
    expect(create).toHaveBeenCalledWith({
      header: 'Удалить запись?',
      subHeader: 'Действие необратимо',
      buttons: [
        { text: 'Отмена', role: 'cancel' },
        { text: 'Подтвердить', role: 'confirm', cssClass: undefined },
      ],
    });
  });

  it('возвращает false при отмене', async () => {
    const { service } = setup('cancel');

    await expect(service.confirm({ title: 'Вы уверены?', message: '' })).resolves.toBe(false);
  });

  it('подставляет свои тексты кнопок и красный стиль для danger', async () => {
    const { service, create } = setup('confirm');

    await service.confirm({
      title: 'Закрыть журнал?',
      message: 'Записи больше нельзя добавлять',
      confirmText: 'Закрыть',
      cancelText: 'Не сейчас',
      danger: true,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        buttons: [
          { text: 'Не сейчас', role: 'cancel' },
          { text: 'Закрыть', role: 'confirm', cssClass: 'danger' },
        ],
      }),
    );
  });

  it('remove() — красное подтверждение удаления с дефолтами', async () => {
    const { service, create } = setup('confirm');

    await expect(service.remove()).resolves.toBe(true);
    expect(create).toHaveBeenCalledWith({
      header: 'Удалить?',
      subHeader: 'Действие нельзя отменить.',
      buttons: [
        { text: 'Отмена', role: 'cancel' },
        { text: 'Удалить', role: 'confirm', cssClass: 'danger' },
      ],
    });
  });

  it('remove() пробрасывает отмену пользователя', async () => {
    const { service } = setup('cancel');

    await expect(service.remove('Сотрудник', 'Профиль удалится навсегда')).resolves.toBe(false);
  });
});
