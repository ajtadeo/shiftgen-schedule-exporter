/**
 * @file popup.js
 * @brief JavaScript for extension popup.
 */

import { TASKS } from "../shiftgen/common.js";

window.onload = async function () {
  // set up google calendar export button
  document.querySelector("#google-calendar-export-button").addEventListener('click', async () => {
    let localStorage = await chrome.storage.local.get(["shifts", "calendar_id"]);

    if (localStorage.calendar_id === "") {
      alert("Please set Calendar ID before exporting to Google Calendar.")
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

  // setup automatic website scraper for all shifts
  document.querySelector("#scrape-button").addEventListener("click", async () => {
    let localStorage = await chrome.storage.local.get(["target_month", "target_year"]);

    if (localStorage.target_month === "") {
      alert("Please set target month before scraping shifts.")
      return;
    }

    if (localStorage.target_year === "") {
      alert("Please set target year before scraping shifts.")
      return;
    } 

    // Start task workflow
    chrome.runtime.sendMessage({ type: 'START' });
  })
  
  // populate shifts table
  let localStorage = await chrome.storage.local.get(["shifts", "calendar_id", "target_month", "target_year"]);
  let shifts = localStorage.shifts;
  const tbody = document.querySelector("#shift-tbody");
  const template = document.querySelector("#shift-template");
  for (const [key, value] of Object.entries(shifts)) {
    const clone = template.content.cloneNode(true);
    clone.querySelector(".shift-start").textContent = new Date(value.startTime).toLocaleString("en-US", { dateStyle: 'short', timeStyle: 'short', hour12: false });
    clone.querySelector(".shift-end").textContent = new Date(value.endTime).toLocaleString("en-US", { dateStyle: 'short', timeStyle: 'short', hour12: false });
    clone.querySelector(".shift-location").textContent = value.location;
    clone.querySelector(".shift-provider-name").textContent = value.providerName;

    let providerType;
    if (value.providerType === TASKS.DOCTOR.id) {
      providerType = "Doctor"
    } else if (value.providerType === TASKS.PA.id) {
      providerType = "PA"
    } else if (value.providerType === TASKS.USER.id) {
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
    document.querySelector("#target-month-select").value = localStorage.target_month;
  }

  document.querySelector("#target-month-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const targetMonth = document.getElementById("target-month-select").value;
  
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

  // handle target year form submission
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  let currentYearElement = document.createElement("option")
  currentYearElement.value = currentYear.toString();
  currentYearElement.textContent = currentYear.toString();
  document.querySelector("#target-year-select").appendChild(currentYearElement);
  let nextYearElement = document.createElement("option")
  nextYearElement.value = nextYear.toString();
  nextYearElement.textContent = nextYear.toString();
  document.querySelector("#target-year-select").appendChild(nextYearElement);

  if (localStorage.target_year !== "") {
    document.querySelector("#target-year-select").value = localStorage.target_year;
  }

  document.querySelector("#target-year-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const targetYear = document.getElementById("target-year-select").value;
  
    await chrome.storage.local.set({ "target_year": targetYear }, function() {
      if (chrome.runtime.lastError) {
        document.querySelector("#target-year-message").textContent = "Error: " + chrome.runtime.lastError;
        console.error("Error saving to storage:", chrome.runtime.lastError);
      } else {
        document.querySelector("#target-year-button").disabled = true;
        document.querySelector("#target-year-message").style.visibility = "visible"
        console.log("Target Year saved:", targetYear);
      }
    });
  }); 

  // setup clear shifts button
  document.querySelector("#clear-shifts").addEventListener("click", async () => {
    await chrome.storage.local.set({
      shifts: {}
    });

    const tbody = document.querySelector("#shift-tbody");
    const dataRows = tbody.querySelectorAll('tr:has(td)');
    for (let i = 0; i < dataRows.length; i++) {
      tbody.removeChild(dataRows[i]);
    }

    let noShiftsMessage = document.querySelector("#no-shifts-message")
    noShiftsMessage.style.display = "block";
  })

  // handle no shifts to display
  let table = document.querySelector("#shifts-table");
  let numRows = table.tBodies[0].rows.length;
  if (numRows !== 0) {
    let noShiftsMessage = document.querySelector("#no-shifts-message")
    noShiftsMessage.style.display = "none";
  }
};

// enable/disable scrape buttons based on status flags
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  // fetch local storage variables 
  let localStorage = await chrome.storage.local.get(["calendar_id"]);
  let calendarId = localStorage.calendar_id;

  if (calendarId !== "") {
    document.querySelector("#google-calendar-export-button").disabled = false;
  }
});

/**
 * Sends a POST request to create a new event for shift in Google Calendar
 * @param {string} token 
 * @param {string} calendarId
 * @param {object} shift 
 */
function exportToGoogleCalendar(token, calendarId, shift) {
  let event = {
    summary: `CHOC Scribe: ${shift.location} ${shift.providerName}`,
    description: 'Generated using Schedule Exporter for ShiftGen!',
    start: {
      'dateTime': new Date(shift.startTime).toISOString(),
      'timeZone': 'America/Los_Angeles'
    },
    end: {
      'dateTime': new Date(shift.endTime).toISOString(),
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
  });
}