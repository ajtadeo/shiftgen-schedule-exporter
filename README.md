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

After the settings have been configured, login to [https://shiftgen.com](https://shiftgen.com) and click "Scrape ShiftGen Schedule" to gather all shift data and provider information. This process will open new tabs in your browser as the extension navigates to different pages within ShiftGen. When processing is complete, a badge will appear on the extension icon and a "Completed scraping shifts" message is displayed.

<div style="text-align:center">
  <img src="public/images/scraping_completed_badge.png" alt="Completed badge" width="200" >
</div>

<div style="text-align:center">
  <img src="public/images/examine_shifts.png" alt="Examine shifts" width="600" >
</div>

Open the extension popup to examine the processed shift data. To export the data to Google Calendar, simply click the "Export to Google Calendar" button. When exporting is complete, a badge will appear on the extension icon and a "Successfully exported shifts to Google Calendar!" message is displayed.

<div style="text-align:center">
  <img src="public/images/exporting_completed_badge.png" alt="Examine shifts" width="200" >
</div>

<div style="text-align:center">
  <img src="public/images/export_shifts.png" alt="Export shifts" width="600" >
</div>

## Workflow

![Scraping workflow](public/images/workflow.png)

## Testing

To run the unit tests, execute the following:

```sh
npm install # install node packages
npm test
```