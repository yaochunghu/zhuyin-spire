import { expect, test, type Page } from '@playwright/test';
import { eventsForAct } from '../../src/data/events';

async function debugClick(page: Page, rowName: string, buttonName: string): Promise<void> {
  await page
    .locator('.debug-row')
    .filter({ hasText: rowName })
    .getByRole('button', { name: buttonName, exact: true })
    .click();
}

async function openEvent(page: Page, eventId: string, act: 1 | 2 | 3): Promise<void> {
  const actButton = act === 1 ? 'I' : act === 2 ? 'II' : 'III';
  await debugClick(page, 'Act', actButton);
  await page.locator('.debug-event-select').selectOption(eventId);
  await debugClick(page, 'Event', 'Open event');
  await expect(page.locator('.event-screen')).toHaveAttribute('data-event-id', eventId);
  await expect(page.locator('.event-screen')).toHaveAttribute('data-act', String(act));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?debug=1');
});

test('和聲門 shows both choices, then pays the printed gold', async ({ page }) => {
  await openEvent(page, 'event_a1_whispering_door', 1);
  await expect(page.getByRole('heading', { name: '和聲門' })).toBeVisible();
  const listen = page.getByRole('button', { name: /貼著聽/ });
  const knock = page.getByRole('button', { name: /輕輕敲/ });
  await expect(listen).toBeEnabled();
  await expect(knock).toBeEnabled();
  await page.locator('.debug-head .debug-btn-icon').click();
  await page.screenshot({ path: '/opt/cursor/artifacts/event-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/opt/cursor/artifacts/event-phone.png', fullPage: true });
  await knock.click();
  await expect(page.locator('.event-result')).toContainText('拿到 35 金幣');
  await page.getByRole('button', { name: '繼續', exact: true }).click();
  await expect(page.locator('.map-stage')).toBeVisible();
});

test('visits every event in every act', async ({ page }) => {
  test.setTimeout(180_000);
  for (const act of [1, 2, 3] as const) {
    for (const event of eventsForAct(act)) {
      await openEvent(page, event.id, act);
      await expect(page.getByRole('heading', { name: event.title })).toBeVisible();
      const leave = page.locator('.event-choice').filter({ hasText: /離開/ });
      await expect(leave).toBeEnabled();
      const disabled = page.locator('.event-choice:disabled');
      const disabledCount = await disabled.count();
      for (let index = 0; index < disabledCount; index += 1) {
        await expect(disabled.nth(index).locator('.event-choice-reason')).not.toHaveText('');
      }
      const overflow = await page.locator('#app').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(overflow).toBe(true);
      await leave.click();
      await expect(page.locator('.map-stage')).toBeVisible();
    }
  }
});
