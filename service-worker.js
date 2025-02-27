chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install" || details.reason == "update") {
    // set local storage variables
    chrome.storage.local.set({
      workdays: {},
      user_workdays_set: false,
      doctor_workdays_set: false,
      pa_workdays_set: false,
      calendar_id: "",
      name: ""
    })

    // open settings page on install
    chrome.tabs.create({
      url: "settings/settings.html"
    })
  }
})