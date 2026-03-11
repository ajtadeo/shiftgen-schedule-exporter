/**
 * @file PaScraper.test.js
 * @brief Tests for PaScraper
 *
 * HTML fixture: pa_calendar.html
 *   - 233 cells, 130 parseable
 *   - Shift name patterns: "CHOC 0600-1600", "SJH 1000-2000", "FLEX 1200-2200" etc.
 *
 * Key confirmed overlaps from pa_calendar.html:
 *   epoch 1759741200000  FLEX  => GO     (7.0h overlap)
 *   epoch 1760112000000  PA    => MARONY (8.5h overlap)
 *
 * Critical behavioral difference vs DoctorScraper:
 *   PaScraper does NOT filter candidates by location — any overlapping PA shift wins.
 */

import { PaScraper } from "../src/shiftgen/PaScraper.js";
import { Shift } from "../src/shiftgen/Scraper.js";
import { TASKS } from "../src/shiftgen/common.js";
import { loadHtml, makeStoredShift } from "./scraperTestHelpers.js";

beforeEach(() => {
  chrome.storage.local.get.mockReset();
  chrome.storage.local.set.mockReset();
  chrome.storage.local.get.mockResolvedValue({ shifts: {} });
  chrome.storage.local.set.mockResolvedValue(undefined);
});

afterEach(() => {
  document.documentElement.innerHTML = "";
});

// ===========================================================================
// pa_calendar.html
// ===========================================================================

describe("PaScraper with pa_calendar.html", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml("pa_calendar.html");
  });

  test("is an instance of PaScraper", () => {
    expect(new PaScraper()).toBeInstanceOf(PaScraper);
  });

  // --- scrape ---

  test("scrape() assigns MARONY to a PA-location user shift (8.5h overlap)", async () => {
    const key = 1760112000000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8.5 * 3600_000, "PA") }
    });

    await new PaScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("MARONY");
    expect(stored[key].providerType).toBe(TASKS.PA.id);
  });

  test("scrape() assigns GO to the FLEX user shift (7h overlap)", async () => {
    const key = 1759741200000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8 * 3600_000, "FLEX") }
    });

    await new PaScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("GO");
    expect(stored[key].providerType).toBe(TASKS.PA.id);
  });

  test("scrape() throws when shifts storage is empty", async () => {
    chrome.storage.local.get.mockResolvedValue({ shifts: {} });
    await expect(new PaScraper().scrape()).rejects.toThrow("User shifts have not been set");
  });

  test("scrape() skips already-claimed shifts", async () => {
    const key = 1760112000000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8.5 * 3600_000, "PA", "ALREADY", TASKS.DOCTOR.id) }
    });

    await new PaScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("ALREADY");
  });

  test("scrape() returns { success: true, timestamp: number }", async () => {
    const key = 1760112000000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8.5 * 3600_000, "PA") }
    });

    const result = await new PaScraper().scrape();
    expect(result.success).toBe(true);
    expect(typeof result.timestamp).toBe("number");
  });

  // --- getAllShifts ---

  test("getAllShifts returns 130 Shift instances from pa_calendar.html", () => {
    const shifts = new PaScraper().getAllShifts();
    expect(shifts.length).toBe(130);
    shifts.forEach(s => expect(s).toBeInstanceOf(Shift));
  });

  test("getAllShifts sets providerType PA on all shifts", () => {
    new PaScraper().getAllShifts().forEach(s =>
      expect(s.providerType).toBe(TASKS.PA.id)
    );
  });
});

// ===========================================================================
// getAllShifts with overlapping shifts
// ===========================================================================

describe("PaScraper overlap selection logic (unit)", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml("pa_calendar.html");
  });

  test("matches PA shifts WITHOUT a location filter", async () => {
    // Key difference from DoctorScraper: location is irrelevant for PA matching
    const base      = new Date(2025, 9, 6).getTime();
    const userStart = base + 8 * 3600_000;
    const paShift   = new Shift(userStart, userStart + 8 * 3600_000, "CHOC", false, TASKS.PA.id, "TESTPA");

    const scraper = new PaScraper();
    scraper.getAllShifts = () => [paShift];
    chrome.storage.local.get.mockResolvedValue({
      // User shift at "NORTH" — different from PA's "CHOC", but should still match
      shifts: { [userStart]: makeStoredShift(userStart, userStart + 8 * 3600_000, "NORTH") }
    });

    await scraper.scrape();

    expect(chrome.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("TESTPA");
  });

  test("picks the PA shift with the greatest overlap", async () => {
    const base      = new Date(2025, 9, 6).getTime();
    const userStart = base + 8 * 3600_000;
    const userEnd   = base + 16 * 3600_000;
    const small     = new Shift(base + 6 * 3600_000, base + 10 * 3600_000, "SJH",  false, TASKS.PA.id, "SMALLPA");
    const big       = new Shift(base + 7 * 3600_000, base + 17 * 3600_000, "CHOC", false, TASKS.PA.id, "BIGPA");

    const scraper = new PaScraper();
    scraper.getAllShifts = () => [small, big];
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [userStart]: makeStoredShift(userStart, userEnd, "NORTH") }
    });

    await scraper.scrape();

    expect(chrome.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("BIGPA");
  });

  test("does not assign when no PA shift overlaps", async () => {
    const base      = new Date(2025, 9, 6).getTime();
    const userStart = base + 8 * 3600_000;
    const noOverlap = new Shift(base + 20 * 3600_000, base + 24 * 3600_000, "SJH", false, TASKS.PA.id, "GHOST");

    const scraper = new PaScraper();
    scraper.getAllShifts = () => [noOverlap];
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [userStart]: makeStoredShift(userStart, userStart + 8 * 3600_000, "NORTH") }
    });

    await scraper.scrape();

    expect(chrome.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("");
  });

  test("handles multiple user shifts independently", async () => {
    const base       = new Date(2025, 9, 6).getTime();
    const user1Start = base + 8  * 3600_000;
    const user2Start = base + 20 * 3600_000;
    const pa1 = new Shift(user1Start, user1Start + 8 * 3600_000, "SJH",  false, TASKS.PA.id, "PA_DAY");
    const pa2 = new Shift(user2Start, user2Start + 8 * 3600_000, "CHOC", false, TASKS.PA.id, "PA_NIGHT");

    const scraper = new PaScraper();
    scraper.getAllShifts = () => [pa1, pa2];
    chrome.storage.local.get.mockResolvedValue({
      shifts: {
        [user1Start]: makeStoredShift(user1Start, user1Start + 8 * 3600_000, "NORTH"),
        [user2Start]: makeStoredShift(user2Start, user2Start + 8 * 3600_000, "SOUTH"),
      }
    });

    await scraper.scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[user1Start].providerName).toBe("PA_DAY");
    expect(stored[user2Start].providerName).toBe("PA_NIGHT");
  });
});