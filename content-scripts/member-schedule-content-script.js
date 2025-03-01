window.onload = async function () {
  let localStorage = await chrome.storage.local.get(["scraping_status", "target_month"]);
  let scrapingStatus = localStorage.scraping_status;
  let targetMonth = localStorage.target_month

  if (scrapingStatus !== SCRAPING_STATUS_ENUM.INACTIVE) {
    // get all forms associated with the target month
    let forms = document.querySelectorAll("form[action='/member/schedule']");
    let targetForms = [];
    for (let i = 0; i < forms.length; i++) {
      let thead = forms[i].querySelector("thead");
      let text = thead.textContent.toLowerCase();
      if (text.includes(targetMonth)) {
        targetForms.push(forms[i]);
      }
    }

    for (let i = 0; i < targetForms.length; i++) {
      if (scrapingStatus === SCRAPING_STATUS_ENUM.USER) {
        targetForms[i].querySelector("input[name='print_only_my_schedule']").checked = true;
      }
      targetForms[i].setAttribute("target", "_blank"); // open result of form in new tab
      targetForms[i].submit();
    }

    // redirect to change multi site id
    // TODO: wait to check status before redirecting? scripts may not be done yet
    await new Promise(r => setTimeout(r, 10)); // wait for storage to set correctly
    window.location.href = "https://www.shiftgen.com/member/multi_site_schedule";
    
  }
}