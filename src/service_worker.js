/**
 * @file service_worker.js
 * @brief Extension service worker.
 */

/**
 * @brief Listener that initializes local storage variables on extension install and update.
 */
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install" || details.reason == "update") {
    // set local storage variables
    chrome.storage.local.set({
      shifts: {},
      user_shifts_set: false,
      doctor_shifts_set: false,
      pa_shifts_set: false,
      calendar_id: "",
      scraping_status: 0, // SCRAPING_STATUS_ENUM.INACTIVE
      redirect_to_print_page: false,
      target_month: ""
    })
  }
})

/**
 * @brief Listener that closes the current tab on "closeCurrentTab" message
 */
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // TODO: if  user and pa messages come in at the same time, then the request gets overwritten
  // and the user tab will not close. maybe the problem is somewhere else?
  if (request.action === "closeCurrentTab") {
    await chrome.tabs.remove(sender.tab.id);
  }
})