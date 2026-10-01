import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { FabComponent } from './fab.component';

describe('FabComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FabComponent],
      providers: [
        provideRouter([
          { path: 'journals', children: [] },
          { path: 'journals/new', children: [] },
        ]),
        provideIonicAngular(),
      ],
    }).compileComponents();
  });

  function render(link = '/journals/new') {
    const fixture = TestBed.createComponent(FabComponent);
    fixture.componentRef.setInput('link', link);
    fixture.detectChanges();
    return fixture;
  }

  it('ведёт по адресу из инпута', () => {
    const fixture = render();

    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toBe('/journals/new');
  });

  it('переходит по клику', async () => {
    const fixture = render();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/journals');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('a').click();
    await fixture.whenStable();

    expect(router.url).toBe('/journals/new');
  });

  it('рендерит круглую кнопку с иконкой и aria-label', () => {
    const fixture = render();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('ion-icon')).not.toBeNull();
    const link = host.querySelector('a');
    expect(link?.getAttribute('aria-label')).toBe('Добавить');
    expect(link?.classList.contains('h-14')).toBe(true);
    expect(link?.classList.contains('w-14')).toBe(true);
  });
});
