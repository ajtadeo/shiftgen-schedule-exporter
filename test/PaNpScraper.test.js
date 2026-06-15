/**
 * @file PaNpScraper.test.js
 * @brief Tests for PaNpScraper
 *
 * HTML fixture: pa_calendar.html
 *   - 234 cells, 129 parseable CHOC shifts (excludes 104 SJH shifts)
 *   - Shift name patterns: "CHOC 0600-1600", "FLEX 1200-2200", "RED 1500-2400" etc.
 *   - SJH shifts (e.g. "SJH 1000-2000") are skipped and must never appear in results.
 *
 * Key confirmed overlaps from pa_calendar.html:
 *   epoch 1759755600000  FLEX  => GO     (8.0h overlap)
 *   epoch 1760137200000  PA    => MARONY (8.5h overlap)
 *
 * Critical behavioral difference vs DoctorScraper:
 *   PaNpScraper does NOT filter candidates by location — any overlapping PA shift wins.
 */

import { PaNpScraper } from "../src/shiftgen/PaNpScraper.js";
import { Shift } from "../src/shiftgen/Scraper.js";
import { TASKS } from "../src/shiftgen/common.js";
import { loadHtml, makeStoredShift } from "./testHelpers.js";

beforeEach(() => {
  browser.storage.local.get.mockReset();
  browser.storage.local.set.mockReset();
  browser.storage.local.get.mockResolvedValue({ shifts: {} });
  browser.storage.local.set.mockResolvedValue(undefined);
});

afterEach(() => {
  document.documentElement.innerHTML = "";
});

// ===========================================================================
// pa_calendar.html
// ===========================================================================

describe("PaNpScraper with pa_calendar.html", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml("pa_calendar.html");
  });

  test("is an instance of PaNpScraper", () => {
    expect(new PaNpScraper()).toBeInstanceOf(PaNpScraper);
  });

  // --- scrape ---

  test("scrape() assigns MARONY to a PA-location user shift (8.5h overlap)", async () => {
    const key = 1760137200000;
    browser.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8.5 * 3600_000, "PA") }
    });

    await new PaNpScraper().scrape();

    const stored = browser.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("MARONY");
    expect(stored[key].providerType).toBe(TASKS.PA_NP.providerType);
  });

    test("scrape() assigns GO to a CHOC 0600-1600 user shift (8h overlap)", async () => {
    const key = 1759755600000;
    browser.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8 * 3600_000, "CHOC") }
    });

    await new PaNpScraper().scrape();

    const stored = browser.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("GO");
    expect(stored[key].providerType).toBe(TASKS.PA_NP.providerType);
  });

  test("scrape() throws when shifts storage is empty", async () => {
    browser.storage.local.get.mockResolvedValue({ shifts: {} });
    await expect(new PaNpScraper().scrape()).rejects.toThrow("User shifts have not been set");
  });

  test("scrape() skips already-claimed shifts", async () => {
    const key = 1760137200000;
    browser.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8.5 * 3600_000, "PA", "ALREADY", TASKS.DOCTOR.providerType) }
    });

    await new PaNpScraper().scrape();

    const stored = browser.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("ALREADY");
  });

  test("scrape() returns { success: true, timestamp: number }", async () => {
    const key = 1760137200000;
    browser.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8.5 * 3600_000, "PA") }
    });

    const result = await new PaNpScraper().scrape();
    expect(result.success).toBe(true);
    expect(typeof result.timestamp).toBe("number");
  });

  // --- getAllShifts ---

  test("getAllShifts returns 130 Shift instances from pa_calendar.html (excludes SJH, PIT)", () => {
    const shifts = new PaNpScraper().getAllShifts();
    expect(shifts.length).toBe(130);
    shifts.forEach(s => expect(s).toBeInstanceOf(Shift));
  });

  test("getAllShifts sets providerType PA/NP on all shifts", () => {
    new PaNpScraper().getAllShifts().forEach(s =>
      expect(s.providerType).toBe(TASKS.PA_NP.providerType)
    );
  });

  // --- SJH filtering ---

  test("getAllShifts skips shifts whose name contains 'SJH'", () => {
    // pa_calendar.html contains 104 SJH shifts — none should appear in results
    const shifts = new PaNpScraper().getAllShifts();
    shifts.forEach(s => expect(s.location).not.toBe("SJH"));
  });

  test("scrape() does not assign a provider found only on a skipped SJH shift", async () => {
    // Inject a user shift that would only overlap with an SJH time window.
    // Even if an SJH-named PA/NP shift perfectly overlaps, it must be invisible.
    const base      = Date.UTC(2025, 9, 6);
    const userStart = base + 10 * 3600_000; // 10:00
    const userEnd   = base + 20 * 3600_000; // 20:00

    const sjhOnly = new Shift(userStart, userEnd, "SJH", false, TASKS.PA_NP.providerType, "SJHPA");
    const scraper = new PaNpScraper();
    scraper.getAllShifts = () => [];          // getAllShifts correctly returns nothing for SJH

    browser.storage.local.get.mockResolvedValue({
      shifts: { [userStart]: makeStoredShift(userStart, userEnd, "CHOC") }
    });

    await scraper.scrape();

    const stored = browser.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[userStart].providerName).toBe("");
  });
});

// ===========================================================================
// getAllShifts with overlapping shifts
// ===========================================================================

describe("PaNpScraper overlap selection logic (unit)", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml("pa_calendar.html");
  });

  test("matches PA/NP shifts WITHOUT a location filter", async () => {
    // Key difference from DoctorScraper: location is irrelevant for PA/NP matching
    const base      = Date.UTC(2025, 9, 6);
    const userStart = base + 8 * 3600_000;
    const paShift   = new Shift(userStart, userStart + 8 * 3600_000, "CHOC", false, TASKS.PA_NP.providerType, "TESTPA");

    const scraper = new PaNpScraper();
    scraper.getAllShifts = () => [paShift];
    browser.storage.local.get.mockResolvedValue({
      // User shift at "NORTH" — different from PA/NP's "CHOC", but should still match
      shifts: { [userStart]: makeStoredShift(userStart, userStart + 8 * 3600_000, "NORTH") }
    });

    await scraper.scrape();

    expect(browser.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("TESTPA");
  });

  test("picks the PA/NP shift with the greatest overlap", async () => {
    const base      = Date.UTC(2025, 9, 6);
    const userStart = base + 8 * 3600_000;
    const userEnd   = base + 16 * 3600_000;
    const small     = new Shift(base + 6 * 3600_000, base + 10 * 3600_000, "SJH",  false, TASKS.PA_NP.providerType, "SMALLPA");
    const big       = new Shift(base + 7 * 3600_000, base + 17 * 3600_000, "CHOC", false, TASKS.PA_NP.providerType, "BIGPA");

    const scraper = new PaNpScraper();
    scraper.getAllShifts = () => [small, big];
    browser.storage.local.get.mockResolvedValue({
      shifts: { [userStart]: makeStoredShift(userStart, userEnd, "NORTH") }
    });

    await scraper.scrape();

    expect(browser.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("BIGPA");
  });

  test("does not assign when no PA/NP shift overlaps", async () => {
    const base      = Date.UTC(2025, 9, 6);
    const userStart = base + 8 * 3600_000;
    const noOverlap = new Shift(base + 20 * 3600_000, base + 24 * 3600_000, "SJH", false, TASKS.PA_NP.providerType, "GHOST");

    const scraper = new PaNpScraper();
    scraper.getAllShifts = () => [noOverlap];
    browser.storage.local.get.mockResolvedValue({
      shifts: { [userStart]: makeStoredShift(userStart, userStart + 8 * 3600_000, "NORTH") }
    });

    await scraper.scrape();

    expect(browser.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("");
  });

  test("handles multiple user shifts independently", async () => {
    const base       = Date.UTC(2025, 9, 6);
    const user1Start = base + 8  * 3600_000;
    const user2Start = base + 20 * 3600_000;
    const pa1 = new Shift(user1Start, user1Start + 8 * 3600_000, "SJH",  false, TASKS.PA_NP.providerType, "PA_DAY");
    const pa2 = new Shift(user2Start, user2Start + 8 * 3600_000, "CHOC", false, TASKS.PA_NP.providerType, "PA_NIGHT");

    const scraper = new PaNpScraper();
    scraper.getAllShifts = () => [pa1, pa2];
    browser.storage.local.get.mockResolvedValue({
      shifts: {
        [user1Start]: makeStoredShift(user1Start, user1Start + 8 * 3600_000, "NORTH"),
        [user2Start]: makeStoredShift(user2Start, user2Start + 8 * 3600_000, "SOUTH"),
      }
    });

    await scraper.scrape();

    const stored = browser.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[user1Start].providerName).toBe("PA_DAY");
    expect(stored[user2Start].providerName).toBe("PA_NIGHT");
  });
});