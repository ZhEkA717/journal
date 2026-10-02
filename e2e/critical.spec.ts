import { expect, test } from '@playwright/test';

import { addEntry, createEmployee, createJournal, passOnboarding } from './helpers';

/** Критичные сценарии MVP (ТЗ 12.4): создание журнала, запись, экспорт PDF. */

const TEMPLATE = 'Журнал инструктажа по ПБ';
const EMPLOYEE = 'Петров Пётр';

test('создание журнала из шаблона', async ({ page }) => {
  await passOnboarding(page);
  await expect(page.getByText('Пока нет журналов')).toBeVisible();

  await createJournal(page, TEMPLATE);

  await expect(page.getByText('Открыт с')).toBeVisible();
  await expect(page.getByText('0 записей')).toBeVisible();
});

test('добавление записи в журнал', async ({ page }) => {
  await passOnboarding(page);
  await createEmployee(page, EMPLOYEE, 'Монтажник');
  await createJournal(page, TEMPLATE);

  await addEntry(page, EMPLOYEE);

  await expect(page.locator('ion-item').getByText('Вводный')).toBeVisible();
  await expect(page.locator('ion-item').getByText(EMPLOYEE)).toBeVisible();
});

test('экспорт журнала в PDF', async ({ page }) => {
  // В headless Chrome navigator.share существует, но всегда кидает AbortError
  // (нет share sheet) — отключаем его, чтобы проверить ветку скачивания.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { value: undefined });
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined });
  });
  await passOnboarding(page);
  await createEmployee(page, EMPLOYEE, 'Монтажник');
  await createJournal(page, TEMPLATE);
  await addEntry(page, EMPLOYEE);

  const downloadPromise = page.waitForEvent('download');
  await page.getByText('Экспорт в PDF', { exact: true }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});
