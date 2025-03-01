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
      target_month: "march"
    })

    // open settings page on install
    chrome.tabs.create({
      url: "settings/settings.html"
    })
  }
})

// TODO: if  user and pa messages come in at the same time, then the request gets overwritten
// and the user tab will not close. maybe the problem is somewhere else?
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "closeCurrentTab") {
    await chrome.tabs.remove(sender.tab.id);
  }
})