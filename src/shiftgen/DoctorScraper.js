/**
 * @file DoctorScraper.js
 * @brief Class for scraping Doctor shift data
 */

import { Scraper } from "./Scraper.js";
import { TASKS } from "./common.js";

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
      let maxOverlapDoctorShift = undefined;
      let maxOverlapAtBat = 0;
      let maxOverlapAtBatShift = undefined;

      for (const shift of shifts) {
        if (userShift.location === shift.location) {
          // doctor shifts occur in the same location as the user
          let overlap = this.getOverlap(userShift, shift)
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            maxOverlapDoctorShift = shift;
          }
        } else if (userShift.location === "PA") {
          // on deck doctor occurs in the PA location
          let overlap = this.getOverlap(userShift, shift)
          if (overlap > maxOverlapAtBat) {
            maxOverlapAtBat = overlap;
            maxOverlapAtBatShift = shift;
          }
        }
      }

      if (maxOverlapDoctorShift !== undefined) {
        localStorage["shifts"][userShift.startTime]["providerName"] = maxOverlapDoctorShift.providerName;
        localStorage["shifts"][userShift.startTime]["providerType"] = TASKS.DOCTOR.id;
        localStorage["shifts"][userShift.startTime]["doctorOnDeck"] = maxOverlapDoctorShift.doctorOnDeck;
      }

      if (maxOverlapAtBatShift !== undefined) {
        localStorage["shifts"][userShift.startTime]["doctorAtBat"] = maxOverlapAtBatShift.providerName;
        localStorage["shifts"][userShift.startTime]["doctorOnDeck"] = maxOverlapAtBatShift.doctorOnDeck;
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