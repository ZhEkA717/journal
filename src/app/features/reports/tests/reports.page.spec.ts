import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';

import { ReportsPage } from '../reports.page';

describe('ReportsPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReportsPage],
      providers: [provideIonicAngular()],
    });
  });

  it('рендерит заглушку раздела', () => {
    const fixture = TestBed.createComponent(ReportsPage);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Отчёты');
    expect(text).toContain('Раздел в бэклоге MVP');
  });
});
