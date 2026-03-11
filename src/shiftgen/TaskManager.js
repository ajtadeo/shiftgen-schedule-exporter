/**
 * @file TaskManager.js
 * @brief Class for scheduling tasks for multi-tab workflow
 */

import { TASKS, STATE } from "./common.js"

/**
 * @class TaskManager
 * @brief Class for scheduling tasks for multi-tab workflow
 */
export class TaskManager {
  /**
   * @brief Constructor
   * @param {object} workflow Workflow state from Chrome storage
   */
  constructor(workflow) {
    console.log("Created TaskManager");

    // Initialize task states
    this.state = workflow.state;
    this.taskStates = workflow.taskStates;
    this.pendingSchedules = workflow.pendingSchedules;    
    this.saveTimer;
    console.log("Restored TaskManager state:", workflow);
  }

  /**
   * @brief Main message handler
   * @param {object} message Incoming message buffer
   * @param {object} sender Sender object
   * @param {function} sendResponse Response callback function
   */
  async handleMessage(message, sender, sendResponse) {
    const { type, taskId, data } = message;
    
    switch (type) {
      case 'START':
        if (this.state === STATE.IDLE) {
          this.state = STATE.CREATE_TAB_USER;
          await this.saveWorkflow();
          await this.handleStart();
        }
        break;

      case 'CONTENT_SCRIPT_READY':
        console.log(`Content script ready in tab ${sender.tab.id} from ${taskId}`);
        if (this.state === STATE.CREATE_TAB_USER) {
          await this.triggerChangeSite(taskId, sender.tab.id, TASKS.USER.siteId);
        } else if (this.state === STATE.CREATE_TAB_PROVIDER) {
          await this.triggerChangeSite(taskId, sender.tab.id);
        } else if (this.state === STATE.CHANGE_SITE_USER) {
          this.state = STATE.NAVIGATING;
          await this.saveWorkflow();
          const url = await this.getTargetUrl();
          await this.triggerNavigation(taskId, sender.tab.id, url);
        } else if (this.state === STATE.CHANGE_SITE_PA) {
          this.state = STATE.COLLECT_SCHEDULES;
          await this.saveWorkflow();
          await this.triggerCollectSchedules(TASKS.PA.id, sender.tab.id);
        } else if (this.state === STATE.CHANGE_SITE_DOCTOR) {
          this.state = STATE.COLLECT_SCHEDULES;
          await this.saveWorkflow();
          await this.triggerCollectSchedules(TASKS.DOCTOR.id, sender.tab.id);
        } else if (this.state === STATE.NAVIGATING) {
          this.state = STATE.RUNNING;
          await this.saveWorkflow();
          await this.triggerTask(taskId, sender.tab.id)
        }
        break;

      case 'SCHEDULES':
        if (this.state == STATE.COLLECT_SCHEDULES) {
          console.log(data.pendingSchedules)
          this.pendingSchedules = data.pendingSchedules;
          await this.saveWorkflow();
          if (this.pendingSchedules.length !== 0) {
            this.state = STATE.NAVIGATING;
            await this.saveWorkflow();
            await this.handlePendingSchedules(taskId, sender.tab.id);
          } else {
            this.state = STATE.IDLE;
            await this.saveWorkflow();
            await this.handleTaskFailed(taskId, `No schedules found for ${data.targetMonth} ${data.targetYear}`);
          }
        }
        break;

      case 'TASK_RUNNING':
        if (this.state === STATE.RUNNING) {
          await this.handleTaskRunning(taskId, sender.tab.id);
        }
        break;

      case 'TASK_COMPLETED':
        if (this.state === STATE.RUNNING) {
          this.state = STATE.COMPLETED;
          await this.saveWorkflow();
          await this.handleTaskCompleted(taskId, sender.tab.id, data);
        }
        break;

      case 'TASK_FAILED':
        if (this.state !== STATE.IDLE) {
          this.state = STATE.IDLE;
          await this.saveWorkflow();
          await this.handleTaskFailed(taskId, data);
        }
        break;
    }
  }

  /**
   * @brief Saves the current workflow to Chrome storage for state persistence
   * with a 50ms debounce delay.
   * */
  async saveWorkflow() {
    await chrome.storage.local.set({
      workflow: {
        state: this.state,
        taskStates: this.taskStates,
        pendingSchedules: this.pendingSchedules
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
    this.pendingSchedules = [];
    await chrome.storage.local.set({ shifts: {} });

    await this.saveWorkflow();
    await this.createTab(TASKS.USER.id, TASKS.USER.url);
  }

  /**
   * @brief Sets the task ID to running
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   */
  async handleTaskRunning(taskId, tabId) {
    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'running',
    };

    await this.saveWorkflow();

    console.log(`Task ${taskId} running in tab ${tabId}`);
  }

  /**
   * @brief Sets the task ID to completed, and triggers any dependent tasks
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   * @param {Object} result Resulting data
   */
  async handleTaskCompleted(taskId, tabId, result) {
    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'completed',
      result: result
    };

    await this.saveWorkflow();
    
    console.log(`Task ${taskId} completed in tab ${tabId}`);
    
    // Check if all pending schedules have been scraped
    if (this.pendingSchedules.length !== 0) {
      this.state = STATE.NAVIGATING;
      await this.saveWorkflow();
      await this.handlePendingSchedules(taskId, tabId);
      return;
    }

    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'all completed',
      result: result
    };

    // Check if we can create tabs for dependent tasks
    await this.saveWorkflow();

    if (this.taskStates[TASKS.USER.id].status === 'all completed' && 
        this.taskStates[TASKS.DOCTOR.id].status === 'pending')
    {
      this.state = STATE.CREATE_TAB_PROVIDER;
      await this.saveWorkflow();
      await this.createTab(TASKS.DOCTOR.id, TASKS.DOCTOR.url);
      return;
    } else if (this.taskStates[TASKS.USER.id].status === 'all completed' && 
               this.taskStates[TASKS.PA.id].status === 'pending')
    {
      this.state = STATE.CREATE_TAB_PROVIDER;
      await this.saveWorkflow();
      await this.createTab(TASKS.PA.id, TASKS.PA.url)
      return;
    }  // Check if task workflow is complete
      else if (
        this.taskStates[TASKS.USER.id].status === 'all completed' &&
        this.taskStates[TASKS.PA.id].status === 'all completed' &&
        this.taskStates[TASKS.DOCTOR.id].status === 'all completed'
    ) {
      console.log("Completed task workflow");
      this.state = STATE.IDLE;
      this.taskStates = {
        0: { status: 'idle', tabId: null, result: null },
        1: { status: 'idle', tabId: null, result: null },
        2: { status: 'idle', tabId: null, result: null }
      };

      await this.saveWorkflow();

      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../public/icons/icon_32.png',
        title: 'ShiftGen Schedule Exporter',
        message: "Completed scraping shifts",
        priority: 0
      }); 

    } else {
      this.state = STATE.IDLE;
      await this.saveWorkflow();
      await this.handleTaskFailed(taskId, "Invalid completion state");
    }
  }

  /**
   * @brief Sets the task ID to failed
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   * @param {Object} error Error data
   */
  async handleTaskFailed(taskId, error) {
    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'failed',
      error: error
    };

    await this.saveWorkflow();

    console.error(`Task ${taskId} failed:`, error);
    console.log(this.taskStates);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../public/icons/icon_32.png',
      title: 'ShiftGen Schedule Exporter',
      message: `Task ${taskId} failed: ${error}`,
      priority: 0
    });    
  }

  /**
   * @brief Pops a schedule URL from the list and triggers navigation to that
   * schedule URL.
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   */
  async handlePendingSchedules(taskId, tabId) {
    const scheduleUrl = this.pendingSchedules.pop();

    await this.saveWorkflow();
    await this.triggerNavigation(taskId, tabId, scheduleUrl);
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

    await this.saveWorkflow();

    console.log(`Task ${taskId} created in tab ${targetTabId} for ${url}`);
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

    await this.saveWorkflow();

    console.log(`Task ${taskId} triggered in tab ${tabId}`);
  }

  /**
   * @brief Triggers a site change based on the task order USER -> DOCTOR -> PA
   * @param {number} taskId Task ID scheduling the change
   * @param {number} tabId Tab ID
   * @param {number} siteId Site ID to change site to. Null if USER is requesting
   *                        a site change to USER to reset the site state.
   */
  async triggerChangeSite(taskId, tabId, siteId=null) {
    let site = ""
    let taskToUpdate = null;

    if (siteId === null) {
      if (taskId === TASKS.USER.id) {
        this.state = STATE.CHANGE_SITE_DOCTOR;
        siteId = TASKS.DOCTOR.siteId;
        taskToUpdate = TASKS.DOCTOR.id;
        site = "DOCTOR";
      } else if (taskId === TASKS.DOCTOR.id) {
        this.state = STATE.CHANGE_SITE_PA;
        siteId = TASKS.PA.siteId;
        taskToUpdate = TASKS.PA.id;
        site = "PA"
      } else {
        this.state = STATE.IDLE;
        await this.saveWorkflow();
        await this.handleTaskFailed(taskId, "Invalid site change trigger");
        return;
      }
    } else {
      this.state = STATE.CHANGE_SITE_USER;
      taskToUpdate = TASKS.USER.id;
      site = "USER"
    }

    chrome.tabs.sendMessage(tabId, {
      type: 'TRIGGER_CHANGE_SITE',
      taskId: taskId,
      taskToUpdate: taskToUpdate,
      siteId: siteId
    });

    this.taskStates[taskToUpdate] = {
      ...this.taskStates[taskToUpdate],
      status: 'changing site',
    };

    await this.saveWorkflow();

    console.log(`Triggered to change site to ${site} in tab ${tabId}`);
  }

  /**
   * Triggers a navigation to the target URL
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   * @param {string} url URL to set the tab with Tab ID to
   */
  async triggerNavigation(taskId, tabId, url) {
    chrome.tabs.update(tabId, { url: url });

    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'navigating',
    };

    await this.saveWorkflow();

    console.log(`Task ${taskId} triggered to navigate to ${url} in tab ${tabId}`);
  }

  /**
   * @brief Triggers schedule collection on tabId's tab
   * @param {number} taskId Task ID
   * @param {number} tabId Tab ID
   */
  async triggerCollectSchedules(taskId, tabId) {
    chrome.tabs.sendMessage(tabId, {
      type: 'TRIGGER_COLLECT_SCHEDULES',
      taskId: taskId
    });

    this.taskStates[taskId] = {
      ...this.taskStates[taskId],
      status: 'collecting schedules',
    };

    await this.saveWorkflow();

    console.log(`Task ${taskId} triggered to collect schedules in tab ${tabId}`);
  }

  /**
   * @brief Gets the URL for the target month and year currently in local storage
   * @returns Target month and year URL
   */
  async getTargetUrl() {
    const localStorage = await chrome.storage.local.get(["target_month", "target_year"])
    const targetMonth = localStorage.target_month;
    const targetYear = localStorage.target_year;
    const date = new Date(`${targetMonth} 1, ${targetYear}`);
    const month = date.getMonth() + 1;

    // https://www.shiftgen.com/member/multi_site_schedule?month_id=10&year_id=2025
    const url = TASKS.USER.url + `?month_id=${month}&year_id=${targetYear}`
    return url;
  }
}