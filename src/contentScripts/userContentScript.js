/**
 * @file userContentScript.js
 * @brief Content script injected into the user schedule page
 */

(async () => {
  const userScraper = await import(browser.runtime.getURL('src/shiftgen/UserScraper.js'));
  const common = await import(browser.runtime.getURL('src/shiftgen/common.js'));

  const scraper = new userScraper.UserScraper();

  browser.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    taskId: common.TASKS.USER.id
  });
})();