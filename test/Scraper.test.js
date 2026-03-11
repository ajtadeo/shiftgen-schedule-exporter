/**
 * @file Scraper.test.js
 * @brief Tests base scraper class and shift class
 */
import { Scraper, Shift } from "../src/shiftgen/Scraper.js";
import { TASKS } from "../src/shiftgen/common.js";
import { loadHtml } from "./scraperTestHelpers.js";

/**
 * @brief Builds a minimal shift cell element with the given attributes.
 * @param {string} nameValue   data-shift-cell-component-name-value
 * @param {string} shiftKey    data-shift-cell-component-shift-key-value  (YYYY_MM_DD)
 * @param {string} assignee    data-shift-cell-component-assignee-value
 */
function makeShiftCell(nameValue, shiftKey, assignee) {
  const cell = document.createElement("div");
  cell.classList.add("shift-cell");
  cell.setAttribute("data-shift-cell-component-name-value", nameValue);
  cell.setAttribute("data-shift-cell-component-shift-key-value", shiftKey);
  cell.setAttribute("data-shift-cell-component-assignee-value", assignee);
  return cell;
}

beforeEach(() => {
  document.documentElement.innerHTML = loadHtml("user_calendar.html");
});

afterEach(() => {
  document.documentElement.innerHTML = "";
});

// ===========================================================================
// Shift
// ===========================================================================

describe("Shift", () => {
  const s = new Shift(1000, 2000, "NORTH", false, TASKS.DOCTOR.id, "SMITH");

  test("constructor sets all properties", () => {
    expect(s.startTime).toBe(1000);
    expect(s.endTime).toBe(2000);
    expect(s.location).toBe("NORTH");
    expect(s.overnight).toBe(false);
    expect(s.providerType).toBe(TASKS.DOCTOR.id);
    expect(s.providerName).toBe("SMITH");
  });

  test("getJSON returns correct shape", () => {
    const json = s.getJSON();
    expect(json).toEqual({
      startTime: 1000,
      endTime: 2000,
      location: "NORTH",
      overnight: false,
      providerType: TASKS.DOCTOR.id,
      providerName: "SMITH",
    });
  });

  test("getJSON returns a plain object, not a Shift instance", () => {
    expect(s.getJSON()).not.toBeInstanceOf(Shift);
  });

  test("print does not throw", () => {
    expect(() => s.print()).not.toThrow();
  });
});

// ===========================================================================
// Scraper
// ===========================================================================

describe("Scraper", () => {
  let scraper;

  beforeEach(() => {
    scraper = new Scraper(TASKS.DOCTOR);
  });

  // -------------------------------------------------------------------------
  // parseShiftCell
  // -------------------------------------------------------------------------

  describe("parseShiftCell", () => {
    test("pattern 1: 'LOCATION HHMM-HHMM' returns a valid Shift", () => {
      // e.g. "North 2130-0600"
      const cell = makeShiftCell("North 2130-0600", "2026_03_10", "SMITH");
      const shift = scraper.parseShiftCell(cell);
      expect(shift).toBeInstanceOf(Shift);
      expect(shift.location).toBe("NORTH");
      expect(shift.overnight).toBe(true); // 0600 < 2130
    });

    test("pattern 2: 'HHMM-HHMM (LOCATION)' returns a valid Shift", () => {
      // e.g. "1700-0100 (RED)"
      const cell = makeShiftCell("1700-0100 (RED)", "2026_03_10", "JONES");
      const shift = scraper.parseShiftCell(cell);
      expect(shift).toBeInstanceOf(Shift);
      expect(shift.location).toBe("RED");
      expect(shift.overnight).toBe(true);
    });

    test("pattern 3: 'HHMM-HHMM LOCATION' returns a valid Shift", () => {
      // e.g. "1900-0330 PA"
      const cell = makeShiftCell("1900-0330 PA", "2026_03_10", "DOE");
      const shift = scraper.parseShiftCell(cell);
      expect(shift).toBeInstanceOf(Shift);
      expect(shift.location).toBe("PA");
    });

    test("returns undefined when name value does not match any pattern", () => {
      const cell = makeShiftCell("INVALID", "2026_03_10", "TEST");
      expect(scraper.parseShiftCell(cell)).toBeUndefined();
    });

    test("returns undefined when shift key date is malformed", () => {
      const cell = makeShiftCell("North 0800-1600", "bad_date", "SMITH");
      expect(scraper.parseShiftCell(cell)).toBeUndefined();
    });

    // --- overnight flag ---

    test("overnight is false when end time is after start time", () => {
      const cell = makeShiftCell("North 0800-1600", "2026_03_10", "SMITH");
      const shift = scraper.parseShiftCell(cell);
      expect(shift.overnight).toBe(false);
    });

    test("overnight is true when end time is before start time", () => {
      const cell = makeShiftCell("North 2200-0600", "2026_03_10", "SMITH");
      const shift = scraper.parseShiftCell(cell);
      expect(shift.overnight).toBe(true);
      // end epoch should be the next day
      expect(shift.endTime).toBeGreaterThan(shift.startTime);
    });

    // --- edge cases for 2400 ---

    test("handles 2400 end time without throwing", () => {
      const cell = makeShiftCell("North 0800-2400", "2026_03_10", "SMITH");
      expect(() => scraper.parseShiftCell(cell)).not.toThrow();
    });

    // --- provider renaming ---

    test("renames SAINTGEORGES assignee to MSG", () => {
      const cell = makeShiftCell("North 0800-1600", "2026_03_10", "SAINTGEORGES");
      const shift = scraper.parseShiftCell(cell);
      expect(shift.providerName).toBe("MSG");
    });

    test("renames NISHIOKA assignee to NISH", () => {
      const cell = makeShiftCell("North 0800-1600", "2026_03_10", "NISHIOKA");
      const shift = scraper.parseShiftCell(cell);
      expect(shift.providerName).toBe("NISH");
    });

    test("renames MIRCHANDANI assignee to D$", () => {
      const cell = makeShiftCell("North 0800-1600", "2026_03_10", "MIRCHANDANI");
      const shift = scraper.parseShiftCell(cell);
      expect(shift.providerName).toBe("D$");
    });

    // --- USER task type ---

    test("when taskId is USER, providerName is empty and providerType is USER", () => {
      const userScraper = new Scraper(TASKS.USER);
      const cell = makeShiftCell("1700-0100 (RED)", "2026_03_10", "SMITH");
      const shift = userScraper.parseShiftCell(cell);
      expect(shift).toBeInstanceOf(Shift);
      expect(shift.providerName).toBe("");
      expect(shift.providerType).toBe(TASKS.USER.id);
    });

    // --- result from loaded HTML fixture ---

    test("parses first .shift-cell in loaded HTML fixture", () => {
      const cell = document.querySelector(".shift-cell");
      expect(cell).not.toBeNull(); // guard: fixture must contain shift cells
      const shift = scraper.parseShiftCell(cell);
      expect(shift).toBeInstanceOf(Shift);
      expect(shift.startTime).toBeDefined();
      expect(shift.endTime).toBeDefined();
      expect(typeof shift.location).toBe("string");
    });
  });

  // -------------------------------------------------------------------------
  // getAllShifts
  // -------------------------------------------------------------------------

  describe("getAllShifts", () => {
    test("returns an array", () => {
      expect(Array.isArray(scraper.getAllShifts())).toBe(true);
    });

    test("every element is a Shift instance", () => {
      const shifts = scraper.getAllShifts();
      expect(shifts.length).toBeGreaterThan(0);
      shifts.forEach((s) => expect(s).toBeInstanceOf(Shift));
    });

    test("USER task uses different DOM selector but still returns Shift instances", () => {
      const userScraper = new Scraper(TASKS.USER);
      const shifts = userScraper.getAllShifts();
      expect(Array.isArray(shifts)).toBe(true);
      // If the fixture has user-layout cells they'll be parsed; otherwise empty is fine
      shifts.forEach((s) => expect(s).toBeInstanceOf(Shift));
    });
  });

  // -------------------------------------------------------------------------
  // getOverlap
  // -------------------------------------------------------------------------

  describe("getOverlap", () => {
    test("returns correct overlap when ranges partially overlap", () => {
      const a = new Shift(10, 20, "X", false, TASKS.DOCTOR.id, "A");
      const b = new Shift(15, 25, "X", false, TASKS.USER.id, "B");
      expect(scraper.getOverlap(a, b)).toBe(5);
    });

    test("returns 0 when ranges do not overlap", () => {
      const a = new Shift(0, 10, "X", false, TASKS.DOCTOR.id, "A");
      const b = new Shift(20, 30, "X", false, TASKS.USER.id, "B");
      expect(scraper.getOverlap(a, b)).toBe(0);
    });

    test("returns 0 when ranges are adjacent (touching but not overlapping)", () => {
      const a = new Shift(0, 10, "X", false, TASKS.DOCTOR.id, "A");
      const b = new Shift(10, 20, "X", false, TASKS.USER.id, "B");
      expect(scraper.getOverlap(a, b)).toBe(0);
    });

    test("returns full length when one range fully contains the other", () => {
      const outer = new Shift(0, 100, "X", false, TASKS.DOCTOR.id, "A");
      const inner = new Shift(20, 80, "X", false, TASKS.USER.id, "B");
      expect(scraper.getOverlap(outer, inner)).toBe(60);
    });

    test("returns full length when ranges are identical", () => {
      const a = new Shift(10, 20, "X", false, TASKS.DOCTOR.id, "A");
      const b = new Shift(10, 20, "X", false, TASKS.USER.id, "B");
      expect(scraper.getOverlap(a, b)).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // checkCalendarExistence
  // -------------------------------------------------------------------------

  describe("checkCalendarExistence", () => {
    test("returns true when the expected calendar element is present", () => {
      expect(scraper.checkCalendarExistence()).toBe(true);
    });

    test("returns false when the calendar element is absent", () => {
      // Temporarily remove the calendar element
      const calendar = document.querySelector(".flex-1.p-4.overflow-scroll #calendar");
      const parent = calendar?.parentElement;
      if (calendar && parent) {
        parent.removeChild(calendar);
        expect(scraper.checkCalendarExistence()).toBe(false);
        parent.appendChild(calendar); // restore for subsequent tests
      } else {
        // If the fixture uses a different structure, skip gracefully
        console.warn("checkCalendarExistence false-path: fixture calendar not found for removal");
      }
    });
  });
});