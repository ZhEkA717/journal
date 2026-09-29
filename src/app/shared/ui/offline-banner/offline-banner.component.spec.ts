import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';

import { OfflineBannerComponent } from './offline-banner.component';

describe('OfflineBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineBannerComponent],
      providers: [provideIonicAngular()],
    }).compileComponents();
  });

  function render(visible: boolean, message?: string) {
    const fixture = TestBed.createComponent(OfflineBannerComponent);
    fixture.componentRef.setInput('visible', visible);
    if (message) {
      fixture.componentRef.setInput('message', message);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('скрыт, когда сеть есть', () => {
    expect(render(false).nativeElement.textContent?.trim()).toBe('');
  });

  it('показывает предупреждение без сети', () => {
    const text: string = render(true).nativeElement.textContent;
    expect(text).toContain('Нет сети');
  });

  it('принимает свой текст', () => {
    expect(render(true, 'Синхронизация приостановлена').nativeElement.textContent).toContain(
      'Синхронизация приостановлена',
    );
  });
});
