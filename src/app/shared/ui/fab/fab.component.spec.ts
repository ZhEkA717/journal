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

  function render(link = '/journals/new', label?: string) {
    const fixture = TestBed.createComponent(FabComponent);
    fixture.componentRef.setInput('link', link);
    if (label !== undefined) {
      fixture.componentRef.setInput('label', label);
    }
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

  it('показывает иконку и подпись', () => {
    const fixture = render('/journals/new', 'Новый журнал');
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('ion-icon')).not.toBeNull();
    expect(host.querySelector('ion-label')).not.toBeNull();
    expect(host.textContent).toContain('Новый журнал');
  });
});
