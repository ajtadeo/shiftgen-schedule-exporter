/**
 * @file shiftgen_content_script.js
 * @brief Content script for https://shiftgen.com web page.
 */

/**
 * @brief When scraping status isn't inactive, redirects to https://www.shiftgen.com/member/schedule.
 */
window.onload = async function () {
  const localStorage = await chrome.storage.local.get(["scraping_status"]);
  const scrapingStatus = localStorage.scraping_status;

  if (scrapingStatus !== SCRAPING_STATUS_ENUM.INACTIVE) {
    // redirect to member schedule
    window.location.href = "https://www.shiftgen.com/member/schedule";
  }
}