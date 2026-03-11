/**
 * @file serviceWorker.js
 * @brief Extension service worker.
 */

import { TaskManager } from "./shiftgen/TaskManager.js"
import { STATE } from "./shiftgen/common.js";

let manager = null;
let ready = false;
let messageQueue = [];

/**
 * @brief Creates a new TaskManager if it hasn't already been initialized
 */
async function initTaskManager() {
  const saved = await chrome.storage.local.get("workflow");
  manager = new TaskManager(saved.workflow);
  ready = true;
  
  // Process messages that were queued during initialization
  messageQueue.forEach(({ msg, sender, sendResponse }) => {
    manager.handleMessage(msg, sender, sendResponse);
  });
  messageQueue = [];
}

initTaskManager();

/**
 * @brief Listener that initializes local storage variables on extension install
 * and update.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason == "install" || details.reason == "update") {
    // set local storage variables
    chrome.storage.local.set({
      shifts: {},
      calendar_id: "",
      target_month: new Date().toLocaleString('default', { month: 'long' }),
      target_year: new Date().getFullYear(),
      workflow: {
        state: STATE.IDLE,
        taskStates: {
          0: { status: 'idle', tabId: null, result: null },
          1: { status: 'idle', tabId: null, result: null },
          2: { status: 'idle', tabId: null, result: null }
        },
        pendingSchedules: []
      }
    })
  }
});

/**
 * @brief Main message listener which waits until the TaskManager is ready
 * before handling an incoming message.
 */
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (!ready) {
    messageQueue.push({ msg, sender, sendResponse });
  } else {
    manager.handleMessage(msg, sender, sendResponse);
  }
  return true; // async response
});