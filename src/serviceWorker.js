/**
 * @file serviceWorker.js
 * @brief Extension service worker.
 */

import { TaskManager } from "./shiftgen/TaskManager.js"

let manager;

/**
 * @brief Creates a new TaskManager if it hasn't already been initialized
 */
function initTaskManager() {
  if (!manager) {
    console.log("Created task manager");
    manager = new TaskManager();
  }
}

/**
 * @brief Listener that initializes local storage variables on extension install and update.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason == "install" || details.reason == "update") {
    // set local storage variables
    chrome.storage.local.set({
      shifts: {},
      calendar_id: "",
      target_month: new Date().toLocaleString('default', { month: 'long' }),
      target_year: new Date().getFullYear()
    })

    initTaskManager();
  }
})

chrome.runtime.onStartup.addListener((details) => {
  initTaskManager();
})