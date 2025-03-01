let error_msg = ""

async function main() {
  // scrape page
  shifts = scrapeUser();

  // update local storage with new shift info. startDateTime is the unique key
  let localStorage = await chrome.storage.local.get(["shifts"])
  for (const wd of shifts) {
    const wd_json = wd.get_json();
    localStorage["shifts"][wd_json.startDateTime] = wd_json;
  }

  await chrome.storage.local.set({
    "shifts": localStorage["shifts"],
    "user_shifts_set": true
  });

  return SUCCESS;
}

window.onload = async function () {
  let localStorage = await chrome.storage.local.get(["scraping_status"]);
  if (localStorage.scraping_status === SCRAPING_STATUS_ENUM.USER) {
    let status = await main();
    await new Promise(r => setTimeout(r, 5)); // wait for storage to set correctly

    if (status === SUCCESS) {
      chrome.runtime.sendMessage({action: "closeCurrentTab"});
    } else {
      alert(error_msg)
    }
  }
}