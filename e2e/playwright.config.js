import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm --prefix ../backend start',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'npm --prefix ../admin run dev -- --host localhost --port 5175',
      url: 'http://localhost:5175',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'npm --prefix ../montage run dev -- --host localhost --port 5174',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
