/**
 * @file serviceWorker.js
 * @brief Extension service worker.
 */

import { TaskManager } from "./shiftgen/TaskManager.js"
import { BADGE_IDS, MESSAGE_IDS, STATE, defaultTaskStates, errorBadge, infoBadge } from "./shiftgen/common.js";
import { getAccessToken } from "./googleAuth.js";

let manager = null;
let ready = false;
let messageQueue = [];

// Browser events
browser.runtime.onInstalled.addListener((details) => init(details));
browser.runtime.onStartup.addListener(initTaskManager);
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => handleIncomingMessages(msg, sender, sendResponse));

/**
 * @brief Creates a new TaskManager if it hasn't already been initialized
 */
async function initTaskManager() {
  const saved = await browser.storage.local.get("workflow");
  const defaultWorkflow = {
    state: STATE.IDLE,
    taskStates: defaultTaskStates(),
    pendingSchedules: []
  }
  manager = new TaskManager(saved.workflow ?? defaultWorkflow);
  ready = true;

  // Process messages that were queued during initialization
  messageQueue.forEach(({ msg, sender, sendResponse }) => {
    manager.handleMessage(msg, sender, sendResponse);
  });
  messageQueue = [];
}

/**
 * @brief Listener that initializes local storage variables on extension install
 * and update.
 */
async function init(details) {
  if (details.reason == "install" || details.reason == "update") {
    // set local storage variables
    let now = new Date;
    await browser.storage.local.set({
      shifts: {},
      calendar_id: "",
      target_month: now.toLocaleString('default', { month: 'long', timeZone: 'UTC' }),
      target_year: now.getUTCFullYear().toString(),
      workflow: {
        state: STATE.IDLE,
        taskStates: defaultTaskStates(),
        pendingSchedules: []
      },
      messages: []
    });

    // Init for first install
    initTaskManager();
  }
};

/**
 * @brief Main message listener which waits until the TaskManager is ready
 * before handling an incoming message.
 */
async function handleIncomingMessages(msg, sender, sendResponse) {
  if (msg.id === MESSAGE_IDS.REQUEST_SERVICE_WORKER_WAKE) {
    // Handle service worker wake
    sendResponse({ id: MESSAGE_IDS.REPLY_SERVICE_WORKER_WAKE });
  } else if (msg.id === MESSAGE_IDS.EXPORT_GCAL) {
    // Handle Google Calendar Export
    exportToGoogleCalendar();
  } else {
    // Handle messages to TaskManager
    if (!ready) {
      messageQueue.push({ msg, sender, sendResponse });
    } else {
      manager.handleMessage(msg, sender, sendResponse);
    }
  }
  return true; // async response
};

/**
 * @brief Authenticates with Google, then exports all shifts in local storage to Google Calendar.
 */
async function exportToGoogleCalendar() {
  // Get OAuth Token
  let token;
  try {
    token = await getAccessToken();
  } catch (error) {
    console.error(error.message);
    await errorBadge(BADGE_IDS.EXPORT_GCAL_FAILED, `Failed to export shifts to Google Calendar: ${error.message} Please try again.`);
    return;
  }

  // Export shifts in local storage to GCal
  let localStorage = await browser.storage.local.get(["shifts", "calendar_id"]);
  let shifts = localStorage.shifts;
  let calendarId = localStorage.calendar_id;
  let postedAllEvents = true;
  let errorMessage = "";
  for (const [key, value] of Object.entries(shifts)) {
    let [result, err] = await exportShiftToGoogleCalendar(token, calendarId, value);
    if (result === false) {
      postedAllEvents = false;
      errorMessage = err;
      break;
    }
  }

  if (!postedAllEvents) {
    console.error(errorMessage);
    await errorBadge(BADGE_IDS.EXPORT_GCAL_FAILED,`Failed to export shifts to Google Calendar: ${errorMessage} Please try again.`);
  } else {
    await infoBadge(BADGE_IDS.EXPORT_GCAL_DONE, "Successfully exported shifts to Google Calendar!", "🪁");
  }
}

/**
 * @brief Sends a POST request to create a new event for shift in Google Calendar
 * @param {string} token
 * @param {string} calendarId
 * @param {object} shift
 * @returns Tuple where the first item is true if exporting was successful, and
 * the second item is an error message if unsuccessful.
 */
async function exportShiftToGoogleCalendar(token, calendarId, shift) {
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

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      options
    );
    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      return [false, message];
    }

    return [true, ""];
  } catch (err) {
    return [false, err];
  }
}

// Init on every service worker boot
initTaskManager();