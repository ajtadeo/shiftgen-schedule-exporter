let error_msg = ""

async function main() {
  const localStorage = await chrome.storage.local.get(["shifts"]);
  if (Object.entries(localStorage["shifts"]).length === 0) {
    error_msg = "User shifts have not been set. Stopping."
    return FAILURE;
  }

  const updatedLocalStorage = scrapeDoctor(localStorage);

  await chrome.storage.local.set({
    "shifts": updatedLocalStorage["shifts"],
    "doctor_shifts_set": true
  });

  return SUCCESS;
}

window.onload = async function () {
  let localStorage = await chrome.storage.local.get(["scraping_status"]);
  if (localStorage.scraping_status === SCRAPING_STATUS_ENUM.DOCTOR) {
    let status = await main();
    await new Promise(r => setTimeout(r, 5)); // wait for storage to set correctly

    if (status === SUCCESS) {
      chrome.runtime.sendMessage({action: "closeCurrentTab"});
    } else {
      alert(error_msg)
    }
  }
}