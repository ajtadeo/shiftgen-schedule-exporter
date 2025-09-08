/**
 * @file TaskManager.js
 * @brief Class for scheduling tasks for multi-tab workflow
 */

import { TASKS } from "./common.js"

export class TaskManager {
  constructor() {
    // Initialize task states
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
          await this.handleStart();
          break;
        case 'CONTENT_SCRIPT_READY':
          console.log(`Task ${taskId} content script ready in tab ${sender.tab.id}`);
          this.triggerTask(taskId, sender.tab.id)
          break;
        case 'TASK_RUNNING':
          this.handleTaskRunning(taskId, sender.tab.id);
          break;
        case 'TASK_COMPLETED':
          this.handleTaskCompleted(taskId, sender.tab.id, data);
          break;
        case 'TASK_FAILED':
          this.handleTaskFailed(taskId, data);
          break;
        case 'REQUEST_TASK_STATUS':
          sendResponse(this.taskStates);
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
        this.taskStates[TASKS.PA.id].status === 'pending') {
      this.createTab(TASKS.PA.id, TASKS.PA.url)
      return;
    }
    
    if (this.taskStates[TASKS.USER.id].status === 'completed' && 
        this.taskStates[TASKS.DOCTOR.id].status === 'pending') {
      this.createTab(TASKS.DOCTOR.id, TASKS.DOCTOR.url);
      return;
    }

    // Check if task workflow is complete
    if (this.taskStates[TASKS.USER.id].status === 'completed' &&
        this.taskStates[TASKS.PA.id].status === 'completed' &&
        this.taskStates[TASKS.DOCTOR.id].status === 'completed'
    ) {
      console.log("Completed task workflow");
      this.taskStates = {
        0: { status: 'idle', tabId: null, result: null },
        1: { status: 'idle', tabId: null, result: null },
        2: { status: 'idle', tabId: null, result: null }
      };
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

    console.log(`Task ${taskId} failed:`, error);
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
  async triggerTask(taskId, tabId) {    
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
}