const SUCCESS = 0;

window.onload = async function () {
  // set up scrape user schedule button 
  document.querySelector('#scrape-user-button').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "scrapeUser" }, (response) => {
        let logElem = document.querySelector("#message");
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          logElem.textContent = chrome.runtime.lastError.message;
          return;
        } else if (response.status === SUCCESS) {
          logElem.textContent = "Updated user schedule!"
        } else {
          let err_msg = "Error " + response.status + ": " + response.message
          console.error(err_msg);
          logElem.textContent = err_msg;
        }
      });
    });
  });

  // set up scrape doctors button 
  document.querySelector('#scrape-doctor-button').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "scrapeProviderDoctor" }, (response) => {
        let logElem = document.querySelector("#message");
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          logElem.textContent = chrome.runtime.lastError.message;
        } else if (response.status === SUCCESS) {
          logElem.textContent = "Done scraping doctor schedules!"
        } else {
          let err_msg = "Error " + response.status + ": " + response.message
          console.error(err_msg);
          logElem.textContent = err_msg;
        }
      });
    });
  });

  // set up scrape pa button 
  document.querySelector('#scrape-pa-button').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "scrapeProviderPa" }, (response) => {
        let logElem = document.querySelector("#message");
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          logElem.textContent = chrome.runtime.lastError.message;
        } else if (response.status === SUCCESS) {
          logElem.textContent = "Done scraping PA schedules!"
        } else {
          let err_msg = "Error " + response.status + ": " + response.message
          console.error(err_msg);
          logElem.textContent = err_msg;
        }
      });
    });
  });
};

// enable/disable scrape buttons based on status flags
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const currentURL = tabs[0].url;

  // fetch local storage variables 
  let localStorage = await chrome.storage.local.get(["user_workdays_set", "doctor_workdays_set", "pa_workdays_set"]);
  let user_workdays_set = localStorage.user_workdays_set
  let doctor_workdays_set = localStorage.doctor_workdays_set
  let pa_workdays_set = localStorage.pa_workdays_set

  const userUrlPattern = new RegExp(".*shiftgen\.com\/member\/printable_schedule\/.*\?.*print_only_my_schedule=on.*")
  const paUrlPattern = new RegExp(".*shiftgen\.com\/member\/printable_schedule\/.*\?.*shift_group_id_array%5B%5D=211.*shift_group_id_array%5B%5D=212.*")
  const doctorUrlPattern = new RegExp(".*shiftgen\.com\/member\/printable_schedule\/.*\?.*shift_group_id_array%5B%5D=199.*shift_group_id_array%5B%5D=578.*")

  if (userUrlPattern.test(currentURL)) {
    document.querySelector('#scrape-user-button').disabled = false;
  } else if (paUrlPattern.test(currentURL)) {
    console.log("PA parsed")
    if (user_workdays_set) {
      document.querySelector('#scrape-pa-button').disabled = false;
    } else {
      document.querySelector("#message").textContent = "Need to scrape user schedule before PA and Doctor schedules!"
    }
  } else if (doctorUrlPattern.test(currentURL)) {
    console.log("doctor parsed")
    if (user_workdays_set) {
      document.querySelector('#scrape-doctor-button').disabled = false;
    } else {
      document.querySelector("#message").textContent = "Need to scrape user schedule before PA and Doctor schedules!"
    }
  }
});
