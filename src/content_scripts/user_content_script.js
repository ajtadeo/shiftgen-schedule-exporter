/**
 * @file user_content_script.js
 * @brief Content script for user schedule web page.
 */

let errorMsg = ""

/**
 * @brief Scrapes all shifts in the user's schedule.
 * 
 * @returns True if shifts were scraped and set correctly, false otherwise.
 */
async function main() {
  // scrape page
  let shifts = scrapeUser();

  // update local storage with new shift info. startTime is the unique key
  let localStorage = await chrome.storage.local.get(["shifts"])
  for (const shift of shifts) {
    const shiftJSON = shift.getJSON();
    localStorage["shifts"][shiftJSON.startTime] = shiftJSON;
  }

  await chrome.storage.local.set({
    "shifts": localStorage["shifts"],
    "user_shifts_set": true
  });

  return true;
}

window.onload = async function () {
  const localStorage = await chrome.storage.local.get(["scraping_status"]);
  if (localStorage.scraping_status === SCRAPING_STATUS_ENUM.USER) {
    let status = await main();
    await new Promise(r => setTimeout(r, 5)); // wait for storage to set correctly

    if (status === true) {
      chrome.runtime.sendMessage({action: "closeCurrentTab"});
    } else {
      alert(errorMsg)
    }
  }
}