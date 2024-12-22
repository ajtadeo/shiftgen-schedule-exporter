async function main() {
  console.log("im a user page")

  // scrape page
  workdays = scrapeUser();
  // console.log(`======== ${workdays.length} USER ========`);
  // for (const wd of workdays) {
  //   wd.print();
  // }

  // update local storage with new workday info. startDateTime is the unique key
  let localStorage = await chrome.storage.local.get(["workdays"])
  for (const wd of workdays) {
    const wd_json = wd.get_json();
    localStorage["workdays"][wd_json.startDateTime] = wd_json;
  }
  console.log(localStorage)

  await chrome.storage.local.set({
    "workdays": localStorage["workdays"]
  }).then(() => {
    console.log("Updated local storage with user page data. Reset provider name and type values.")
  })
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "scrape") {
    main();
    sendResponse({ status: "success", message: "Done." });
  }
});

console.log(chrome.runtime.getURL(""));
