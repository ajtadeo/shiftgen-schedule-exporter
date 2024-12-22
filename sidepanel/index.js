function displayContent() {
  document.querySelector("#oauth-button").style.display = "none";
  document.querySelector("#content").style.display = "block";
}

window.onload = function () {
  // set up scrape button 
  document.querySelector('#scrape-button').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (response) => {
        let logElem = document.querySelector("#log-message");
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          logElem.textContent = "Something went wrong :(";
          return;
        } else if (response.status === "success") {
          logElem.textContent = response.message;
        }
      });
    });
  });

  // set up sign in button
  document.querySelector("#oauth-button").addEventListener('click', function () {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }

      console.log("signed in")
      displayContent()
    });
  });

  // check that the user is signed in
  chrome.identity.getAuthToken({ interactive: false }, function (token) {
    if (!chrome.runtime.lastError) {
      // signed in
      console.log("already signed in")
      displayContent()
    }
  })
};

// async function main() {
//   const localStorage = await chrome.storage.local.get(["auth"]);
//   if (localStorage.auth === false) {
//     // need to authenticate

//   } else {
//     // already authenticated
//     document.querySelector("#content").style.display = "block";
//     document.querySelector("#auth").style.display = "none";
//   }
// }

// main();