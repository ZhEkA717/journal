import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';

import { SignaturePadComponent } from './signature-pad.component';

const fakeContext = new Proxy(
  {},
  {
    get: (_target, property: string) => {
      if (property === 'canvas') {
        return null;
      }
      return () => undefined;
    },
  },
) as unknown as CanvasRenderingContext2D;

describe('SignaturePadComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignaturePadComponent],
      providers: [provideIonicAngular()],
    }).compileComponents();
  });

  it('рендерит canvas и кнопку очистки', async () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(fakeContext);

    const fixture = TestBed.createComponent(SignaturePadComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('canvas')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Очистить');
    expect(fixture.componentInstance.isEmpty()).toBe(true);

    getContext.mockRestore();
  });
});
