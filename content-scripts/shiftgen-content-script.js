window.onload = async function () {
  let localStorage = await chrome.storage.local.get(["scraping_status"]);
  let scrapingStatus = localStorage.scraping_status;

  if (scrapingStatus !== SCRAPING_STATUS_ENUM.INACTIVE) {
    // redirect to member schedule
    window.location.href = "https://www.shiftgen.com/member/schedule";
  }
}