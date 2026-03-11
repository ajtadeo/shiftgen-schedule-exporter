/**
 * @file UserScraper.test.js
 * @brief Tests for UserScraper
 *
 * HTML fixture: user_calendar.html
 *   - 26 cells, 13 parseable from the main calendar element
 *   - All assignee values are "Empty"
 *   - Mix of Pattern 1 ("North 2130-0600") and Pattern 3 ("1900-0330 PA")
 */

import { UserScraper } from "../src/shiftgen/UserScraper.js";
import { Shift } from "../src/shiftgen/Scraper.js";
import { TASKS } from "../src/shiftgen/common.js";
import { loadHtml, makeStoredShift } from "./scraperTestHelpers.js";

beforeEach(() => {
  chrome.storage.local.get.mockReset();
  chrome.storage.local.set.mockReset();
  chrome.storage.local.get.mockResolvedValue({ shifts: {} });
  chrome.storage.local.set.mockResolvedValue(undefined);
  document.documentElement.innerHTML = loadHtml("user_calendar.html");
});

afterEach(() => {
  document.documentElement.innerHTML = "";
});

// ===========================================================================
// user_calendar.html
// ===========================================================================

describe("UserScraper", () => {
  test("is an instance of UserScraper", () => {
    expect(new UserScraper()).toBeInstanceOf(UserScraper);
  });

  // --- scrape ---

  test("scrape() stores all 13 parseable shifts in chrome storage", async () => {
    chrome.storage.local.get.mockResolvedValue({ shifts: {} });

    await new UserScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(Object.keys(stored).length).toBe(13);
  });

  test("scrape() stores Shift-shaped objects with all required keys", async () => {
    chrome.storage.local.get.mockResolvedValue({ shifts: {} });

    await new UserScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    for (const shift of Object.values(stored)) {
      expect(shift).toHaveProperty("startTime");
      expect(shift).toHaveProperty("endTime");
      expect(shift).toHaveProperty("location");
      expect(shift).toHaveProperty("overnight");
      expect(shift).toHaveProperty("providerType");
      expect(shift).toHaveProperty("providerName");
    }
  });

  test("scrape() sets providerType to USER for all stored shifts", async () => {
    chrome.storage.local.get.mockResolvedValue({ shifts: {} });

    await new UserScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    for (const shift of Object.values(stored)) {
      expect(shift.providerType).toBe(TASKS.USER.id);
    }
  });

  test("scrape() uses startTime as the storage key for each shift", async () => {
    chrome.storage.local.get.mockResolvedValue({ shifts: {} });

    await new UserScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    for (const [key, shift] of Object.entries(stored)) {
      expect(Number(key)).toBe(shift.startTime);
    }
  });

  test("scrape() correctly identifies overnight shifts (endTime > startTime)", async () => {
    chrome.storage.local.get.mockResolvedValue({ shifts: {} });

    await new UserScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    const overnights = Object.values(stored).filter(s => s.overnight);
    // user_calendar has several overnight shifts e.g. "North 2130-0600", "South 2130-0600"
    expect(overnights.length).toBeGreaterThan(0);
    for (const s of overnights) {
      expect(s.endTime).toBeGreaterThan(s.startTime);
    }
  });

  test("scrape() merges into existing shifts without overwriting unrelated entries", async () => {
    const sentinel = makeStoredShift(9999, 10000, "OTHER", "SOMEONE", TASKS.DOCTOR.id);
    chrome.storage.local.get.mockResolvedValue({ shifts: { 9999: sentinel } });

    await new UserScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[9999]).toEqual(sentinel);
    expect(Object.keys(stored).length).toBeGreaterThan(1);
  });

  // --- getAllShifts ---

  test("getAllShifts returns 13 Shift instances from user_calendar.html", () => {
    const shifts = new UserScraper().getAllShifts();
    expect(shifts.length).toBe(13);
    shifts.forEach(s => expect(s).toBeInstanceOf(Shift));
  });

  test("getAllShifts sets providerType USER and empty providerName on all shifts", () => {
    new UserScraper().getAllShifts().forEach(s => {
      expect(s.providerType).toBe(TASKS.USER.id);
      expect(s.providerName).toBe("");
    });
  });
});