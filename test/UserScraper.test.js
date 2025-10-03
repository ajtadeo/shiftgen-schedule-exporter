/**
 * @file UserScraper.test.js
 * @brief Tests user calendar scraping
 */

const path = require('path');

describe("User Calendar", () => {
  beforeAll(async () => {
    const filePath = path.join(__dirname, '../html/user_calendar.html');
    await page.goto(`file://${filePath}`);
  });

  test("should be called ShiftGen", async () => {
    await expect(page.title()).resolves.toMatch('ShiftGen');
  })
})