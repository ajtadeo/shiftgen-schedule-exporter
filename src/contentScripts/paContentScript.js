
(async () => {
  const paScraper = await import(chrome.runtime.getURL('src/shiftgen/PaScraper.js'));
  const common = await import(chrome.runtime.getURL('src/shiftgen/common.js'));

  const scraper = new paScraper.PaScraper();

  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    taskId: common.TASKS.PA.id
  });
})();