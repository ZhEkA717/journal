import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonList,
  IonItemSliding,
  IonLabel,
  IonPopover,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DateRuPipe } from '../../../shared/pipes/date-ru.pipe';
import { PluralPipe } from '../../../shared/pipes/plural.pipe';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { OfflineBannerComponent } from '../../../shared/ui/offline-banner/offline-banner.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { shortName } from '../../../shared/utils/text.utils';
import { errorMessage } from '../../../shared/utils/error.utils';
import { DateService } from '../../../core/date/date.service';
import { PdfGeneratorService, journalPdfFilename } from '../../../core/pdf/pdf-generator.service';
import { OnlineStatusService } from '../../../core/sync/online-status.service';
import { JournalDetailStore } from '../../../stores/journal-detail.store';
import { JournalsStore } from '../../../stores/journals.store';
import { FabComponent } from '../../../shared/ui/fab/fab.component';

/**
 * Детальный вид журнала: шапка, меню и таблица записей (ТЗ 8.4).
 * Записи удаляются свайпом, редактируются по тапу.
 */
@Component({
  selector: 'app-journal-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonContent,
    IonFooter,
    IonIcon,
    IonPopover,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonList,
    IonLabel,
    RouterLink,
    DateRuPipe,
    PluralPipe,
    EmptyStateComponent,
    OfflineBannerComponent,
    FabComponent,
  ],
  templateUrl: './journal-detail.page.html',
  styleUrls: ['./journal-detail.page.scss'],
})
export class JournalDetailPage {
  /** Данные журнала и записей. */
  protected readonly store = inject(JournalDetailStore);
  private readonly journals = inject(JournalsStore);
  protected readonly online = inject(OnlineStatusService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly pdf = inject(PdfGeneratorService);
  private readonly date = inject(DateService);

  /** Идёт сборка или отправка PDF. */
  protected readonly exporting = signal(false);

  /** Короткое имя сотрудника в строке таблицы. */
  protected readonly shortName = shortName;
  /** Идентификатор журнала из маршрута. */
  private readonly journalId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly menuIcon = 'ellipsis-vertical-outline';
  protected readonly closeIcon = 'close-outline';
  protected readonly editIcon = 'create-outline';
  protected readonly trashIcon = 'trash-outline';
  protected readonly downloadIcon = 'download-outline';
  protected readonly signedIcon = 'checkmark-circle-outline';
  protected readonly unsignedIcon = 'warning-outline';

  /** Ссылки на записи для `routerLink` вычисляются один раз. */
  protected readonly entryLink = (entryId: string): string[] => [
    '/journals',
    this.journalId,
    'entries',
    entryId,
  ];

  constructor() {
    void this.store.load(this.journalId);
  }

  protected async onRefresh(event: CustomEvent): Promise<void> {
    await this.store.load(this.journalId);
    await (event.target as HTMLIonRefresherElement).complete();
  }

  protected addEntry(): void {
    void this.router.navigate(['/journals', this.journalId, 'entries', 'new']);
  }

  /** Открывает форму редактирования данных журнала (ТЗ 14: редактирование). */
  protected edit(): void {
    void this.router.navigate(['/journals', this.journalId, 'edit']);
  }

  protected editEntry(entryId: string): void {
    void this.router.navigate(this.entryLink(entryId));
  }

  /** Закрывает журнал: новые записи больше не добавляются. */
  protected async close(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Закрыть журнал?',
      message: 'Новые записи добавить не получится.',
      confirmText: 'Закрыть',
    });
    if (!confirmed) {
      return;
    }
    try {
      await this.journals.close(this.journalId);
      await this.store.load(this.journalId);
      await this.journals.load();
      await this.toast.success('Журнал закрыт');
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось закрыть журнал'));
    }
  }

  /** Удаляет журнал вместе с записями. */
  protected async remove(): Promise<void> {
    const count = this.store.entryCount();
    const confirmed = await this.confirm.remove(
      'Удалить журнал?',
      `Все ${count} ${count === 1 ? 'запись' : 'записи'} будут удалены без возможности восстановления.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.journals.remove(this.journalId);
      await this.toast.success('Журнал удалён');
      await this.backToList();
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось удалить журнал'));
    }
  }

  protected async removeEntry(entryId: string): Promise<void> {
    const confirmed = await this.confirm.remove('Удалить запись?', 'Запись нельзя восстановить.');
    if (!confirmed) {
      return;
    }
    try {
      await this.store.removeEntry(entryId);
      await this.toast.success('Запись удалена');
    } catch (error) {
      await this.toast.error(errorMessage(error, 'Не удалось удалить запись'));
    }
  }

  /** Экспорт в PDF: сборка локально, затем шеринг или скачивание (ТЗ 8.4, 9.3). */
  protected async exportPdf(): Promise<void> {
    const journal = this.store.journal();
    if (!journal || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    try {
      const bytes = await this.pdf.generateJournal(this.journalId);
      const filename = journalPdfFilename(journal.title, this.date.today());
      await this.pdf.sharePdf(bytes, filename);
      await this.toast.success('PDF готов');
    } catch (error) {
      // Отмена системного шеринга — не ошибка.
      if ((error as { name?: string }).name === 'AbortError') {
        return;
      }
      await this.toast.error(errorMessage(error, 'Не удалось экспортировать PDF'));
    } finally {
      this.exporting.set(false);
    }
  }

  protected async backToList(): Promise<void> {
    await this.router.navigateByUrl('/journals', { replaceUrl: true });
  }
}
