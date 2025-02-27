async function main() {
  // scrape page
  workdays = scrapeUser();

  // update local storage with new workday info. startDateTime is the unique key
  let localStorage = await chrome.storage.local.get(["workdays"])
  for (const wd of workdays) {
    const wd_json = wd.get_json();
    localStorage["workdays"][wd_json.startDateTime] = wd_json;
  }

  await chrome.storage.local.set({
    "workdays": localStorage["workdays"],
    "user_workdays_set": true
  });

  console.log("Updated local storage with user page data. Reset provider name and type values.")
  console.log(localStorage)
  return SUCCESS;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeUser") {
    (
      async () => {
        let status = await main();
        sendResponse({ status: SUCCESS });
      }
    )();
  }
  return true; // signals async response
});

console.log("User content script running...")