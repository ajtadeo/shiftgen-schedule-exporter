
(async () => {
  const doctorScraper = await import(chrome.runtime.getURL('src/shiftgen/DoctorScraper.js'));
  const common = await import(chrome.runtime.getURL('src/shiftgen/common.js'));

  const scraper = new doctorScraper.DoctorScraper();

  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    taskId: common.TASKS.DOCTOR.id
  });
})();