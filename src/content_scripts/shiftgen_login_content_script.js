/**
 * @file shiftgen_login_content_script.js
 * @brief Content script for https://shiftgen.com/login web page.
 */

/**
 * @brief When scraping status isn't inactive, resets scraping local variables.
 */
window.onload = async function () {
  const localStorage = await chrome.storage.local.get(["scraping_status"]);
  const scrapingStatus = localStorage.scraping_status;

  if (scrapingStatus !== SCRAPING_STATUS_ENUM.INACTIVE) {
    // reset local variables
    await chrome.storage.local.set({
      scraping_status: SCRAPING_STATUS_ENUM.INACTIVE,
      redirect_to_print_page: false,
    });
    alert("Please login before scraping shifts.")
  }
}