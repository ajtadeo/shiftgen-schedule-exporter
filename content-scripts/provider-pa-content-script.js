const SUCCESS = 0;

async function main() {
  const localStorage = await chrome.storage.local.get(["workdays"]);
  if (Object.entries(localStorage["workdays"]).length === 0) {
    console.warn("User workdays have not been set. Stopping.")
    return;
  }

  const [workdays, updatedLocalStorage] = scrapeProvider(localStorage, PROVIDER_ENUM.PA);

  await chrome.storage.local.set({
    "workdays": updatedLocalStorage["workdays"],
    "pa_workdays_set": true
  });

  console.log(`Updated local storage with PA page data for ${workdays.length} workdays`)
  console.log(updatedLocalStorage)
  return SUCCESS
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeProviderPa") {
    (
      async () => {
        let status = await main();
        sendResponse({ status: SUCCESS });
      }
    )();
  }
  return true; // signals async response
});