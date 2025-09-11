/**
 * @file DoctorScraper.js
 * @brief Class for scraping Doctor shift data
 */

import { Scraper } from "./Scraper.js";
import { TASKS, PROVIDER_ENUM } from "./common.js";

export class DoctorScraper extends Scraper {
  /**
   * @brief DoctorScraper constructor
   */
  constructor() {
    super(TASKS.DOCTOR)
    console.log("Created Doctor scraper")
  }

  /**
   * @brief Scrapes the Doctor schedule web page.
   */
  async scrape() {
    // Get user shifts from chrome local storage
    let localStorage = await chrome.storage.local.get(["shifts"])
    const userShifts = Object.values(localStorage["shifts"])
    if (userShifts.length === 0) {
      throw new Error("User shifts have not been set");
    }

    // Scrape all overlapping shifts from provider page
    const shifts = this.getAllShifts();
    for (const userShift of userShifts) {

      // don't find overlaps for shifts that have already been claimed
      if (userShift.providerName !== "") {
        continue;
      }

      let maxOverlap = 0;
      let maxOverlapShift = undefined;

      for (const shift of shifts) {
        // doctor shifts occur in the same location as the user
        if (userShift.location === shift.location) {
          let overlap = this.getOverlap(userShift, shift)
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            maxOverlapShift = shift;
          }
        }
      }

      if (maxOverlapShift !== undefined) {
        localStorage["shifts"][userShift.startTime]["providerName"] = maxOverlapShift.providerName;
        localStorage["shifts"][userShift.startTime]["providerType"] = PROVIDER_ENUM.DOCTOR;
      }
    }

    // Update chrome local storage
    await chrome.storage.local.set({
      "shifts": localStorage["shifts"],
    });

    return {
      timestamp: Date.now(),
      success: true
    }
  }
}