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

  // set up google calendar export button
  document.querySelector("#google-calendar-export-button").addEventListener('click', async () => {
    let localStorage = await chrome.storage.local.get(["workdays", "calendar_id"]);
    if (localStorage.calendar_id === "") {
      document.querySelector("#message").textContent = "Need to set Calendar ID before exporting to Google Calendar."
      return;
    }
    
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      let workdays = localStorage.workdays;
      let calendarId = localStorage.calendar_id;
      let postedAllEvents = true;
      for (const [key, value] of Object.entries(workdays)) {
        let result = exportToGoogleCalendar(token, calendarId, value);
        if (result === false) {
          postedAllEvents = false;
          break;
        }
      }

      if (!postedAllEvents) {
        document.querySelector("#message").textContent = "Failed to export shifts to Google Calendar. Please try again."
      } else {
        document.querySelector("#message").textContent = "Successfully exported shifts to Google Calendar!"
      }

      // SANITY CHECK
      // for (const [key, value] of Object.entries(TEST_WORKDAYS)) {
      //   exportToGoogleCalendar(token, value)
      // }
    })
  });

  // set up open shiftgen link
  document.querySelector("#open-shiftgen-link").addEventListener('click', () => {
    chrome.tabs.create({ 
      active: true,
      url: "https://www.shiftgen.com/"
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

  if (user_workdays_set & pa_workdays_set & doctor_workdays_set) {
    document.querySelector("#google-calendar-export-button").disabled = false;
  }
});

/**
 * Sends a POST request to create a new event for workday in Google Calendar
 * @param {string} token 
 * @param {string} calendarId
 * @param {object} workday 
 * 
 * Sample workday object:
 * {
 *   "endDateTime": "2025-03-09T23:30:00.000-08:00",
 *   "location": "PA",
 *   "overnight": true,
 *   "providerName": "FIX ME",
 *   "providerType": -1,
 *   "startDateTime": "2025-03-09T15:00:00.000-08:00"
 * }
 */
function exportToGoogleCalendar(token, calendarId, workday) {
  console.log(workday)
  let event = {
    summary: `CHOC Scribe: ${workday.location} ${workday.providerName}`,
    description: 'Generated using ShiftGen Calendar!',
    start: {
      'dateTime': workday.startDateTime,
      'timeZone': 'America/Los_Angeles'
    },
    end: {
      'dateTime': workday.endDateTime,
      'timeZone': 'America/Los_Angeles'
    }
  };

  let options = {
    method: 'POST',
    async: true,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  };

  fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    options
  )
  .then(response => {
    return response.json();
  }).then(data => {
    // console.log(data)
    return true;
  }).catch(err => {
    console.error(err)
    return false;
  })
}