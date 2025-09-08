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
    console.log("Scraped user page")
    return {
      timestamp: Date.now(),
      data: "Hello World"
    }
  }
}