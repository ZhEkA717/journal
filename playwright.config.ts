import { defineConfig, devices } from '@playwright/test';

/**
 * E2E-тесты критичных сценариев (ТЗ 12.4): создание журнала, добавление
 * записи и экспорт PDF. Сервер поднимает сам Playwright (`webServer`), уже
 * запущенный dev-сервер переиспользуется.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  // Системный Chrome вместо скачивания Chromium (cdn.playwright.dev недоступен).
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
