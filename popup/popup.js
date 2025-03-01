window.onload = async function () {
  let localStorage = await chrome.storage.local.get(["shifts", "calendar_id", "target_month"]);

  // set up google calendar export button
  document.querySelector("#google-calendar-export-button").addEventListener('click', async () => {
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
        alert("Failed to export shifts to Google Calendar. Please try again.")
      } else {
        alert("Successfully exported shifts to Google Calendar!")
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
  
  // populate shifts table
  let shifts = localStorage.shifts;
  const tbody = document.querySelector("#shift-tbody");
  const template = document.querySelector("#shift-template");
  for (const [key, value] of Object.entries(shifts)) {
    const clone = template.content.cloneNode(true);
    clone.querySelector(".shift-start").textContent = new Date(value.startDateTime).toLocaleString();
    clone.querySelector(".shift-end").textContent = new Date(value.endDateTime).toLocaleString();
    clone.querySelector(".shift-location").textContent = value.location;
    clone.querySelector(".shift-provider-name").textContent = value.providerName;

    let providerType;
    if (value.providerType === PROVIDER_ENUM.DOCTOR) {
      providerType = "Doctor"
    } else if (value.providerType === PROVIDER_ENUM.PA) {
      providerType = "PA"
    } else if (value.providerType === PROVIDER_ENUM.UNKNOWN) {
      providerType = "Unknown"
    } else {
      providerType = "Invalid Type"
    }
    clone.querySelector(".shift-provider-type").textContent = providerType;
    clone.querySelector(".shift-overnight").textContent = value.overnight;
    tbody.appendChild(clone);
  }

  // handle calendar id form submission
  if (localStorage.calendar_id !== "") {
    document.querySelector("#calendar-id-input").value = localStorage.calendar_id;
  }
  document.querySelector("#calendar-id-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const calendarId = document.getElementById("calendar-id-input").value;
  
    await chrome.storage.local.set({ "calendar_id": calendarId }, function() {
      if (chrome.runtime.lastError) {
        document.querySelector("#calendar-id-message").textContent = "Error: " + chrome.runtime.lastError;
        console.error("Error saving to storage:", chrome.runtime.lastError);
      } else {
        document.querySelector("#calendar-id-button").disabled = true;
        // document.querySelector("#calendar-id-input").disabled = true;
        document.querySelector("#calendar-id-message").style.visibility = "visible"
        console.log("Calendar ID saved:", calendarId);
      }
    });
  }); 
  
  // handle target month form submission
  if (localStorage.target_month !== "") {
    document.querySelector("#target-month-input").value = localStorage.target_month;
  }
  document.querySelector("#target-month-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const targetMonth = document.getElementById("target-month-input").value.toLowerCase();
  
    await chrome.storage.local.set({ "target_month": targetMonth }, function() {
      if (chrome.runtime.lastError) {
        document.querySelector("#target-month-message").textContent = "Error: " + chrome.runtime.lastError;
        console.error("Error saving to storage:", chrome.runtime.lastError);
      } else {
        document.querySelector("#target-month-button").disabled = true;
        document.querySelector("#target-month-message").style.visibility = "visible"
        console.log("Target Month saved:", targetMonth);
      }
    });
  }); 

  // setup clear shifts button
  document.querySelector("#clear-shifts").addEventListener("click", async () => {
    await chrome.storage.local.set({
      shifts: {},
      user_shifts_set: false,
      doctor_shifts_set: false,
      pa_shifts_set: false
    });

    alert("Cleared shifts! Please refresh popup.")
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