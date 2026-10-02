import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/**
 * Отчёты — заглушка вкладки. В MVP раздел не входит (TZ 14), вкладка оставлена
 * как точка входа для будущего этапа.
 */
@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './reports.page.html',
})
export class ReportsPage {}
