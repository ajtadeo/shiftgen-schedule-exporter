window.onload = async function () {
  let localStorage = await chrome.storage.local.get(["scraping_status", "redirect_to_print_page"]);
  let scrapingStatus = localStorage.scraping_status;
  let redirectToPrintPage = localStorage.redirect_to_print_page

  if (scrapingStatus !== SCRAPING_STATUS_ENUM.INACTIVE && redirectToPrintPage) {
    // for edge case with USER, manually redirect to member/schedule
    await chrome.storage.local.set({ redirect_to_print_page: false });
    window.location.href = "https://www.shiftgen.com/member/schedule";
  } else if (scrapingStatus !== SCRAPING_STATUS_ENUM.INACTIVE && scrapingStatus !== SCRAPING_STATUS_ENUM.DONE && !redirectToPrintPage) {
    // submit change multi site id (user, pa, or doctor dropdown form)
    await chrome.storage.local.set({ redirect_to_print_page: true });

    let form = document.querySelector("form#site_change_form");
    let select = form.querySelector("select#site_id");
    if (scrapingStatus === SCRAPING_STATUS_ENUM.STARTING) {
      await chrome.storage.local.set({ scraping_status: SCRAPING_STATUS_ENUM.USER });
      select.value = SITE_ID_ENUM.USER;
      form.submit(); // redirects to shiftgen.com/member/multi_site_schedule
    } else if (scrapingStatus === SCRAPING_STATUS_ENUM.USER) {
      await chrome.storage.local.set({ scraping_status: SCRAPING_STATUS_ENUM.DOCTOR }); 
      select.value = SITE_ID_ENUM.DOCTOR;
      form.submit(); // redirects to shiftgen.com
    } else if (scrapingStatus === SCRAPING_STATUS_ENUM.DOCTOR) {
      await chrome.storage.local.set({ scraping_status: SCRAPING_STATUS_ENUM.PA });
      select.value = SITE_ID_ENUM.PA;
      form.submit(); // redirects to shiftgen.com
    } else if (scrapingStatus === SCRAPING_STATUS_ENUM.PA) {
      await chrome.storage.local.set({
        scraping_status: SCRAPING_STATUS_ENUM.INACTIVE,
        redirect_to_print_page: false,
      });
      await new Promise(r => setTimeout(r, 10)); // wait for storage to set correctly
      alert("Done scraping shifts. Navigate to ShiftGen Popup to export to Google Calendar!")
    }
  }
}