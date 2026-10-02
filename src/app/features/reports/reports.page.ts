import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Отчёты — заглушка вкладки. В MVP раздел не входит (ТЗ 15: backlog), вкладка
 * оставлена по ТЗ 8.2 как точка входа для будущей аналитики.
 */
@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './reports.page.html',
})
export class ReportsPage {}
