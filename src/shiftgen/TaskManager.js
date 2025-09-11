/**
 * @file TaskManager.js
 * @brief Class for scheduling tasks for multi-tab workflow
 */

import { TASKS, STATE } from "./common.js"

export class TaskManager {
  constructor() {
    // Initialize task states
    this.state = STATE.IDLE;
    this.taskStates = {
      0: { status: 'idle', tabId: null, result: null },
      1: { status: 'idle', tabId: null, result: null },
      2: { status: 'idle', tabId: null, result: null }
    };
    
    // Main message listener
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      const { type, taskId, data } = message;
      
      switch (type) {
        case 'START':
          if (this.state === STATE.IDLE) {
            this.state = STATE.CREATE_TAB_USER;
            await this.handleStart();
          }
          break;
        case 'CONTENT_SCRIPT_READY':
          console.log(`Content script ready in tab ${sender.tab.id}`);
          if (this.state === STATE.CREATE_TAB_USER) {
            this.triggerChangeSchedule(taskId, sender.tab.id, TASKS.USER.siteId);
          } else if (this.state === STATE.CREATE_TAB_PROVIDER) {
            this.triggerChangeSchedule(taskId, sender.tab.id);
          } else if (this.state === STATE.CHANGE_SCHEDULE_USER) {
            this.state = STATE.RUNNING;
            this.triggerTask(TASKS.USER.id, sender.tab.id)
          } else if (this.state === STATE.CHANGE_SCHEDULE_PA) {
            this.state = STATE.NAVIGATING;
            this.triggerNav(TASKS.PA.id, sender.tab.id);
          } else if (this.state === STATE.CHANGE_SCHEDULE_DOCTOR) {
            this.state = STATE.NAVIGATING;
            this.triggerNav(TASKS.DOCTOR.id, sender.tab.id);
          } else if (this.state === STATE.NAVIGATING) {
            this.state = STATE.RUNNING;
            this.triggerTask(taskId, sender.tab.id)
          }
          break;
        case 'TASK_RUNNING':
          if (this.state === STATE.RUNNING) {
            this.handleTaskRunning(taskId, sender.tab.id);
          }
          break;
        case 'TASK_COMPLETED':
          if (this.state === STATE.RUNNING) {
            this.state = STATE.COMPLETED;
            this.handleTaskCompleted(taskId, sender.tab.id, data);
          }
          break;
        case 'TASK_FAILED':
          if (this.state === STATE.RUNNING || this.state === STATE.CHANGE_SCHEDULE) {
            this.state = STATE.IDLE;
            this.handleTaskFailed(taskId, data);
          }
          break;
      }
    });
  }

  /**
   * @brief Starts the task workflow
   */
  async handleStart() {
    console.log("Starting task workflow");
    this.taskStates = {
      0: { status: 'pending', tabId: null, result: null },
      1: { status: 'pending', tabId: null, result: null },
      2: { status: 'pending', tabId: null, result: null }
    };
    await chrome.storage.local.set({ shifts: {} });

    const localStorage = await chrome.storage.local.get(["target_month", "target_year"])
    const targetMonth = localStorage.target_month;
    const targetYear = localStorage.target_year;
    const date = new Date(`${targetMonth} 1, ${targetYear}`);
    const month = date.getMonth() + 1;

    // https://www.shiftgen.com/member/multi_site_schedule?month_id=10&year_id=2025
    const url = TASKS.USER.url + `?month_id=${month}&year_id=${targetYear}`
    this.createTab(TASKS.USER.id, url);
  }

  /**
   * @brief Sets the task ID to running
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   */
  handleTaskRunning(taskId, tabId) {
    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'running',
    };

    console.log(`Task ${taskId} running in tab ${tabId}`);
  }

  /**
   * @brief Sets the task ID to completed, and triggers any dependent tasks
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   * @param {Object} result Resulting data
   */
  handleTaskCompleted(taskId, tabId, result) {
    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'completed',
      result: result
    };
    
    console.log(`Task ${taskId} completed in tab ${tabId}`);
    
    // Check if we can create tabs for dependent tasks
    if (this.taskStates[TASKS.USER.id].status === 'completed' && 
        this.taskStates[TASKS.DOCTOR.id].status === 'pending')
    {
      this.state = STATE.CREATE_TAB_PROVIDER;
      this.createTab(TASKS.DOCTOR.id, TASKS.DOCTOR.url);
      return;
    } else if (this.taskStates[TASKS.USER.id].status === 'completed' && 
               this.taskStates[TASKS.PA.id].status === 'pending')
    {
      this.state = STATE.CREATE_TAB_PROVIDER;
      this.createTab(TASKS.PA.id, TASKS.PA.url)
      return;
    } // Check if task workflow is complete
      else if (this.taskStates[TASKS.USER.id].status === 'completed' &&
        this.taskStates[TASKS.PA.id].status === 'completed' &&
        this.taskStates[TASKS.DOCTOR.id].status === 'completed'
    ) {
      console.log("Completed task workflow");
      this.state = STATE.IDLE;
      this.taskStates = {
        0: { status: 'idle', tabId: null, result: null },
        1: { status: 'idle', tabId: null, result: null },
        2: { status: 'idle', tabId: null, result: null }
      };
    } else {
      console.error(`Task ${taskId} failed:`, "Invalid completion state");
      console.log(this.taskStates)
      this.state = STATE.IDLE;
      return;
    }
  }

  /**
   * @brief Sets the task ID to failed
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   * @param {Object} error Error data
   */
  handleTaskFailed(taskId, error) {
    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'failed',
      error: error
    };

    console.error(`Task ${taskId} failed:`, error);
  }

  /**
   * Creates a new tab at the specified URL
   * @param {number} taskId Task ID
   * @param {string} url URL to open
   */
  async createTab(taskId, url) {
    const targetTabId = (await chrome.tabs.create({ url: url })).id;
    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'tab_created',
      tabId: targetTabId
    };

    console.log(`Task ${taskId} created in tab ${targetTabId}`);
  }

  /**
   * @brief Triggers a task
   * @param {number} taskId Task ID
   */
  triggerTask(taskId, tabId) {    
    // Send message to trigger task
    chrome.tabs.sendMessage(tabId, {
      type: 'TRIGGER_TASK',
      taskId: taskId,
    });

    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'triggered',
    };

    console.log(`Task ${taskId} triggered in tab ${tabId}`);
  }

  /**
   * @brief Triggers a schedule change based on the task order USER -> DOCTOR -> PA
   * @param {number} taskId Task ID scheduling the change
   * @param {number} tabId Tab ID
   * @param {number} siteId Site ID to change schedule to. Null if USER is requesting
   *                   a schedule change to USER to reset the site state.
   */
  triggerChangeSchedule(taskId, tabId, siteId=null) {
    let schedule = ""
    let taskToUpdate = null;

    if (siteId === null) {
      if (taskId === TASKS.USER.id) {
        this.state = STATE.CHANGE_SCHEDULE_DOCTOR;
        siteId = TASKS.DOCTOR.siteId;
        taskToUpdate = TASKS.DOCTOR.id;
        schedule = "DOCTOR";
      } else if (taskId === TASKS.DOCTOR.id) {
        this.state = STATE.CHANGE_SCHEDULE_PA;
        siteId = TASKS.PA.siteId;
        taskToUpdate = TASKS.PA.id;
        schedule = "PA"
      } else {
        console.error(`Task ${taskId} failed:`, "Invalid schedule change trigger");
        this.state = STATE.IDLE;
        return;
      }
    } else {
      this.state = STATE.CHANGE_SCHEDULE_USER;
      taskToUpdate = TASKS.USER.id;
      schedule = "USER"
    }

    chrome.tabs.sendMessage(tabId, {
      type: 'TRIGGER_CHANGE_SCHEDULE',
      taskId: taskId,
      siteId: siteId
    });

    this.taskStates[taskToUpdate] = {
      ...this.taskStates[taskToUpdate],
      status: 'change_schedule',
    };

    console.log(`Triggered to change schedule to ${schedule} in tab ${tabId}`);
  }

  /**
   * Triggers a navigation to the target schedule
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   */
  triggerNav(taskId, tabId) {
    chrome.tabs.sendMessage(tabId, {
      type: 'TRIGGER_NAV',
      taskId: taskId,
    });

    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'navigating',
    };

    console.log(`Task ${taskId} triggered to navigate to schedule in tab ${tabId}`);
  }
}