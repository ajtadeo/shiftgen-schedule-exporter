/**
 * @file popup.js
 * @brief JavaScript for extension popup.
 */

import { TASKS, MESSAGE_IDS, BADGE_IDS, errorBadge, clearBadge, MESSAGE_TYPE } from "../shiftgen/common.js";

// Window events
window.addEventListener("DOMContentLoaded", () => loadPopup());

// Browser events
browser.tabs.query({ active: true, currentWindow: true }, (tabs) => handleToggleButtons(tabs));
browser.storage.onChanged.addListener((changes, area) => handleDisplayMessages(changes, area));

/**
 * @brief Main initialization function on popup load.
 */
export async function loadPopup() {
  // handle incoming messages in local storage
  await clearBadge();
  await displayMessages();

  // set up google calendar export button
  document.querySelector("#google-calendar-export-button").addEventListener('click', async () => {
    let localStorage = await browser.storage.local.get(["shifts", "calendar_id"]);

    if (localStorage.calendar_id === "") {
      await errorBadge(BADGE_IDS.CALENDAR_ID_MISSING);
      addErrorMessage("Please set Calendar ID before exporting to Google Calendar.");
      return;
    }

    document.querySelector("#google-calendar-export-button").disabled = true;
    browser.runtime.sendMessage({ id: MESSAGE_IDS.EXPORT_GCAL });
  });

  // setup automatic website scraper for all shifts
  document.querySelector("#scrape-button").addEventListener("click", async () => {
    let localStorage = await browser.storage.local.get(["target_month", "target_year"]);

    if (localStorage.target_month === "") {
      await errorBadge(BADGE_IDS.TARGET_MONTH_MISSING);
      addErrorMessage("Please set target month before scraping shifts.");
      return;
    }

    if (localStorage.target_year === "") {
      await errorBadge(BADGE_IDS.TARGET_YEAR_MISSING);
      addErrorMessage("Please set target year before scraping shifts.");
      return;
    }

    // Start task workflow
    await wakeServiceWorker();
    browser.runtime.sendMessage({ id: MESSAGE_IDS.START });
  })

  let localStorage = await browser.storage.local.get(["shifts", "calendar_id", "target_month", "target_year"]);

  // populate shifts table
  populateShiftsTable(localStorage.shifts);

  // handle calendar id form submission
  if (localStorage.calendar_id !== "") {
    document.querySelector("#calendar-id-input").value = localStorage.calendar_id;
  }
  document.querySelector("#calendar-id-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const calendarId = document.getElementById("calendar-id-input").value;

    await browser.storage.local.set({ "calendar_id": calendarId }, function() {
      if (browser.runtime.lastError) {
        document.querySelector("#calendar-id-message").textContent = "Error: " + browser.runtime.lastError;
        console.error("Error saving to storage:", browser.runtime.lastError);
      } else {
        document.querySelector("#calendar-id-button").disabled = true;
        document.querySelector("#calendar-id-message").style.visibility = "visible"
        document.querySelector("#google-calendar-export-button").disabled = false;
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

    await browser.storage.local.set({ "target_month": targetMonth }, function() {
      if (browser.runtime.lastError) {
        document.querySelector("#target-month-message").textContent = "Error: " + browser.runtime.lastError;
        console.error("Error saving to storage:", browser.runtime.lastError);
      } else {
        document.querySelector("#target-month-button").disabled = true;
        document.querySelector("#target-month-message").style.visibility = "visible"
        console.log("Target Month saved:", targetMonth);
      }
    });
  });

  // handle target year form submission
  const currentYear = parseInt(new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", year: "numeric" }));
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

    await browser.storage.local.set({ "target_year": targetYear }, function() {
      if (browser.runtime.lastError) {
        document.querySelector("#target-year-message").textContent = "Error: " + browser.runtime.lastError;
        console.error("Error saving to storage:", browser.runtime.lastError);
      } else {
        document.querySelector("#target-year-button").disabled = true;
        document.querySelector("#target-year-message").style.visibility = "visible"
        console.log("Target Year saved:", targetYear);
      }
    });
  });

  // setup clear shifts button
  document.querySelector("#clear-shifts").addEventListener("click", async () => {
    await browser.storage.local.set({
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

  // handle error message close
  document.querySelector("#messages").addEventListener("click", (event) => {
    if (event.target.classList.contains('message-close-btn')) {
      event.target.closest('.message').remove();
    }
  });
};

/**
 * @brief Toggle popup buttons based on status flags.
 * @param {*} tabs
 */
async function handleToggleButtons(tabs) {
  // fetch local storage variables
  let localStorage = await browser.storage.local.get(["calendar_id"]);
  let calendarId = localStorage.calendar_id;

  if (calendarId !== "") {
    document.querySelector("#google-calendar-export-button").disabled = false;
  }
};

/**
 * @brief Display messages on local storage changes while popup is open.
 * @param {*} changes
 * @param {*} area
 */
async function handleDisplayMessages(changes, area) {
  if (!changes.messages) return;
  const newMessages = changes.messages.newValue || [];
  const oldMessages = changes.messages.oldValue || [];

  if (newMessages && newMessages.length > 0) {
    // Only show messages that were just added
    const added = newMessages.slice(oldMessages.length);
    for (const msg of added) {
      if (msg.type === MESSAGE_TYPE.INFO) addInfoMessage(msg.message);
      else if (msg.type === MESSAGE_TYPE.ERROR) addErrorMessage(msg.message);

      // Re-enable Google Calendar export button
      if (msg.id === BADGE_IDS.EXPORT_GCAL_FAILED || msg.id === BADGE_IDS.EXPORT_GCAL_DONE) {
        document.querySelector("#google-calendar-export-button").disabled = false;
      }

      // Display newly scraped shifts
      if (msg.id === BADGE_IDS.WORKFLOW_DONE) {
        let localStorage = await browser.storage.local.get(["shifts"]);
        populateShiftsTable(localStorage.shifts);
      }
    };

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    clearBadge();

    await browser.storage.local.set({ messages: [] });
  }
};

/**
 * @brief Adds an error message to the top of the popup UI.
 * @param {String} message Error message to display.
 */
function addErrorMessage(message) {
  const msgs = document.querySelector("#messages");
  const template = document.querySelector("#error-message-template");
  const clone = template.content.cloneNode(true);
  clone.querySelector(".error-message-text").textContent = message;
  msgs.prepend(clone);
}

/**
 * @brief Adds an info message to the top of the popup UI.
 * @param {String} message Info message to display.
 */
function addInfoMessage(message) {
  const msgs = document.querySelector("#messages");
  const template = document.querySelector("#info-message-template");
  const clone = template.content.cloneNode(true);
  clone.querySelector(".info-message-text").textContent = message;
  msgs.prepend(clone);
}

/**
 * @brief Displays messages currently in local storage and then clears storage.
 */
async function displayMessages() {
  const { messages } = await browser.storage.local.get(["messages"]);
  if (messages && messages.length > 0) {
    messages.forEach((message) => {
      if (message.type == MESSAGE_TYPE.INFO) {
        addInfoMessage(message.message)
      } else if (message.type === MESSAGE_TYPE.ERROR) {
        addErrorMessage(message.message)
      }
    });
    await browser.storage.local.set({ messages: [] });
  }
}

/**
 * @brief Wakes service worker by sending PING/PONG message.
 */
export async function wakeServiceWorker() {
  return new Promise((resolve) => {
    browser.runtime.sendMessage({ id: MESSAGE_IDS.REQUEST_SERVICE_WORKER_WAKE }, (response) => {
      if (browser.runtime.lastError) {
        // Worker was sleeping — it's now restarting, give it a moment
        setTimeout(resolve, 200);
      } else {
        resolve();
      }
    });
  });
}

/**
 * @brief Clears and populates shifts table with the shifts argument.
 * @param {Array[object]} shifts List of shifts
 */
function populateShiftsTable(shifts) {
  // Clear table
  const tbody = document.querySelector("#shift-tbody");
  tbody.replaceChildren();

  // Display no shifts message
  let noShiftsMessage = document.querySelector("#no-shifts-message")
  if (!shifts || Object.keys(shifts).length === 0) {
    noShiftsMessage.style.display = "block";
    return;
  }

  noShiftsMessage.style.display = "none";

  // Populate with shifts
  const template = document.querySelector("#shift-template");
  for (const [key, value] of Object.entries(shifts)) {
    const clone = template.content.cloneNode(true);
    clone.querySelector(".shift-start").textContent = new Date(value.startTime).toLocaleString("en-US", { dateStyle: 'short', timeStyle: 'short', hour12: false, timeZone: 'America/Los_Angeles' });
    clone.querySelector(".shift-end").textContent = new Date(value.endTime).toLocaleString("en-US", { dateStyle: 'short', timeStyle: 'short', hour12: false, timeZone: 'America/Los_Angeles' });
    clone.querySelector(".shift-location").textContent = value.location;
    clone.querySelector(".shift-provider-name").textContent = value.providerName;
    clone.querySelector(".shift-provider-type").textContent = value.providerType;
    clone.querySelector(".shift-overnight").textContent = value.overnight;
    tbody.appendChild(clone);
  }
}