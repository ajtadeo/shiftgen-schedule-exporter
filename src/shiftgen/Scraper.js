/**
 * @file Scraper.js
 * @brief Base class for scraping shift data
 */

import { PROVIDER_ENUM } from "./common.js";

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
  constructor(startTime, endTime, location, overnight, providerType=PROVIDER_ENUM.UNKNOWN, providerName="") {
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
    if (this.providerType === PROVIDER_ENUM.DOCTOR) {
      prefix = "DOCTOR";
    } else if (this.providerType === PROVIDER_ENUM.PA) {
      prefix = "PA/NP";
    } else if (this.providerType === PROVIDER_ENUM.UNKNOWN) {
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
    this.providerType = PROVIDER_ENUM[task.id];
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TRIGGER_TASK' && message.taskId === this.taskId) {
        this.executeTask();
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

      const result = await this.scrape();

      // Signal task completion
      chrome.runtime.sendMessage({
        type: 'TASK_COMPLETED',
        taskId: this.taskId,
        data: result
      });

      // Close tab


    } catch (error) {
      console.error(`${this.taskId} failed:`, error);
      chrome.runtime.sendMessage({
        type: 'TASK_FAILED',
        taskId: this.taskId,
        data: error.message
      });
    }
  }

  /**
   * @brief Abstract method to scrape a web page. Must be implemented by derived classes.
   */
  async scrape() {
    throw new Error('scrape() method must be implemented by subclass');
  }

  getAllShifts() {
    // #calendar .shift-cell
    // <div id="2025_09_02_16053" class="shift-cell group flex flex-col  " 
    // data-controller="shift-cell-component" 
    // data-shift-cell-component-shift-calendar-component-outlet="#calendar" 
    // data-shift-cell-component-shift-key-value="2025_09_02_16053" 
    // data-shift-cell-component-name-value="South 2130-0600" 
    // data-shift-cell-component-shift-group-id-value="" 
    // data-shift-cell-component-assignee-id-value="noworker" 
    // data-shift-cell-component-assignee-value="Empty" 
    // data-action="focus-&gt;shift-cell-component#setSelectedShift 
    // focusout-&gt;shift-cell-component#onBlur" tabindex="0">
    // ...
    // </div>
    let shifts = [];

    const shiftCells = document.querySelectorAll("#calendar .shift-cell");
    for (let cell of shiftCells) {
      const s = this.parseShiftCell(cell);
      if (s !== undefined) {
        s.print();
        shifts.push(s);
      }
    }

    return shifts;
  }

  parseShiftCell(cell) {
    const infoStr = cell.getAttribute("data-shift-cell-component-name-value");
    const date = cell.getAttribute("data-shift-cell-component-shift-key-value");
    let name = cell.getAttribute("data-shift-cell-component-assignee-value");

    // Parse date into month, day, year
    const dateMatch = date.match(/^(\d{4})_(\d{2})_(\d{2})/);
    if (dateMatch === null) {
      console.log("Date could not be parsed:", date);
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
    if (name === "SAINTGEORGES") {
      name = "MSG";
    } else if (name === "NISHIOKA") {
      name = "NISH";
    }

    if (name === "Empty") {
      return new Shift(
        startTime.getTime(),
        endDateTime.getTime(),
        info["location"].trim().toUpperCase(),
        overnight
      )
    } else {
      return new Shift(
        startTime.getTime(),
        endDateTime.getTime(),
        info["location"].trim().toUpperCase(),
        overnight,
        this.providerType,
        name.trim()
      );
    }
  }
}