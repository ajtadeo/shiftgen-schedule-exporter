(async () => {
  const userScraper = await import(chrome.runtime.getURL('src/shiftgen/UserScraper.js'));
  const paScraper = await import(chrome.runtime.getURL('src/shiftgen/PaScraper.js'));
  const doctorScraper = await import(chrome.runtime.getURL('src/shiftgen/DoctorScraper.js'));
  const common = await import(chrome.runtime.getURL('src/shiftgen/common.js'));

  const siteStr = document.querySelectorAll('button[data-action="click->button-dropdown-component#toggle"]')[2].textContent.trim();
  
  if (siteStr === common.TASKS.PA.site) {
    const scraper = new paScraper.PaScraper();
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.PA.id
    });
  } else if (siteStr === common.TASKS.DOCTOR.site) {
    const scraper = new doctorScraper.DoctorScraper();
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.DOCTOR.id
    });
  } else if (siteStr === common.TASKS.USER.site) {
    const scraper = new userScraper.UserScraper();
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.USER.id
    });
  }
  
})();