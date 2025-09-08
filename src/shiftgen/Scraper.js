/**
 * @file Scraper.js
 * @brief Base class for scraping shift data
 */

export class Scraper {
  /**
   * @brief Scraper constructor
   * @param {number} task Task
   */
  constructor(task) {
    this.taskId = task.id;
    this.siteId = task.siteId;
    
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
  }
}