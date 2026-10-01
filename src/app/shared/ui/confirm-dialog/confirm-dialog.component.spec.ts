import { TestBed } from '@angular/core/testing';
import { provideIonicAngular, ModalController } from '@ionic/angular';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  const dismiss = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    dismiss.mockClear();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideIonicAngular(),
        { provide: ModalController, useValue: { dismiss } },
      ],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentInstance.title = 'Удалить запись?';
    fixture.componentInstance.message = 'Действие нельзя отменить.';
    fixture.componentInstance.danger = true;
    fixture.componentInstance.confirmText = 'Удалить';
    fixture.detectChanges();
    return fixture;
  }

  it('рендерится с заголовком и пояснением', () => {
    const text: string = render().nativeElement.textContent;
    expect(text).toContain('Удалить запись?');
    expect(text).toContain('Действие нельзя отменить.');
  });

  it('закрывает модалку с подтверждением', async () => {
    const fixture = render();
    const buttons = fixture.nativeElement.querySelectorAll('ion-button');

    buttons[1].click();
    await fixture.whenStable();

    expect(dismiss).toHaveBeenCalledWith(true, 'confirmed');
  });

  it('закрывает модалку с отменой', async () => {
    const fixture = render();

    fixture.nativeElement.querySelectorAll('ion-button')[0].click();
    await fixture.whenStable();

    expect(dismiss).toHaveBeenCalledWith(false, 'cancelled');
  });
});
