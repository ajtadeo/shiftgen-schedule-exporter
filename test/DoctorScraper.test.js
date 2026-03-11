/**
 * @file DoctorScraper.test.js
 * @brief Tests for DoctorScraper
 *
 * HTML fixtures:
 *   doctor_calendar_1.html - 264 cells, 128 parseable
 *   doctor_calendar_2.html - 264 cells, 128 parseable (identical structure, different month)
 *
 * Key confirmed overlaps from doctor_calendar_1.html:
 *   epoch 1759741200000  FLEX   => MEHTA  (8.0h overlap)
 *   epoch 1759843800000  NORTH  => YUAN   (8.5h overlap)
 */

import { DoctorScraper } from "../src/shiftgen/DoctorScraper.js";
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
// doctor_calendar_1.html
// ===========================================================================

describe("DoctorScraper with doctor_calendar_1.html", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml("doctor_calendar_1.html");
  });

  test("is an instance of DoctorScraper", () => {
    expect(new DoctorScraper()).toBeInstanceOf(DoctorScraper);
  });

  // --- scrape ---

  test("scrape() assigns MEHTA to the FLEX user shift (8h overlap)", async () => {
    const key = 1759741200000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8 * 3600_000, "FLEX") }
    });

    await new DoctorScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("MEHTA");
    expect(stored[key].providerType).toBe(TASKS.DOCTOR.id);
  });

  test("scrape() assigns YUAN to the NORTH 1330-2200 user shift (8.5h overlap)", async () => {
    const key = 1759843800000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8.5 * 3600_000, "NORTH") }
    });

    await new DoctorScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("YUAN");
    expect(stored[key].providerType).toBe(TASKS.DOCTOR.id);
  });

  test("scrape() does not assign a doctor to a PA-location shift (no location match)", async () => {
    const key = 1760112000000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8.5 * 3600_000, "PA") }
    });

    await new DoctorScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("");
  });

  test("scrape() skips already-claimed shifts (providerName !== '')", async () => {
    const key = 1759741200000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8 * 3600_000, "FLEX", "ALREADY_SET", TASKS.DOCTOR.id) }
    });

    await new DoctorScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBe("ALREADY_SET");
  });

  test("scrape() throws when shifts storage is empty", async () => {
    chrome.storage.local.get.mockResolvedValue({ shifts: {} });
    await expect(new DoctorScraper().scrape()).rejects.toThrow("User shifts have not been set");
  });

  test("scrape() saves updated shifts back to chrome storage", async () => {
    const key = 1759741200000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8 * 3600_000, "FLEX") }
    });

    await new DoctorScraper().scrape();

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ shifts: expect.any(Object) })
    );
  });

  test("scrape() returns { success: true, timestamp: number }", async () => {
    const key = 1759741200000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8 * 3600_000, "FLEX") }
    });

    const result = await new DoctorScraper().scrape();
    expect(result.success).toBe(true);
    expect(typeof result.timestamp).toBe("number");
  });

  // --- getAllShifts ---

  test("getAllShifts returns 128 Shift instances from doctor_calendar_1.html", () => {
    const shifts = new DoctorScraper().getAllShifts();
    expect(shifts.length).toBe(128);
    shifts.forEach(s => expect(s).toBeInstanceOf(Shift));
  });

  test("getAllShifts sets providerType DOCTOR on all shifts", () => {
    new DoctorScraper().getAllShifts().forEach(s =>
      expect(s.providerType).toBe(TASKS.DOCTOR.id)
    );
  });
});

// ===========================================================================
// doctor_calendar_2.html
// ===========================================================================

describe("DoctorScraper with doctor_calendar_2.html", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml("doctor_calendar_2.html");
  });

  test("getAllShifts returns 128 Shift instances from doctor_calendar_2.html", () => {
    expect(new DoctorScraper().getAllShifts().length).toBe(128);
  });

  test("scrape() assigns a doctor to FLEX shift using calendar_2 data", async () => {
    const key = 1759741200000;
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [key]: makeStoredShift(key, key + 8 * 3600_000, "FLEX") }
    });

    await new DoctorScraper().scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[key].providerName).toBeTruthy();
    expect(stored[key].providerType).toBe(TASKS.DOCTOR.id);
  });
});

// ===========================================================================
// getAllShifts with overlapping shifts
// ===========================================================================

describe("DoctorScraper overlap selection logic (unit)", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadHtml("doctor_calendar_1.html");
  });

  test("picks the shift with the greatest overlap when multiple candidates exist", async () => {
    const base      = new Date(2025, 9, 6).getTime();
    const userStart = base + 8 * 3600_000;
    const userEnd   = base + 16 * 3600_000;
    const small     = new Shift(base + 6 * 3600_000, base + 10 * 3600_000, "LOC", false, TASKS.DOCTOR.id, "SMALL");
    const big       = new Shift(base + 7 * 3600_000, base + 17 * 3600_000, "LOC", false, TASKS.DOCTOR.id, "BIG");

    const scraper = new DoctorScraper();
    scraper.getAllShifts = () => [small, big];
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [userStart]: makeStoredShift(userStart, userEnd, "LOC") }
    });

    await scraper.scrape();

    expect(chrome.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("BIG");
  });

  test("does not assign when no doctor shift overlaps", async () => {
    const base      = new Date(2025, 9, 6).getTime();
    const userStart = base + 8 * 3600_000;
    const noOverlap = new Shift(base + 20 * 3600_000, base + 24 * 3600_000, "LOC", false, TASKS.DOCTOR.id, "GHOST");

    const scraper = new DoctorScraper();
    scraper.getAllShifts = () => [noOverlap];
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [userStart]: makeStoredShift(userStart, userStart + 8 * 3600_000, "LOC") }
    });

    await scraper.scrape();

    expect(chrome.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("");
  });

  test("ignores doctor shifts at a different location", async () => {
    const base      = new Date(2025, 9, 6).getTime();
    const userStart = base + 8 * 3600_000;
    const wrongLoc  = new Shift(userStart, userStart + 8 * 3600_000, "WRONGLOC", false, TASKS.DOCTOR.id, "WRONGDOC");

    const scraper = new DoctorScraper();
    scraper.getAllShifts = () => [wrongLoc];
    chrome.storage.local.get.mockResolvedValue({
      shifts: { [userStart]: makeStoredShift(userStart, userStart + 8 * 3600_000, "RIGHTLOC") }
    });

    await scraper.scrape();

    expect(chrome.storage.local.set.mock.calls[0][0].shifts[userStart].providerName).toBe("");
  });

  test("handles multiple user shifts independently", async () => {
    const base       = new Date(2025, 9, 6).getTime();
    const user1Start = base + 8  * 3600_000;
    const user2Start = base + 20 * 3600_000;
    const doc1 = new Shift(user1Start, user1Start + 8 * 3600_000, "NORTH", false, TASKS.DOCTOR.id, "DOCNORTH");
    const doc2 = new Shift(user2Start, user2Start + 8 * 3600_000, "SOUTH", false, TASKS.DOCTOR.id, "DOCSOUTH");

    const scraper = new DoctorScraper();
    scraper.getAllShifts = () => [doc1, doc2];
    chrome.storage.local.get.mockResolvedValue({
      shifts: {
        [user1Start]: makeStoredShift(user1Start, user1Start + 8 * 3600_000, "NORTH"),
        [user2Start]: makeStoredShift(user2Start, user2Start + 8 * 3600_000, "SOUTH"),
      }
    });

    await scraper.scrape();

    const stored = chrome.storage.local.set.mock.calls[0][0].shifts;
    expect(stored[user1Start].providerName).toBe("DOCNORTH");
    expect(stored[user2Start].providerName).toBe("DOCSOUTH");
  });
});