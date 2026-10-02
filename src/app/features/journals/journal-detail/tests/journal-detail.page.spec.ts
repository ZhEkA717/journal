import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { DateService } from '../../../../core/date/date.service';
import { PdfGeneratorService } from '../../../../core/pdf/pdf-generator.service';
import { OnlineStatusService } from '../../../../core/sync/online-status.service';
import type { Journal } from '../../../../domain/journals/journal.model';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { JournalDetailStore, type EntryRow } from '../../../../stores/journal-detail.store';
import { JournalsStore } from '../../../../stores/journals.store';
import { JournalDetailPage } from '../journal-detail.page';

describe('JournalDetailPage', () => {
  const journal: Journal = {
    id: 'j-1',
    orgId: 'org-1',
    templateId: 'sys-fire-safety',
    title: 'Журнал инструктажа по пожарной безопасности',
    startedAt: '2026-09-01',
    responsiblePerson: 'Иванова Мария',
    createdAt: 1,
    updatedAt: 1,
    syncStatus: 'pending',
  };

  const row: EntryRow = {
    id: 'en-1',
    date: '2026-09-02',
    employeeName: 'Петров Пётр Петрович',
    kind: 'Вводный',
    signed: true,
    syncStatus: 'synced',
  };

  function setup(
    options: { withJournal?: boolean; closed?: boolean; entries?: readonly EntryRow[] } = {},
  ) {
    const withJournal = options.withJournal ?? true;
    const store = {
      load: vi.fn().mockResolvedValue(undefined),
      journal: signal(
        withJournal ? { ...journal, closedAt: options.closed ? '2026-09-30' : undefined } : null,
      ),
      loading: signal(false),
      isClosed: signal(options.closed ?? false),
      entryCount: signal(options.entries ? options.entries.length : 0),
      hasEntries: signal((options.entries?.length ?? 0) > 0),
      rows: signal(options.entries ?? []),
      removeEntry: vi.fn().mockResolvedValue(undefined),
      validate: vi.fn(() => ({})),
    };
    const journals = {
      close: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(undefined),
    };
    const confirm = {
      confirm: vi.fn().mockResolvedValue(false),
      remove: vi.fn().mockResolvedValue(false),
    };
    const toast = {
      success: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined),
      show: vi.fn().mockResolvedValue(undefined),
    };
    const pdf = {
      generateJournal: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      sharePdf: vi.fn().mockResolvedValue(undefined),
    };
    const router = {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    const route = {
      snapshot: { paramMap: { get: (key: string) => (key === 'id' ? 'j-1' : null) } },
    };
    TestBed.configureTestingModule({
      imports: [JournalDetailPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: JournalDetailStore, useValue: store },
        { provide: JournalsStore, useValue: journals },
        {
          provide: OnlineStatusService,
          useValue: { isOnline: signal(true), isOffline: signal(false) },
        },
        { provide: ConfirmDialogService, useValue: confirm },
        { provide: ToastService, useValue: toast },
        { provide: PdfGeneratorService, useValue: pdf },
        { provide: ActivatedRoute, useValue: route },
        { provide: DateService, useClass: DateService },
      ],
    });
    const realRouter = TestBed.inject(Router);
    vi.spyOn(realRouter, 'navigate').mockImplementation(router.navigate);
    vi.spyOn(realRouter, 'navigateByUrl').mockImplementation(router.navigateByUrl);
    const fixture = TestBed.createComponent(JournalDetailPage);
    fixture.detectChanges();
    return { fixture, store, journals, confirm, toast, pdf, router };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('рендерит шапку, сводку и таблицу записей', () => {
    const { fixture } = setup({ entries: [row] });

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Журнал инструктажа по пожарной безопасности');
    expect(text).toContain('Открыт с 01.09.2026');
    expect(text).toContain('Иванова Мария');
    expect(text).toContain('1 запись');
    expect(text).toContain('Петров Пётр');
    expect(text).toContain('Вводный');
    expect(fixture.nativeElement.querySelector('[aria-label="Подпись есть"]')).not.toBeNull();
    expect(text).toContain('Экспорт в PDF');
    expect(fixture.nativeElement.querySelector('app-fab')).not.toBeNull();
  });

  it('показывает пустое состояние без записей', () => {
    const { fixture } = setup({ entries: [] });

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Нет записей');
    expect(text).toContain('Нажмите + чтобы добавить');
  });

  it('закрытый журнал: пометка и без FAB', () => {
    const { fixture } = setup({ closed: true, entries: [row] });

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Закрыт 30.09.2026');
    expect(text).toContain('Журнал закрыт');
    expect(fixture.nativeElement.querySelector('app-fab')).toBeNull();
    expect(text).toContain('Экспорт в PDF');
  });

  it('журнал не найден — пустое состояние без футера', () => {
    const { fixture } = setup({ withJournal: false });

    expect(fixture.nativeElement.textContent).toContain('Журнал не найден');
    expect(fixture.nativeElement.querySelector('ion-footer')).toBeNull();
  });

  it('закрывает журнал после подтверждения', async () => {
    const { fixture, journals, confirm, store, toast } = setup();
    confirm.confirm.mockResolvedValue(true);

    await fixture.componentInstance['close']();

    expect(journals.close).toHaveBeenCalledWith('j-1');
    expect(store.load).toHaveBeenCalledTimes(2);
    expect(journals.load).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Журнал закрыт');
  });

  it('отмена закрытия ничего не делает', async () => {
    const { fixture, journals, confirm } = setup();

    await fixture.componentInstance['close']();

    expect(confirm.confirm).toHaveBeenCalled();
    expect(journals.close).not.toHaveBeenCalled();
  });

  it('удаляет журнал после подтверждения и уходит в список', async () => {
    const { fixture, journals, confirm, toast, router } = setup();
    confirm.remove.mockResolvedValue(true);

    await fixture.componentInstance['remove']();

    expect(journals.remove).toHaveBeenCalledWith('j-1');
    expect(toast.success).toHaveBeenCalledWith('Журнал удалён');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/journals', { replaceUrl: true });
  });

  it('удаляет запись после подтверждения', async () => {
    const { fixture, store, confirm, toast } = setup({ entries: [row] });
    confirm.remove.mockResolvedValue(true);

    await fixture.componentInstance['removeEntry']('en-1');

    expect(store.removeEntry).toHaveBeenCalledWith('en-1');
    expect(toast.success).toHaveBeenCalledWith('Запись удалена');
  });

  it('экспорт PDF: сборка, шеринг и тост успеха', async () => {
    const { fixture, pdf, toast } = setup();

    await fixture.componentInstance['exportPdf']();

    expect(pdf.generateJournal).toHaveBeenCalledWith('j-1');
    expect(pdf.sharePdf).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      expect.stringMatching(/^Журнал инструктажа по пожарной безопасности \d{4}-\d{2}-\d{2}\.pdf$/),
    );
    expect(toast.success).toHaveBeenCalledWith('PDF готов');
    expect(fixture.componentInstance['exporting']()).toBe(false);
  });

  it('отмена системного шеринга — не ошибка', async () => {
    const { fixture, pdf, toast } = setup();
    const abort = new DOMException('Share canceled', 'AbortError');
    pdf.sharePdf.mockRejectedValue(abort);

    await fixture.componentInstance['exportPdf']();

    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(fixture.componentInstance['exporting']()).toBe(false);
  });

  it('ошибка экспорта показывается тостом', async () => {
    const { fixture, pdf, toast } = setup();
    pdf.generateJournal.mockRejectedValue(new Error('font failed'));

    await fixture.componentInstance['exportPdf']();

    expect(toast.error).toHaveBeenCalledWith('font failed');
  });

  it('pull-to-refresh перезагружает данные и закрывает спиннер', async () => {
    const { fixture, store } = setup();
    const complete = vi.fn().mockResolvedValue(undefined);

    await fixture.componentInstance['onRefresh']({ target: { complete } } as never);

    expect(store.load).toHaveBeenCalledWith('j-1');
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
