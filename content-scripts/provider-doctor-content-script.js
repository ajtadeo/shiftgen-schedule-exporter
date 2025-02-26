const SUCCESS = 0;
const ERROR_USER_WORKDAYS_NOT_SET = 1;
const ERROR_INVALID_STATUS = 2;

async function main() {
  const localStorage = await chrome.storage.local.get(["workdays"]);
  if (Object.entries(localStorage["workdays"]).length === 0) {
    console.warn("User workdays have not been set. Stopping.")
    return ERROR_USER_WORKDAYS_NOT_SET;
  }

  const [workdays, updatedLocalStorage] = scrapeProvider(localStorage, PROVIDER_ENUM.DOCTOR);

  await chrome.storage.local.set({
    "workdays": updatedLocalStorage["workdays"]
  });

  console.log(`Updated local storage with doctor page data for ${workdays.length} workdays`)
  console.log(updatedLocalStorage)
  return SUCCESS;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeProviderDoctor") {
    (
      async () => {
        let status = await main();
        if (status === SUCCESS) {
          console.log("success")
          sendResponse({ status: SUCCESS});
        } else if (status === ERROR_USER_WORKDAYS_NOT_SET) {
          console.log("sending error msg")
          sendResponse({ status: ERROR_USER_WORKDAYS_NOT_SET, message: "User workdays have not been set." });
        } else {
          sendResponse({ status: ERROR_INVALID_STATUS, message: "Got an invalid status." });
        }
      }
    )();
  }
  return true; // signals async response
});

console.log("Running doctor content script...")