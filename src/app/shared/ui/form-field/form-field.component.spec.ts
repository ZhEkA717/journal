import { TestBed } from '@angular/core/testing';

import { FormFieldComponent } from './form-field.component';

describe('FormFieldComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormFieldComponent] }).compileComponents();
  });

  function render(error?: string) {
    const fixture = TestBed.createComponent(FormFieldComponent);
    fixture.componentRef.setInput('label', 'ФИО');
    if (error !== undefined) {
      fixture.componentRef.setInput('error', error);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('показывает подпись поля', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelector('label')?.textContent).toContain('ФИО');
  });

  it('добавляет звёздочку обязательному полю', () => {
    const fixture = TestBed.createComponent(FormFieldComponent);
    fixture.componentRef.setInput('label', 'ФИО');
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('label')?.textContent).toContain('*');
  });

  it('показывает текст ошибки', () => {
    const fixture = render('Введите ФИО');
    expect(fixture.nativeElement.textContent).toContain('Введите ФИО');
  });

  it('без ошибки показывает подсказку', () => {
    const fixture = TestBed.createComponent(FormFieldComponent);
    fixture.componentRef.setInput('label', 'ИНН');
    fixture.componentRef.setInput('hint', 'Необязательно');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Необязательно');
  });
});
