import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { ToastService } from '../../shared/ui/toast/toast.service';
import { SessionStore } from '../../stores/session.store';
import { OnboardingPage } from './onboarding.page';

describe('OnboardingPage', () => {
  let setup_: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    setup_ = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [OnboardingPage],
      providers: [
        provideIonicAngular(),
        provideRouter([{ path: 'journals', children: [] }]),
        {
          provide: SessionStore,
          useValue: {
            validate: (draft: { name: string; responsiblePerson: string }) => {
              const found: Record<string, string> = {};
              if (draft.name.trim().length < 2) {
                found['name'] = 'Введите название организации';
              }
              if (draft.responsiblePerson.trim().length < 3) {
                found['responsiblePerson'] = 'Укажите ФИО ответственного';
              }
              return found;
            },
            setup: setup_,
          },
        },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } },
      ],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(OnboardingPage);
    fixture.detectChanges();
    return fixture;
  }

  function type(fixture: ReturnType<typeof render>, index: number, value: string): void {
    const input = fixture.nativeElement.querySelectorAll('ion-input')[index];
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value } }));
    fixture.detectChanges();
  }

  function clickStart(fixture: ReturnType<typeof render>): void {
    const button: HTMLElement = fixture.nativeElement.querySelector('ion-button');
    button.click();
  }

  it('показывает поля и кнопку', () => {
    const fixture = render();
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('Журналы');
    expect(text).toContain('Название организации');
    expect(text).toContain('Ответственный за ведение');
    expect(text).toContain('Начать работу');
  });

  it('не сохраняет пустую организацию и показывает ошибки', async () => {
    const fixture = render();

    clickStart(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(setup_).not.toHaveBeenCalled();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Введите название организации');
    expect(text).toContain('Укажите ФИО ответственного');
  });

  it('сохраняет организацию и открывает журналы', async () => {
    const fixture = render();
    type(fixture, 0, 'ООО «Ромашка»');
    type(fixture, 1, 'Иванова Мария');

    clickStart(fixture);
    await fixture.whenStable();

    expect(setup_).toHaveBeenCalledWith({
      name: 'ООО «Ромашка»',
      responsiblePerson: 'Иванова Мария',
    });
    expect(TestBed.inject(Router).url).toBe('/journals');
  });

  it('чистит ошибку поля после ввода', async () => {
    const fixture = render();
    clickStart(fixture);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Введите название организации');

    type(fixture, 0, 'ООО «Ромашка»');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Введите название организации');
  });
});
