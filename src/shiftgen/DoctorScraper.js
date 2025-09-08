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
    console.log("Scraped Doctor page")
    return {
      timestamp: Date.now(),
      data: "Hello World"
    }
  }
}