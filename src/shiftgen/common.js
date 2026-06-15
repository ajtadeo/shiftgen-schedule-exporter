/**
 * @file common.js
 * @brief Common constants, objects, and functions used across the application
 */

export const TASKS = Object.freeze({
  USER: {
    id: 0,
    providerType: "User",
    siteId: 83,
    url: "https://www.shiftgen.com/member/multi_site_schedule",
    site: "CHOC Scribe"
  },
  DOCTOR: {
    id: 1,
    providerType: "Doctor",
    siteId: 80,
    url: "https://www.shiftgen.com/admin/index",
    site: "St Joseph/CHOC Physician"
  },
  PA_NP: {
    id: 2,
    providerType: "PA/NP",
    siteId: 84,
    url: "https://www.shiftgen.com/admin/index",
    site: "St Joseph/CHOC MLP"
  }
});

export const STATE = Object.freeze({
  IDLE: 'IDLE',
  CREATE_TAB_USER: 'CREATE_TAB_USER',
  CREATE_TAB_PROVIDER: 'CREATE_TAB_PROVIDER',
  CHANGE_SITE_USER: 'CHANGE_SITE_USER',
  CHANGE_SITE_PA: 'CHANGE_SITE_PA',
  CHANGE_SITE_DOCTOR: 'CHANGE_SITE_DOCTOR',
  COLLECT_SCHEDULES: 'COLLECT_SCHEDULES',
  NAVIGATING: 'NAVIGATING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
});

export const MESSAGE_IDS = Object.freeze({
  REQUEST_SERVICE_WORKER_WAKE: 'REQUEST_SERVICE_WORKER_WAKE',
  REPLY_SERVICE_WORKER_WAKE: 'REPLY_SERVICE_WORKER_WAKE',
  START: 'START',
  CONTENT_SCRIPT_READY: 'CONTENT_SCRIPT_READY',
  TASK_RUNNING: 'TASK_RUNNING',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_FAILED: 'TASK_FAILED',
  SCHEDULES: 'SCHEDULES',
  TRIGGER_TASK: 'TRIGGER_TASK',
  TRIGGER_CHANGE_SITE: 'TRIGGER_CHANGE_SITE',
  TRIGGER_COLLECT_SCHEDULES: 'TRIGGER_COLLECT_SCHEDULES',
  EXPORT_GCAL: 'EXPORT_GCAL'
});

export const BADGE_IDS = Object.freeze({
  WORKFLOW_DONE: 'WORKFLOW_DONE',
  WORKFLOW_FAILED: 'WORKFLOW_FAILED',
  CALENDAR_ID_MISSING: 'CALENDAR_ID_MISSING',
  TARGET_MONTH_MISSING: 'TARGET_MONTH_MISSING',
  TARGET_YEAR_MISSING: 'TARGET_YEAR_MISSING',
  SHIFTGEN_LOGGED_OUT: 'SHIFTGEN_LOGGED_OUT',
  EXPORT_GCAL_DONE: 'EXPORT_GCAL_DONE',
  EXPORT_GCAL_FAILED: 'EXPORT_GCAL_FAILED'
})

export const MESSAGE_TYPE = Object.freeze({
  INFO: 'INFO',
  ERROR: 'ERROR'
});

export async function infoBadge(id, message = "", icon) {
  if (message.length > 0) {
    browser.storage.local.get(["messages"], (result) => {
      const messages = result.messages || [];
      messages.push({ id: id, message: message, type: MESSAGE_TYPE.INFO });
      browser.storage.local.set({ messages });
    });
  }
  browser.action.setBadgeText({ text: icon });
  browser.action.setBadgeBackgroundColor({ color: "#9DCAA0" });
}

export async function errorBadge(id, message = "") {
  if (message.length > 0) {
    browser.storage.local.get(["messages"], (result) => {
      const messages = result.messages || [];
      messages.push({ id: id, message: message, type: MESSAGE_TYPE.ERROR });
      browser.storage.local.set({ messages });
    });
  }
  browser.action.setBadgeText({ text: "ERR" });
  browser.action.setBadgeBackgroundColor({ color: "#EF4444" });
}

export async function clearBadge() {
  browser.action.setBadgeText({ text: "" });
}

export function defaultTaskStates() {
  return {
    0: { status: 'idle', tabId: null, result: null },
    1: { status: 'idle', tabId: null, result: null },
    2: { status: 'idle', tabId: null, result: null }
  };
}

export function taskIdToProviderType(taskId) {
  if (taskId === TASKS.USER.id) { return TASKS.USER.providerType; }
  else if (taskId === TASKS.DOCTOR.id) { return TASKS.DOCTOR.providerType; }
  else if (taskId === TASKS.PA_NP.id) { return TASKS.PA_NP.providerType; }
  else { return "Invalid"; }
}