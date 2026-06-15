/**
 * @file userContentScript.js
 * @brief Content script injected into the admin page
 */

(async () => {
  const userScraper = await import(browser.runtime.getURL('src/shiftgen/UserScraper.js'));
  const paScraper = await import(browser.runtime.getURL('src/shiftgen/PaNpScraper.js'));
  const doctorScraper = await import(browser.runtime.getURL('src/shiftgen/DoctorScraper.js'));
  const common = await import(browser.runtime.getURL('src/shiftgen/common.js'));

  function getCurrentSite() {
    return document.querySelectorAll('button[data-action="click->button-dropdown-component#toggle"]')[2].textContent.trim();
  }

  function sendReadyMessage(siteStr) {
    if (siteStr === common.TASKS.PA_NP.site) {
      const scraper = new paScraper.PaNpScraper();
      browser.runtime.sendMessage({
        id: common.MESSAGE_IDS.CONTENT_SCRIPT_READY,
        taskId: common.TASKS.PA_NP.id
      });
    } else if (siteStr === common.TASKS.DOCTOR.site) {
      const scraper = new doctorScraper.DoctorScraper();
      browser.runtime.sendMessage({
        id: common.MESSAGE_IDS.CONTENT_SCRIPT_READY,
        taskId: common.TASKS.DOCTOR.id
      });
    } else if (siteStr === common.TASKS.USER.site) {
      const scraper = new userScraper.UserScraper();
      browser.runtime.sendMessage({
        id: common.MESSAGE_IDS.CONTENT_SCRIPT_READY,
        taskId: common.TASKS.USER.id
      });
    }
  }

  const initialSite = getCurrentSite();
  sendReadyMessage(initialSite);

  // Handle SPA changes from Doctor -> PA/NP
  let lastSite = initialSite;
  const observer = new MutationObserver(() => {
    const curerentSite = getCurrentSite();
    if (curerentSite && curerentSite !== lastSite) {
      lastSite = curerentSite;
      sendReadyMessage(curerentSite);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();