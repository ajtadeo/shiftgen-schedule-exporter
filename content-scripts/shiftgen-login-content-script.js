window.onload = async function () {
  let localStorage = await chrome.storage.local.get(["scraping_status"]);
  let scrapingStatus = localStorage.scraping_status;

  if (scrapingStatus !== SCRAPING_STATUS_ENUM.INACTIVE) {
    // reset local variables
    await chrome.storage.local.set({
      scraping_status: SCRAPING_STATUS_ENUM.INACTIVE,
      redirect_to_print_page: false,
    });
    alert("Please login before scraping shifts.")
  }
}