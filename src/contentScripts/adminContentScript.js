/**
 * @file userContentScript.js
 * @brief Content script injected into the admin page
 */

(async () => {
  const userScraper = await import(browser.runtime.getURL('src/shiftgen/UserScraper.js'));
  const paScraper = await import(browser.runtime.getURL('src/shiftgen/PaScraper.js'));
  const doctorScraper = await import(browser.runtime.getURL('src/shiftgen/DoctorScraper.js'));
  const common = await import(browser.runtime.getURL('src/shiftgen/common.js'));

  const siteStr = document.querySelectorAll('button[data-action="click->button-dropdown-component#toggle"]')[2].textContent.trim();

  if (siteStr === common.TASKS.PA.site) {
    const scraper = new paScraper.PaScraper();
    browser.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.PA.id
    });
  } else if (siteStr === common.TASKS.DOCTOR.site) {
    const scraper = new doctorScraper.DoctorScraper();
    browser.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.DOCTOR.id
    });
  } else if (siteStr === common.TASKS.USER.site) {
    const scraper = new userScraper.UserScraper();
    browser.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.USER.id
    });
  }

})();