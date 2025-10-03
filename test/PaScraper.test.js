/**
 * @file PaScraper.test.js
 * @brief Tests PA calendar scraping
 */

const path = require('path');

describe("PA Calendar", () => {
  beforeAll(async () => {
    const filePath = path.join(__dirname, '../html/pa_calendar.html');
    await page.goto(`file://${filePath}`);
  });

  test("should be called ShiftGen", async () => {
    await expect(page.title()).resolves.toMatch('ShiftGen');
  })
})