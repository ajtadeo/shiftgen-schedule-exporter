(async () => {
  const userScraper = await import(chrome.runtime.getURL('src/shiftgen/UserScraper.js'));
  const paScraper = await import(chrome.runtime.getURL('src/shiftgen/PaScraper.js'));
  const doctorScraper = await import(chrome.runtime.getURL('src/shiftgen/DoctorScraper.js'));
  const common = await import(chrome.runtime.getURL('src/shiftgen/common.js'));

  const scheduleStr = document.querySelectorAll('button[data-action="click->button-dropdown-component#toggle"]')[2].textContent.trim();
  
  if (scheduleStr === common.TASKS.PA.schedule) {
    const scraper = new paScraper.PaScraper();
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.PA.id
    });
  } else if (scheduleStr === common.TASKS.DOCTOR.schedule) {
    const scraper = new doctorScraper.DoctorScraper();
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.DOCTOR.id
    });
  } else if (scheduleStr === common.TASKS.USER.schedule) {
    const scraper = new userScraper.UserScraper();
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      taskId: common.TASKS.USER.id
    });
  }
  
})();