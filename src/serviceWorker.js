/**
 * @file serviceWorker.js
 * @brief Extension service worker.
 */

import { TaskManager } from "./shiftgen/TaskManager.js"
import { STATE, defaultTaskStates } from "./shiftgen/common.js";

let manager = null;
let ready = false;
let messageQueue = [];

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
browser.runtime.onInstalled.addListener(async (details) => {
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
});

/**
 * @brief Listener that initializes TaskManager when Chrome restarts.
 */
browser.runtime.onStartup.addListener(initTaskManager);

/**
 * @brief Main message listener which waits until the TaskManager is ready
 * before handling an incoming message.
 */
browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  // Handle service worker wake
  if (msg.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return true;
  }

  // Handle messages to TaskManager
  if (!ready) {
    messageQueue.push({ msg, sender, sendResponse });
  } else {
    manager.handleMessage(msg, sender, sendResponse);
  }
  return true; // async response
});

// Init on every service worker boot
initTaskManager();