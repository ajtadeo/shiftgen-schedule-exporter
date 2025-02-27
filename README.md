# shiftgen-calendar
Chrome extension to export shifts from ShiftGen to Google Calendar

## Usage
1. Login to [https://shiftgen.com](https://shiftgen.com) and navigate to `Schedules > All Schedules`

![Open All Schedules](./images/open_all_schedules.png)

2. For the month you want to create events for, select `My Schedule Only` under `Shifts to Print`, then click `Create Print Version`

![Set print options and create print version](./images/create_print_version.png)

3. In the extension popup, click `Scrape My Schedule`

## Automated Scraping Process
1. Submit POST request to change site
```html
<form action="/member/change_selected_site" id="site_change_form" method="post">
   <select id="site_id" name="site_id"><option value="83">CHOC Scribe</option>
   <option value="84">St Joseph/CHOC MLP</option>
   <option value="80" selected="selected">St Joseph/CHOC Physician</option></select>
</form>
```
1. Go to [https://www.shiftgen.com/member/schedule](https://www.shiftgen.com/member/schedule)
2. Find table with thead containing the selected Month
3. Click the print button
```html
<input class="btn" id="schedule_submit" name="commit" type="submit" value="Create Print Version">
```
4. Scrape page