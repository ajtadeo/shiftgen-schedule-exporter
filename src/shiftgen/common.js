/**
 * @file common.js
 * @brief Common constants, objects, and functions used across the application
 */

export const TASKS = {
  USER: {
    id: 0,
    siteId: 83,
    url: "https://www.shiftgen.com/member/multi_site_schedule",
    site: "CHOC Scribe"
  },
  DOCTOR: {
    id: 1,
    siteId: 80,
    url: "https://www.shiftgen.com/admin/index",
    site: "St Joseph/CHOC Physician"
  },
  PA: {
    id: 2,
    siteId: 84,
    url: "https://www.shiftgen.com/admin/index",
    site: "St Joseph/CHOC MLP"
  }
}

export const STATE = {
  IDLE: 0,
  CREATE_TAB_USER: 1,
  CREATE_TAB_PROVIDER: 2,
  CHANGE_SITE_USER: 3,
  CHANGE_SITE_PA: 4,
  CHANGE_SITE_DOCTOR: 5,
  COLLECT_SCHEDULES: 6,
  NAVIGATING: 7,
  RUNNING: 8,
  COMPLETED: 9,
}

export const MESSAGE_TYPE = {
  INFO: 0,
  ERROR: 1
}

export function infoBadge(message = "", icon) {
  if (message) {
    chrome.storage.local.get(["messages"], (result) => {
      const messages = result.messages || [];
      messages.push({message: message, type: MESSAGE_TYPE.INFO});
      chrome.storage.local.set({ messages });
    });
  }
  chrome.action.setBadgeText({ text: icon });
  chrome.action.setBadgeBackgroundColor({ color: "#9DCAA0" });
}

export function errorBadge(message = "") {
  if (message) {
    chrome.storage.local.get(["messages"], (result) => {
      const messages = result.messages || [];
      messages.push({message: message, type: MESSAGE_TYPE.ERROR});
      chrome.storage.local.set({ messages });
    });
  }
  chrome.action.setBadgeText({ text: "ERR" });
  chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
}

export function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}