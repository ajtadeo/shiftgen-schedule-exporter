# shiftgen-calendar
Chrome extension to export shifts from ShiftGen to Google Calendar

## Usage
1. Login to [https://shiftgen.com](https://shiftgen.com) and navigate to `Schedules > All Schedules`

![Open All Schedules](./images/open_all_schedules.png)

2. For the month you want to create events for, select `My Schedule Only` under `Shifts to Print`, then click `Create Print Version`

![Set print options and create print version](./images/create_print_version.png)

3. In the extension popup, click `Scrape My Schedule`

## Automated Scraping Process
1. Click "Scrape" button in popup, sets scraping flag to true
2. popup opens a new tab at [https://www.shiftgen.com/member/schedule](https://www.shiftgen.com/member/schedule), and saves TAB_ID
3. Submit POST request to change site to USER
```html
<form action="/member/change_selected_site" id="site_change_form" method="post">
   <select id="site_id" name="site_id"><option value="83">CHOC Scribe</option>
   <option value="84">St Joseph/CHOC MLP</option>
   <option value="80" selected="selected">St Joseph/CHOC Physician</option></select>
</form>
```
4. Page redirects to [https://www.shiftgen.com/member/multi_site_schedule](https://www.shiftgen.com/member/multi_site_schedule)
5. In content scripts for [https://www.shiftgen.com/member/multi_site_schedule](https://www.shiftgen.com/member/multi_site_schedule), check scraping flag and if true redirect to [https://www.shiftgen.com/member/schedule](https://www.shiftgen.com/member/schedule)
6. Find table with thead containing the selected Month, set "My Schedule Only" input to true, and click "Create Print Version"
```html
<div class="col-md-6">
  <form action="/member/schedule" method="post">
    <input id="_id" name="[id]" type="hidden" value="14544">
    <table class="schedule" cellpadding="0">
      <thead>
        <tr>
          <th colspan="2" class="text-left">
            <h2><a href="/member/schedule/14544">March 2025 - CHOC</a></h2>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <label for="start_date_14544" class="dimmed">Starting</label>
            <input class="input-lg col-md-11" id="start_date_14544" name="start_date_14544" type="text" value="March 01, 2025"> <img alt="Calendar" class="calendar_date_select_popup_icon" onclick="new CalendarDateSelect( $(this).previous(), {embedded:false, year_range:[2024, 2026]} );" src="/images/calendar_date_select/calendar.gif?1597158197" style="border:0px; cursor:pointer;">
          </td>
          <td>
            <label for="end_date_14544" class="dimmed">Ending</label>
            <input class="input-lg col-md-11" id="end_date_14544" name="end_date_14544" type="text" value="March 31, 2025"> <img alt="Calendar" class="calendar_date_select_popup_icon" onclick="new CalendarDateSelect( $(this).previous(), {embedded:false, year_range:[2024, 2026]} );" src="/images/calendar_date_select/calendar.gif?1597158197" style="border:0px; cursor:pointer;">
          </td>
        </tr>
        <tr>
          <td width="230">
            <p class="dimmed">Shifts to Print</p>
            <ul class="unstyled">
              <li>
                <label><input type="checkbox" name="print_only_my_schedule"> My Schedule Only</label>
              </li>
              <li>
                <label><input type="checkbox" name="shift_groups[]" value="214" checked=""> Scribe</label>
              </li>
            </ul>
          </td>
          <td>
            <p class="dimmed">Edit</p>
            <ul>
              <li><a href="/member/record_overtime_for_schedule?schedule_id=14544&amp;worker_id=18642">Modify Hours Worked</a></li>
            </ul>
          </td>
        </tr>
        <tr>
          <td class="text-right" colspan="2">
            <br>
            <input class="btn" id="schedule_submit" name="commit" type="submit" value="Create Print Version">
          </td>
        </tr>
      </tbody>
    </table>
  </form>
</div>
```

7. Page redirects to USER print view
8. Scrape page, then redirect to [https://www.shiftgen.com/member/schedule](https://www.shiftgen.com/member/schedule)