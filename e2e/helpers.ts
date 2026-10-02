import { expect, type Page } from '@playwright/test';

/** Проходит онбординг: создаёт организацию и открывает список журналов. */
export async function passOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('ion-input[placeholder="ООО «Ромашка»"] input').fill('ООО «Ромашка»');
  await page.locator('ion-input[placeholder="Иванов И.И."] input').fill('Иванов Иван Иванович');
  await page.getByText('Начать работу', { exact: true }).click();
  await page.waitForURL('**/journals');
}

/** Открывает вкладку и создаёт сотрудника. */
export async function createEmployee(
  page: Page,
  fullName: string,
  position: string,
): Promise<void> {
  await page.getByRole('tab', { name: 'Сотрудники' }).click();
  await page.waitForURL('**/employees');
  await page.locator('a[href="/employees/new"]').click();
  await page.waitForURL('**/employees/new');
  await page.locator('ion-input[placeholder="Иванов Иван Иванович"] input').fill(fullName);
  await page.locator('ion-input[placeholder="Монтажник"] input').fill(position);
  await page.getByText('Сохранить', { exact: true }).click();
  await page.waitForURL('**/employees');
  await expect(page.getByRole('heading', { name: fullName })).toBeVisible();
}

/** Открывает список журналов и создаёт журнал из указанного шаблона. */
export async function createJournal(page: Page, templateName: string): Promise<void> {
  await page.getByRole('tab', { name: 'Журналы' }).click();
  await page.waitForURL('**/journals');
  await page.locator('a[href="/journals/create"]').click();
  await page.waitForURL('**/journals/create');
  await page.getByRole('button', { name: templateName }).click();
  await page.getByText('Создать журнал', { exact: true }).click();
  await page.waitForURL(/\/journals\/[^/]+$/);
}

/** Открывает форму новой записи и заполняет её: сотрудник, вид, подпись. */
export async function addEntry(page: Page, employeeName: string): Promise<void> {
  await page.locator('[aria-label="Добавить запись"]').click();
  await page.waitForURL('**/entries/new');

  await page.locator('ion-select', { hasText: 'Сотрудник' }).click();
  await page.locator('ion-action-sheet button', { hasText: employeeName }).click();

  await page.locator('ion-select', { hasText: 'Вид инструктажа' }).click();
  await page.locator('ion-action-sheet button', { hasText: 'Вводный' }).click();

  // Рисуем подпись пальцем/мышью по canvas (ТЗ 8.5).
  const canvas = page.locator('app-signature-pad canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (box) {
    const startX = box.x + box.width * 0.2;
    const y = box.y + box.height / 2;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX + box.width * 0.3, y - 20, { steps: 8 });
    await page.mouse.move(startX + box.width * 0.6, y + 15, { steps: 8 });
    await page.mouse.up();
  }

  await page.getByText('Сохранить запись', { exact: true }).click();
  await page.waitForURL(/\/journals\/[^/]+$/);
}
