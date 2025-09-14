/**
 * @file Scraper.js
 * @brief Base class for scraping shift data
 */

import { TASKS } from "./common.js";

const patterns = {
  1: { pattern: /^(?!SJH)(?!PIT)(\w+)\s(\d{2}|\d{4})-(\d{2}|\d{4})$/, groupNames: ["location", "start_time_str", "end_time_str"] }, // North 2130-0600
  2: { pattern: /^(\d{2}|\d{4})-(\d{2}|\d{4})\s\((\w+)\)$/, groupNames: ["start_time_str", "end_time_str", "location"] }, // 1700-0100 (RED)
  3: { pattern: /^(\d{2}|\d{4})-(\d{2}|\d{4})\s(\w+)$/, groupNames: ["start_time_str", "end_time_str", "location"] } // 1900-0330 PA
};

export class Shift {
  /**
   * @brief Constructor for Shift class
   * 
   * @param {number} startTime Shift start time in epoch milliseconds
   * @param {number} endTime Shift end time in epoch milliseconds
   * @param {string} location Shift location
   * @param {boolean} overnight Overnight flag, true if overnight else false
   * @param {string} providerType Provider type
   * @param {string} providerName Provider name 
   */
  constructor(startTime, endTime, location, overnight, providerType, providerName) {
    this.startTime = startTime;                // epoch ms (int)
    this.endTime = endTime;                    // epoch ms (int)
    this.location = location;                  // string
    this.overnight = overnight;                // bool
    this.providerType = providerType;          // int
    this.providerName = providerName;          // string
  }

  /**
   * @brief Gets shift data as a JSON object for storage in local storage.
   * 
   * @returns Shift data as a JSON object
   */
  getJSON() {
    return {
      "startTime": this.startTime,
      "endTime": this.endTime,
      "location": this.location,
      "overnight": this.overnight,
      "providerType": this.providerType,
      "providerName": this.providerName
    }
  }

  /**
   * @brief Prints shift data. Useful for debugging.
   */
  print() {
    let prefix = "";
    if (this.providerType === TASKS.DOCTOR.id) {
      prefix = "DOCTOR";
    } else if (this.providerType === TASKS.PA.id) {
      prefix = "PA/NP";
    } else if (this.providerType === TASKS.USER.id) {
      prefix = "UNKNOWN";
    }

    console.log({
      providerType: prefix,
      providerName: this.providerName,
      location: this.location,
      startTime: this.startTime,
      endTime: this.endTime,
      overnight: this.overnight
    })
  }
}

export class Scraper {
  /**
   * @brief Scraper constructor
   * @param {number} task Task
   */
  constructor(task) {
    this.taskId = task.id;
    this.siteId = task.siteId;
    this.providerType = task.id;
    
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      if (message.type === 'TRIGGER_TASK' && message.taskId === this.taskId) {
        this.executeTask();
      } else if (message.type === 'TRIGGER_CHANGE_SITE' && message.taskId === this.taskId) {
        if (message.taskToUpdate === TASKS.USER.id && !this.checkCalendarExistence()) {
          return;
        }
        this.changeSite(message.siteId);
      } else if (message.type === 'TRIGGER_COLLECT_SCHEDULES' && message.taskId === this.taskId) {
        await this.collectSchedules();
      }
    });
  }

  /**
   * @brief Awaits task dependencies to complete, then executes task 
   */
  async executeTask() {
    try {
      // Signal task start
      chrome.runtime.sendMessage({
        type: 'TASK_RUNNING',
        taskId: this.taskId
      });

      await this.scrape();

      // Signal task completion
      chrome.runtime.sendMessage({
        type: 'TASK_COMPLETED',
        taskId: this.taskId,
      });

      // TODO: Close tab

    } catch (error) {
      console.error(`Task ${this.taskId} failed:`, error);
      chrome.runtime.sendMessage({
        type: 'TASK_FAILED',
        taskId: this.taskId,
        data: error.message
      });
    }
  }

  /**
   * Changes the site by clicking the appropriate button in the site navigation
   * @param {number} siteId Site ID
   */
  changeSite(siteId) {
    let button;
    if (siteId === TASKS.DOCTOR.siteId) {
      button = document.querySelector("#sites-nav-StJosephCHOCPhysician");
    } else if (siteId === TASKS.PA.siteId) {
      button = document.querySelector("#sites-nav-StJosephCHOCMLP");
    } else if (siteId === TASKS.USER.siteId) {
      button = document.querySelector("#sites-nav-CHOCScribe");
    } else {
      console.error(`Task ${this.taskId} failed:`, error);
      chrome.runtime.sendMessage({
        type: 'TASK_FAILED',
        taskId: this.taskId,
        data: `Failed to change site for siteId: ${siteId}`
      });
    }

    button.click();
  }

  /**
   * @brief Collects published schedule URLs associated with the target year and
   * month from the admin page.
   */
  async collectSchedules() {
    // Find published schedules
    const tables = document.querySelectorAll("table[data-controller=table-component]");
    let publishedSchedules = null;
    for (let table of tables) {
      if (table.querySelector("thead").textContent.includes("Published Schedules")) {
        publishedSchedules = table;
        break;
      }
    }

    if (publishedSchedules === null) {
      console.error(`Task ${this.taskId} failed:`, error);
      chrome.runtime.sendMessage({
        type: 'TASK_FAILED',
        taskId: this.taskId,
        data: `Failed to navigate to schedule for taskId: ${this.taskId}`
      });
    }

    // Find all schedules with target month and year
    const localStorage = await chrome.storage.local.get(["target_month", "target_year"]);
    const targetMonth = localStorage.target_month;
    const targetYear = localStorage.target_year;
    const targetMonthShort = new Date(`${targetMonth} 1, ${targetYear}`).toLocaleDateString("default", {month: "short"});

    const schedules = publishedSchedules.querySelectorAll("tbody tr");
    let scheduleUrls = []
    for (let schedule of schedules) {
      if ((schedule.textContent.includes(targetMonth) || schedule.textContent.includes(targetMonthShort)) &&
          schedule.textContent.includes(targetYear))
      {
        const button = schedule.querySelector('button[data-action="click->admin#onAction"]');
        const path = button.getAttribute("data-admin-url-param");
        scheduleUrls.push(`https://www.shiftgen.com${path}`);
      }
    }

    chrome.runtime.sendMessage({
      type: 'SCHEDULES',
      taskId: this.taskId,
      data: {
        pendingSchedules: scheduleUrls,
        targetMonth: targetMonth,
        targetYear: targetYear
      }
    });
  }

  /**
   * @brief Abstract method to scrape a web page. Must be implemented by derived classes.
   */
  async scrape() {
    throw new Error('scrape() method must be implemented by subclass');
  }

  /**
   * @brief Gets all shifts as Shift instances on the calendar
   * @returns Array of Shift instances
   */
  getAllShifts() {
    let shifts = [];

    const shiftCells = document.querySelectorAll("#calendar .shift-cell");
    for (let cell of shiftCells) {
      const s = this.parseShiftCell(cell);
      if (s !== undefined) {
        shifts.push(s);
      }
    }

    return shifts;
  }

  /**
   * @brief Parses a single shift cell element into a Shift instance
   * @param {HTMLElement} cell Shift cell element
   * @returns Shift instance
   */
  parseShiftCell(cell) {
    const infoStr = cell.getAttribute("data-shift-cell-component-name-value");
    const date = cell.getAttribute("data-shift-cell-component-shift-key-value");
    let assignee = cell.getAttribute("data-shift-cell-component-assignee-value");

    // Parse date into month, day, year
    const dateMatch = date.match(/^(\d{4})_(\d{2})_(\d{2})/);
    if (dateMatch === null) {
      console.warn("Date could not be parsed:", date);
      return undefined;
    }
    const [_, year, month, day] = dateMatch;

    // Parse infoStr into info object
    let info = {};
    let match = null;
    for (const [key, { pattern, groupNames }] of Object.entries(patterns)) {
      match = infoStr.match(pattern);
      if (match) {
        info = groupNames.reduce((acc, name, i) => {
          acc[name] = match[i + 1];
          return acc;
        }, {});
        break;
      }
    }

    if (match === null) {
      console.log("Info could not be parsed:", infoStr);
      return undefined;
    }

    if (info["end_time_str"].length === 2) {
      info["end_time_str"] += "00";
    }

    if (info["start_time_str"].length === 2) {
      info["start_time_str"] += "00";
    }

    // edge case for 2400
    if (info["end_time_str"] === "2400") {
      info["end_time_str"] = "2359";
    }
    if (info["start_time_str"] === "2400") {
      info["start_time_str"] = "2359";
    }

    // Get start and end times
    const monthNumber = new Date(`${month} ${day}, ${year}`).getMonth();
    const startTime = new Date(
      parseInt(year),
      monthNumber,
      parseInt(day),
      parseInt(info["start_time_str"].slice(0, 2)),
      parseInt(info["start_time_str"].slice(2)),
      0
    );
    const endDateTime = new Date(
      parseInt(year),
      monthNumber,
      parseInt(day),
      parseInt(info["end_time_str"].slice(0, 2)),
      parseInt(info["end_time_str"].slice(2)),
      0
    );

    // Edge case for overnight shifts
    let overnight = false;
    if (parseInt(info["end_time_str"].slice(0, 2)) < parseInt(info["start_time_str"].slice(0, 2))) {
      overnight = true;
      endDateTime.setDate(endDateTime.getDate() + 1)
    }

    // Rename providers
    if (assignee === "SAINTGEORGES") {
      assignee = "MSG";
    } else if (assignee === "NISHIOKA") {
      assignee = "NISH";
    } else if (assignee === "MIRCHANDANI") {
      assignee = "D$"
    }

    if (this.taskId === TASKS.USER.id) {
      return new Shift(
        startTime.getTime(),
        endDateTime.getTime(),
        info["location"].trim().toUpperCase(),
        overnight,
        TASKS.USER.id,
        ""
      )
    } else {
      return new Shift(
        startTime.getTime(),
        endDateTime.getTime(),
        info["location"].trim().toUpperCase(),
        overnight,
        this.providerType,
        assignee.trim()
      );
    }
  }

  /**
   * @brief Calculates the overlap in milliseconds between two shifts.
   * 
   * @param {Shift} shift Provider shift
   * @param {Shift} userShift User's shift
   * 
   * @returns Length in milliseconds of the overlap. 0 if no overlap exists
   */
  getOverlap(shift, userShift) {
    let overlapStart = Math.max(userShift.startTime, shift.startTime);
    let overlapEnd = Math.min(userShift.endTime, shift.endTime);
    let overlapLength = Math.max(0, overlapEnd - overlapStart);
    return overlapLength;
  }

  /**
   * @brief Checks the existence of the calendar element. If it doesn't exist,
   * then then a failure should be signaled to the TaskManager.
   * @returns True if calendar exists, false otherwise
   */
  checkCalendarExistence() {
    if (document.querySelector("#calendar") === null) {
      console.error(`Task ${this.taskId} failed:`, "No user shifts available");
      chrome.runtime.sendMessage({
        type: 'TASK_FAILED',
        taskId: this.taskId,
        data: "No user shifts available"
      });
      return false;
    } else {
      return true;
    }
  }
}