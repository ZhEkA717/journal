import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import type { JournalSummary } from '../../../../domain/journals/journal.model';
import type { JournalTemplate } from '../../../../domain/journals/journal-template.model';
import { SYSTEM_TEMPLATES } from '../../../../domain/templates/system-templates';
import { JournalsStore } from '../../../../stores/journals.store';
import { JournalsListPage } from '../journals-list.page';

describe('JournalsListPage', () => {
  const template = SYSTEM_TEMPLATES.find(
    (item) => item.id === 'sys-fire-safety',
  ) as JournalTemplate;

  function summary(overrides: Partial<JournalSummary> = {}): JournalSummary {
    return {
      journal: {
        id: 'j-1',
        orgId: 'org-1',
        templateId: template.id,
        title: 'Журнал инструктажа по пожарной безопасности',
        startedAt: '2026-09-01',
        responsiblePerson: 'Иванова Мария',
        createdAt: 1,
        updatedAt: 1,
        syncStatus: 'pending',
      },
      template,
      entryCount: 3,
      employeeCount: 2,
      ...overrides,
    };
  }

  function setup(items: readonly JournalSummary[], loading = false) {
    const store = {
      loading: signal(loading),
      hasJournals: signal(items.length > 0),
      journals: signal(items),
      load: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      imports: [JournalsListPage],
      providers: [
        provideIonicAngular(),
        provideRouter([{ path: 'journals/create', children: [] }]),
        { provide: JournalsStore, useValue: store },
      ],
    });
    const fixture = TestBed.createComponent(JournalsListPage);
    fixture.detectChanges();
    return { fixture, store };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('показывает пустое состояние без журналов', () => {
    const { fixture } = setup([]);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Пока нет журналов');
    expect(text).toContain('Нажмите + чтобы добавить');
  });

  it('показывает карточки журналов со сводкой', () => {
    const { fixture } = setup([summary()]);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Журнал инструктажа по пожарной безопасности');
    expect(text).toContain('3 записи');
    expect(text).toContain('2 сотрудника');
    expect(text).toContain('Открыт с 01.09.2026');
  });

  it('помечает закрытый журнал', () => {
    const { fixture } = setup([
      summary({
        journal: {
          ...summary().journal,
          closedAt: '2026-09-30',
        },
      }),
    ]);

    expect(fixture.nativeElement.textContent).toContain('Закрыт 30.09.2026');
  });

  it('ведёт в журнал по ссылке карточки', () => {
    const { fixture } = setup([summary()]);

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href="/journals/j-1"]');
    expect(link).not.toBeNull();
  });

  it('всегда показывает FAB для создания журнала', () => {
    const withJournals = setup([summary()]);
    expect(withJournals.fixture.nativeElement.querySelector('app-fab')).not.toBeNull();

    TestBed.resetTestingModule();
    const empty = setup([]);
    expect(empty.fixture.nativeElement.querySelector('app-fab')).not.toBeNull();
  });

  it('перезагружает журналы по pull-to-refresh', async () => {
    const { fixture, store } = setup([summary()]);

    const complete = vi.fn().mockResolvedValue(undefined);
    const event = { target: { complete } } as unknown as CustomEvent;
    await fixture.componentInstance['onRefresh'](event);

    expect(store.load).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
