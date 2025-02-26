chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install" || details.reason == "update") {
    // set local storage variables
    chrome.storage.local.set({
      workdays: {},
      user_workdays_set: false,
      doctor_workdays_set: false,
      pa_workdays_set: false
    })

    // // open settings page
    // chrome.tabs.create({
    //   url: "tabs/settings.html"
    // })
  }
})

// const SHIFTGEN_ORIGIN = 'https://www.shiftgen.com';

// chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
//   if (!tab.url) return;
//   const url = new URL(tab.url);
//   // Enables the side panel on shiftgen.com
//   if (url.origin === SHIFTGEN_ORIGIN) {
//     chrome.action.openPopup();
//   }
// });

// chrome.sidePanel
//   .setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error));