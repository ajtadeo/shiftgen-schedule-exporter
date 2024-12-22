chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install" || details.reason == "update") {
    // set localstorage variables
    chrome.storage.local.set({
      workdays: {}
    }).then(() => {
      console.log("Initialized workdays in local storage to {}, auth to false");
    });

    // open settings page
    chrome.tabs.create({
      url: "tabs/settings.html"
    })
  }
})

const SHIFTGEN_ORIGIN = 'https://www.shiftgen.com';

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  // Enables the side panel on shiftgen.com
  if (url.origin === SHIFTGEN_ORIGIN) {
    console.log("opening side panel")
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel/index.html',
      enabled: true
    });
  } else {
    // Disables the side panel on all other sites
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    })
  }
});

// chrome.sidePanel
//   .setPanelBehavior({ openPanelOnActionClick: true })
//   .catch((error) => console.error(error));