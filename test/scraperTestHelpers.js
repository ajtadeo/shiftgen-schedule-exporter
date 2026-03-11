/**
 * @file scraperTestHelpers.js
 * @brief Shared helpers for DoctorScraper, PaScraper, and UserScraper tests
 * 
 * HTML fixture summary (from real calendar pages):
 *   doctor_calendar_1.html  - 264 cells, 128 parseable (CHOC + SJH + named locations)
 *   doctor_calendar_2.html  - 264 cells, 128 parseable (identical structure)
 *   pa_calendar.html        - 233 cells, 129 parseable (CHOC / SJH / named shifts)
 *   user_calendar.html      -  26 cells,  26 parseable (all pattern 1 & 3, assignee "Empty")
 */

import fs from "fs";
import path from "path";
import { TASKS } from "../src/shiftgen/common.js";

export const HTML_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "html"
);

export function loadHtml(filename) {
  return fs.readFileSync(path.join(HTML_DIR, filename), "utf8");
}

/**
 * @brief Build a minimal shift JSON entry as stored in chrome.storage.local["shifts"].
 * providerName defaults to "" (unclaimed) — the normal state before scraping.
 */
export function makeStoredShift(
  startTime,
  endTime,
  location,
  providerName = "",
  providerType = TASKS.USER.id
) {
  return { startTime, endTime, location, overnight: false, providerType, providerName };
}