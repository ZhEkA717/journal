import { bootstrapApplication } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  barChartOutline,
  bookOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  chevronForwardOutline,
  closeOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  createOutline,
  downloadOutline,
  ellipsisVerticalOutline,
  flameOutline,
  listOutline,
  lockClosedOutline,
  peopleOutline,
  refreshOutline,
  searchOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  sunnyOutline,
  syncOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

addIcons({
  addOutline,
  alertCircleOutline,
  barChartOutline,
  bookOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  chevronForwardOutline,
  closeOutline,
  cloudDoneOutline,
  cloudOfflineOutline,
  createOutline,
  downloadOutline,
  ellipsisVerticalOutline,
  flameOutline,
  listOutline,
  lockClosedOutline,
  peopleOutline,
  refreshOutline,
  searchOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  sunnyOutline,
  syncOutline,
  trashOutline,
  warningOutline,
});

bootstrapApplication(AppComponent, appConfig).catch((err: unknown) => console.error(err));
