import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
      providers: [provideIonicAngular()],
    }).compileComponents();
  });

  interface EmptyStateProps {
    readonly description?: string;
    readonly actionLabel?: string;
    readonly accent?: boolean;
  }

  function render(props: EmptyStateProps = {}) {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('icon', 'documents-outline');
    fixture.componentRef.setInput('title', 'Пока нет журналов');
    for (const [key, value] of Object.entries(props)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('рендерится с заголовком', () => {
    const fixture = render();
    expect(fixture.nativeElement.textContent).toContain('Пока нет журналов');
  });

  it('показывает пояснение и кнопку', () => {
    const fixture = render({ description: 'Создайте первый журнал', actionLabel: 'Создать' });
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Создайте первый журнал');
    expect(text).toContain('Создать');
  });

  it('скрывает кнопку без подписи действия', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelector('ion-button')).toBeNull();
  });

  it('сообщает о нажатии на действие', () => {
    const fixture = render({ actionLabel: 'Создать' });
    const clicked = vi.fn();
    fixture.componentInstance.action.subscribe(clicked);

    fixture.nativeElement.querySelector('ion-button').click();

    expect(clicked).toHaveBeenCalledTimes(1);
  });
});
