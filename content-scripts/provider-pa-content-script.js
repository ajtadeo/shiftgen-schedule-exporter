async function main() {
  console.log("im a PA page");

  const localStorage = await chrome.storage.local.get(["workdays"]);
  if (Object.entries(localStorage["workdays"]).length === 0) {
    console.warn("User workdays have not been set. Stopping.")
    return;
  }

  const [workdays, updatedLocalStorage] = scrapeProvider(localStorage, PROVIDER_ENUM.PA);
  // if (workdays !== undefined) {
  //   console.log(`======== ${workdays.length} PA ========`);
  //   for (const wd of workdays) {
  //     wd.print();
  //   }
  // }

  console.log(updatedLocalStorage)

  await chrome.storage.local.set({
    "workdays": updatedLocalStorage["workdays"]
  }).then(() => {
    console.log(`Updated local storage with PA page data for ${workdays.length} workdays`)
  })
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "scrape") {
    main();
    sendResponse({ status: "success", message: "Done." });
  }
});