/**
 * @file UserScraper.js
 * @brief Class for scraping user shift data
 */

import { Scraper } from "./Scraper.js";
import { TASKS } from "./common.js";

export class UserScraper extends Scraper {
  /**
   * @brief UserScraper constructor
   */
  constructor() {
    super(TASKS.USER)
    console.log("Created user scraper")
  }

  /**
   * @brief Scrapes the user schedule web page.
   */
  async scrape() {
    // Check that shifts exist for the target month and year
    const calendar = document.querySelector("#calendar");

    if (calendar !== null) {
      // Scrape all shifts from user page
      const shifts = this.getAllShifts();

      // Update chrome local storage
      let localStorage = await chrome.storage.local.get(["shifts"])
      for (const shift of shifts) {
        const shiftJSON = shift.getJSON();
        localStorage["shifts"][shiftJSON.startTime] = shiftJSON;
      }

      await chrome.storage.local.set({
        "shifts": localStorage["shifts"],
      });
    } else {
      throw new Error("No user shifts available");
    }
  }
}