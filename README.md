# ShiftGen Schedule Exporter
Chrome extension to assist medical staff in exporting schedule with extra information about the provider on staff from ShiftGen to Google Calendar.

## Installation
Since this Chrome extension is still in development, users must install this extension through the extension developer mode by cloning the repository and loading the unpacked extension in [chrome://extensions/](chrome://extensions/). Current implementation with the Google Calendar API is currently limited to test users.

![Installation](public/images/installation.png)

## Usage

To use this extension, first open the extension's popup and configure the settings.

* Target Month: The month to be processed
* Target Year: The year to be processed
* Calendar ID: The Google Calendar ID where the processed shifts will be exported to. To find this value, navigate to the settings page of your Google Calendar, navigate to the "Integrate calendar" subsection, and copy "Calendar ID" value into the extension popup.

<div style="text-align:center">
  <img src="public/images/configure_settings.png" alt="Configure settings" width="600" >
</div>

After the settings have been configured, login to [https://shiftgen.com](https://shiftgen.com) and click "Scrape ShiftGen Schedule" to gather all shift data and provider information. This process will open new tabs in your browser as the extension navigates to different pages within ShiftGen. When you get a notification saying "Completed scraping shifts" the processing is complete and you may close any open ShiftGen tabs. 

<div style="text-align:center">
  <img src="public/images/completed_notification.png" alt="Completed notification" width="600" >
</div>

Open the extension popup to examine the processed shift data. To export the data to Google Calendar, simply click the "Export to Google Calendar" button.

<div style="text-align:center">
  <img src="public/images/examine_shifts.png" alt="Examine shifts" width="600" >
</div>

## Workflow

<div style="text-align:center">
  <img src="public/images/workflow.png" alt="Scraping workflow" width="600" >
</div>