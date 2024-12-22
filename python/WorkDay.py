import datetime

DOC_PROVIDER = 1
PA_NP_PROVIDER = 2

class WorkDay:
  def __init__(self, start_datetime, end_datetime, location, name, overnight=False):
    self.start_datetime = start_datetime
    self.end_datetime = end_datetime
    self.location = location
    self.overnight = overnight
    self.name = name
    self.provider_type = -1
    self.provider_name = "FIX ME"
    
  def set_provider(self, provider_name, provider_type):
    self.provider_name = provider_name
    self.provider_type = provider_type
    
  def add_to_calendar(self):
    # TODO: use google calendar api to create events
    # TODO: catch overnight shifts here
    pass
  
  def print(self):
    if self.provider_type == DOC_PROVIDER:
      prefix = "DR "
    elif self.provider_type == PA_NP_PROVIDER:
      prefix = "PA/NP "
    else:
      prefix = ""
      
    print(f"{prefix}{self.provider_name}")
    print(self.location)
    print(self.start_datetime.strftime('%Y-%m-%dT%H:%M:%SZ'))
    print(self.end_datetime.strftime('%Y-%m-%dT%H:%M:%SZ'))
    print()