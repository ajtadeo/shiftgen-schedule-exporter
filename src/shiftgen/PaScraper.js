/**
 * @file PaScraper.js
 * @brief Class for scraping PA shift data
 */

import { Scraper } from "./Scraper.js";
import { TASKS } from "./common.js";

export class PaScraper extends Scraper {
  /**
   * @brief UserScraper constructor
   */
  constructor() {
    super(TASKS.PA)
    console.log("Created PA scraper")
  }

  /**
   * @brief Scrapes the PA schedule web page.
   */
  async scrape() {
    console.log("Scraped PA page")
    return {
      timestamp: Date.now(),
      data: "Hello World"
    }
  }
}