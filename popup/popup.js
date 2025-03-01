window.onload = async function () {
  // set up google calendar export button
  document.querySelector("#google-calendar-export-button").addEventListener('click', async () => {
    let localStorage = await chrome.storage.local.get(["shifts", "calendar_id"]);
    if (localStorage.calendar_id === "") {
      document.querySelector("#message").textContent = "Need to set Calendar ID before exporting to Google Calendar."
      return;
    }
    
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      let shifts = localStorage.shifts;
      let calendarId = localStorage.calendar_id;
      let postedAllEvents = true;
      for (const [key, value] of Object.entries(shifts)) {
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
      // for (const [key, value] of Object.entries(TEST_SHIFTS)) {
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

  // setup automatic website scraper for all shifts
  document.querySelector("#scrape-button").addEventListener("click", async () => {
    await chrome.storage.local.set({
      scraping_status: SCRAPING_STATUS_ENUM.STARTING,
    });

    // initiate automatic scraping
    await chrome.tabs.create({ active: false, url: "https://www.shiftgen.com/member/multi_site_schedule" });
  })
};

// enable/disable scrape buttons based on status flags
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  // fetch local storage variables 
  let localStorage = await chrome.storage.local.get(["user_shifts_set", "doctor_shifts_set", "pa_shifts_set"]);
  let user_shifts_set = localStorage.user_shifts_set
  let doctor_shifts_set = localStorage.doctor_shifts_set
  let pa_shifts_set = localStorage.pa_shifts_set

  if (user_shifts_set & pa_shifts_set & doctor_shifts_set) {
    document.querySelector("#google-calendar-export-button").disabled = false;
  }
});

/**
 * Sends a POST request to create a new event for shift in Google Calendar
 * @param {string} token 
 * @param {string} calendarId
 * @param {object} shift 
 * 
 * Sample shift object:
 * {
 *   "endDateTime": "2025-03-09T23:30:00.000-08:00",
 *   "location": "PA",
 *   "overnight": true,
 *   "providerName": "FIX ME",
 *   "providerType": -1,
 *   "startDateTime": "2025-03-09T15:00:00.000-08:00"
 * }
 */
function exportToGoogleCalendar(token, calendarId, shift) {
  console.log(shift)
  let event = {
    summary: `CHOC Scribe: ${shift.location} ${shift.providerName}`,
    description: 'Generated using ShiftGen Calendar!',
    start: {
      'dateTime': shift.startDateTime,
      'timeZone': 'America/Los_Angeles'
    },
    end: {
      'dateTime': shift.endDateTime,
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