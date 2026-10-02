import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';

import { SyncIndicatorComponent, type SyncIndicatorState } from '../sync-indicator.component';

describe('SyncIndicatorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncIndicatorComponent],
      providers: [provideIonicAngular()],
    }).compileComponents();
  });

  function render(
    state: SyncIndicatorState,
    showLabel = false,
  ): ComponentFixture<SyncIndicatorComponent> {
    const fixture = TestBed.createComponent(SyncIndicatorComponent);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('showLabel', showLabel);
    fixture.detectChanges();
    return fixture;
  }

  function iconNameOf(fixture: ComponentFixture<SyncIndicatorComponent>): string {
    const element = fixture.nativeElement as HTMLElement;
    const icon = element.querySelector('ion-icon') as unknown as
      (Element & { name?: string }) | null;
    return icon?.name ?? icon?.getAttribute('name') ?? '';
  }

  function labelOf(fixture: ComponentFixture<SyncIndicatorComponent>): string {
    const span = (fixture.nativeElement as HTMLElement).querySelector('span');
    return span?.getAttribute('aria-label') ?? '';
  }

  it('по умолчанию показывает статус «синхронизировано»', () => {
    const fixture = render('synced');
    expect(iconNameOf(fixture)).toBe('checkmark-circle-outline');
    expect(labelOf(fixture)).toBe('Синхронизировано');
  });

  it('меняет иконку для несинхронизированных записей', () => {
    const fixture = render('pending');
    expect(iconNameOf(fixture)).toBe('sync-outline');
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('');
  });

  it('показывает иконку конфликта и офлайна', () => {
    expect(iconNameOf(render('conflict'))).toBe('warning-outline');
    expect(iconNameOf(render('offline'))).toBe('cloud-offline-outline');
  });

  it('показывает подпись по запросу', () => {
    expect(render('conflict', true).nativeElement.textContent).toContain('Нужна синхронизация');
    expect(render('offline', true).nativeElement.textContent).toContain('Нет сети');
  });
});
