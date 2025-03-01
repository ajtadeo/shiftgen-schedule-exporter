window.onload = async function () {
  // load calendar id value
  let localStorage = await chrome.storage.local.get(["calendar_id", "user_shifts_set", "pa_shifts_set", "doctor_shifts_set", "shifts", "target_month"]);
  
  // populate shifts table
  let shifts = localStorage.shifts;
  const tbody = document.querySelector("#shift-tbody");
  const template = document.querySelector("#shift-template");
  for (const [key, value] of Object.entries(shifts)) {
    const clone = template.content.cloneNode(true);
    clone.querySelector(".shift-start").textContent = value.startDateTime;
    clone.querySelector(".shift-end").textContent = value.endDateTime;
    clone.querySelector(".shift-location").textContent = value.location;
    clone.querySelector(".shift-provider-name").textContent = value.providerName;

    let providerType;
    if (value.providerType === PROVIDER_ENUM.DOCTOR) {
      providerType = "Doctor"
    } else if (value.providerType === PROVIDER_ENUM.PA) {
      providerType = "PA"
    } else if (value.providerType === PROVIDER_ENUM.UNKNOWN) {
      providerType = "Unknown"
    } else {
      providerType = "Invalid Type"
    }
    clone.querySelector(".shift-provider-type").textContent = providerType;
    clone.querySelector(".shift-overnight").textContent = value.overnight;
    tbody.appendChild(clone);
  }

  // handle calendar id form submission
  if (localStorage.calendar_id !== "") {
    document.querySelector("#calendar-id-input").value = localStorage.calendar_id;
  }
  document.querySelector("#calendar-id-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const calendarId = document.getElementById("calendar-id-input").value;
  
    await chrome.storage.local.set({ "calendar_id": calendarId }, function() {
      if (chrome.runtime.lastError) {
        document.querySelector("#calendar-id-message").textContent = "Error: " + chrome.runtime.lastError;
        console.error("Error saving to storage:", chrome.runtime.lastError);
      } else {
        document.querySelector("#calendar-id-button").disabled = true;
        // document.querySelector("#calendar-id-input").disabled = true;
        document.querySelector("#calendar-id-message").textContent = "Saved"
        console.log("Calendar ID saved:", calendarId);
      }
    });
  }); 
  
  // handle target month form submission
  if (localStorage.target_month !== "") {
    document.querySelector("#target-month-input").value = localStorage.target_month;
  }
  document.querySelector("#target-month-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const targetMonth = document.getElementById("target-month-input").value.toLowerCase();
  
    await chrome.storage.local.set({ "target_month": targetMonth }, function() {
      if (chrome.runtime.lastError) {
        document.querySelector("#target-month-message").textContent = "Error: " + chrome.runtime.lastError;
        console.error("Error saving to storage:", chrome.runtime.lastError);
      } else {
        document.querySelector("#target-month-button").disabled = true;
        document.querySelector("#target-month-message").textContent = "Saved"
        console.log("Target Month saved:", targetMonth);
      }
    });
  }); 
}