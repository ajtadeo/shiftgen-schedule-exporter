
(async () => {
  const userScraper = await import(chrome.runtime.getURL('src/shiftgen/UserScraper.js'));
  const common = await import(chrome.runtime.getURL('src/shiftgen/common.js'));

  const scraper = new userScraper.UserScraper();

  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    taskId: common.TASKS.USER.id
  });
})();