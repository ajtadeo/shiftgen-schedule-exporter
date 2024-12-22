import { PROVIDER_ENUM } from "./content-scripts/scrape"

class WorkDay {
  constructor(start_datetime, end_datetime, location, name, overnight = false) {
    this.start_datetime = start_datetime;
    this.end_datetime = end_datetime;
    this.location = location;
    this.overnight = overnight;
    this.name = name;
    this.provider_type = -1;
    this.provider_name = "FIX ME";
  }

  set_provider(provider_name, provider_type) {
    this.provider_name = provider_name;
    this.provider_type = provider_type;
  }

  add_to_calendar() {
    // TODO: use google calendar api to create events
    // TODO: catch overnight shifts here
  }

  print() {
    let prefix = "";
    if (this.provider_type === PROVIDER_ENUM.DOC_PROVIDER) {
      prefix = "DR ";
    } else if (this.provider_type === PROVIDER_ENUM.PA_NP_PROVIDER) {
      prefix = "PA/NP ";
    }

    console.log(`${prefix}${this.provider_name}`);
    console.log(this.location);
    console.log(this.start_datetime.toISOString());
    console.log(this.end_datetime.toISOString());
    console.log();
  }
}

