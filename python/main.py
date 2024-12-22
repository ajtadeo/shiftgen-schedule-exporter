from datetime import datetime, timedelta
import os
import re
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By

from WorkDay import WorkDay, DOC_PROVIDER, PA_NP_PROVIDER

patterns = {
    1: (r"(\w+)\s(\d{2}|\d{4})-(\d{2}|\d{4}):\s((?:\w|\*)+)", ["location", "start_time_str", "end_time_str", "name"]),      # North 2130-0600: Axs
    2: (r"(\d{2}|\d{4})-(\d{2}|\d{4})\s\((\w+)\):\s((?:\w|\*)+)", ["start_time_str", "end_time_str", "location", "name"]),  # 1700-0100 (RED): Axs
    3: (r"(\d{2}|\d{4})-(\d{2}|\d{4})\s(\w+):\s((?:\w|\*)+)", ["start_time_str", "end_time_str", "location", "name"])       # 1900-0330 PA: Axs
}

def parse_event(elem, month, year):
  day_element = elem.find_element(By.XPATH, "./preceding-sibling::div[1]")
  day = day_element.text
  
  pattern_key = 0
  for key, (pattern, group_names) in patterns.items():
    pattern_key = key
    match = re.search(pattern, elem.text)
    if match:
      info = {name: match.group(i) for i, name in enumerate(group_names, start=1)}
      break
  
  if pattern_key == 0:
    print("Event does not match.")
    print(elem.text)
    return
  
  if len(info["end_time_str"]) == 2:
    info["end_time_str"] = info["end_time_str"] + "00"
    
  if len(info["start_time_str"]) == 2:
    info["start_time_str"] = info["start_time_str"] + "00"
            
  # datetime bullshit
  # edge case for 2400
  if info["end_time_str"] == "2400":
    info["end_time_str"] = "2359"
  if info["start_time_str"] == "2400":
    info["start_time_str"] = "2359"
    
  start_time = datetime.strptime(info["start_time_str"], "%H%M").time()
  end_time = datetime.strptime(info["end_time_str"], "%H%M").time()
  month_number = datetime.strptime(month, "%B").month
  date = datetime(int(year), month_number, int(day))
  
  start_datetime = datetime.combine(date, start_time)
  end_datetime = datetime.combine(date, end_time)
  
  # edge case for overnight shifts
  overnight = False
  if end_time < start_time:
    overnight = True
    end_datetime = end_datetime + timedelta(days=1)

  return WorkDay(
    start_datetime,
    end_datetime,
    info["location"],
    info["name"],
    overnight
  )

def scrape(driver, filename, provider_type=None, axs_workdays_dict=None):
  if axs_workdays_dict is None:
    return scrape_axs(driver, filename)
  else:
    return scrape_doc_pa(driver, filename, provider_type, axs_workdays_dict)

def scrape_axs(driver, filename):
  try:
    driver.get(filename)
  except Exception as e:
    print("Problem opening file.")
    print(e)
    return
  
  # get month and year
  # October 2024 - CHOC (10/01/2024 - 10/31/2024) Print Date: 09/18/2024
  month_year_element = driver.find_element(By.XPATH, "//div[1]/div[1]")
  match = re.search("(\w+)\s(\d{4})", month_year_element.text)
  month = match.group(1)
  year = match.group(2)
  
  # get all workday elements
  elements = driver.find_elements(By.CSS_SELECTOR, "td > span")
    
  # parse workday elements
  workdays = []
  workdays_dict = {}
  for elem in elements:
    wd = parse_event(elem, month, year)
    workdays_dict[wd.start_datetime] = wd
    workdays.append(wd)
    
  return workdays, workdays_dict

def scrape_doc_pa(driver, filename, provider_type, axs_workdays_dict):
  try:
    driver.get(filename)
  except Exception as e:
    print("Problem opening file.")
    print(e)
    return
  
  # get month and year
  # October 2024 - CHOC (10/01/2024 - 10/31/2024) Print Date: 09/18/2024
  month_year_element = driver.find_element(By.XPATH, "//div[1]/div[1]")
  match = re.search("(\w+)\s(\d{4})", month_year_element.text)
  month = match.group(1)
  year = match.group(2)
  
  # get all workday elements
  elements = driver.find_elements(By.CSS_SELECTOR, "td > span")
    
  # parse workday elements
  workdays = []
  for elem in elements:
    # start time always aligns with axs
    wd = parse_event(elem, month, year)
    axs_wd = axs_workdays_dict.get(wd.start_datetime, None)
    if axs_wd is not None and axs_wd.location == wd.location:
      # print(axs_wd.location)
      # print(wd.location)
      # print("overlap found")
      workdays.append(wd)
      axs_wd.set_provider(wd.name, provider_type)
      
  return workdays

def main():
  # scrape axs.html to get work days
  PROJECT_ROOT_PATH = os.path.dirname(os.path.abspath(__file__))
  options = Options()
  options.add_argument("--headless")
  driver = webdriver.Firefox(options=options)
  axs_workdays, axs_workdays_dict = scrape(driver, f"file://{PROJECT_ROOT_PATH}/calendars/axs.html")
  doc_workdays = scrape(driver, f"file://{PROJECT_ROOT_PATH}/calendars/doc.html", DOC_PROVIDER, axs_workdays_dict)
  pa_workdays = scrape(driver, f"file://{PROJECT_ROOT_PATH}/calendars/pa.html", PA_NP_PROVIDER, axs_workdays_dict)
  driver.quit()
  
  print(F"======== {len(axs_workdays)} AXS ========")
  for wd in axs_workdays:
    wd.print()
  print()
  
  # print(f"======== {len(doc_workdays)} DOCTORS ========")
  # for wd in doc_workdays:
  #   wd.print()
  # print()
  
  # print(f"======== {len(pa_workdays)} PA/NP ========")
  # for wd in pa_workdays:
  #   wd.print()
  # print()
  
  
main()