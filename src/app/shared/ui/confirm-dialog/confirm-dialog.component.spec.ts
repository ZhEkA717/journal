import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { IonModalToken } from '@ionic/angular/common';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  const dismiss = vi.fn();

  beforeEach(async () => {
    dismiss.mockClear();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideIonicAngular(),
        { provide: IonModalToken, useValue: { dismiss } as unknown as HTMLIonModalElement },
      ],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('title', 'Удалить запись?');
    fixture.componentRef.setInput('message', 'Действие нельзя отменить.');
    fixture.componentRef.setInput('danger', true);
    fixture.componentRef.setInput('confirmText', 'Удалить');
    fixture.detectChanges();
    return fixture;
  }

  it('рендерится с заголовком и пояснением', () => {
    const text: string = render().nativeElement.textContent;
    expect(text).toContain('Удалить запись?');
    expect(text).toContain('Действие нельзя отменить.');
  });

  it('закрывает модалку с подтверждением', () => {
    const fixture = render();
    const buttons = fixture.nativeElement.querySelectorAll('ion-button');

    buttons[1].click();

    expect(dismiss).toHaveBeenCalledWith(true, 'confirmed');
  });

  it('закрывает модалку с отменой', () => {
    const fixture = render();

    fixture.nativeElement.querySelectorAll('ion-button')[0].click();

    expect(dismiss).toHaveBeenCalledWith(false, 'cancelled');
  });
});
