/**
 * @file DoctorScraper.test.js
 * @brief Tests doctor calendar scraping
 */

const path = require('path');
const filePath1 = path.join(__dirname, '../html/doctor_calendar_1.html');
const filePath2 = path.join(__dirname, '../html/doctor_calendar_2.html');

describe("Doctor Calendar", () => {
  beforeAll(async () => {

  });

  test("should be called ShiftGen", async () => {
    await page.goto(`file://${filePath1}`);
    await expect(page.title()).resolves.toMatch('ShiftGen');
  })

  test("should be called ShiftGen", async () => {
    await page.goto(`file://${filePath2}`);
    await expect(page.title()).resolves.toMatch('ShiftGen');
  })
})