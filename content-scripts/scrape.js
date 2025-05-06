const patterns = {
  1: { pattern: /^(?!SJH)(?!PIT)(\w+)\s(\d{2}|\d{4})-(\d{2}|\d{4}):\s((?:\w|\*)+)$/, groupNames: ["location", "start_time_str", "end_time_str", "name"] }, // North 2130-0600: Physician
  2: { pattern: /^(\d{2}|\d{4})-(\d{2}|\d{4})\s\((\w+)\):\s((?:\w|\*)+)$/, groupNames: ["start_time_str", "end_time_str", "location", "name"] }, // 1700-0100 (RED): Axs
  3: { pattern: /^(\d{2}|\d{4})-(\d{2}|\d{4})\s(\w+):\s((?:\w|\*)+)$/, groupNames: ["start_time_str", "end_time_str", "location", "name"] } // 1900-0330 PA: Axs
};

let userShiftsDict = {}

class Shift {
  constructor(startTime, endTime, location, name, overnight = false) {
    this.startTime = startTime;                // epoch seconds (int)
    this.endTime = endTime;                    // epoch seconds (int)
    this.location = location;                  // string
    this.overnight = overnight;                // bool
    this.name = name;                          // string
    this.providerType = PROVIDER_ENUM.UNKNOWN; // int
    this.providerName = "";                    // string
  }

  set_provider(providerName, providerType) {
    this.providerName = providerName;
    this.providerType = providerType;
  }

  get_json() {
    return {
      "startTime": this.startTime,
      "endTime": this.endTime,
      "location": this.location,
      "overnight": this.overnight,
      "providerType": this.providerType,
      "providerName": this.providerName
    }
  }

  print() {
    let prefix = "";
    if (this.providerType === PROVIDER_ENUM.DOCTOR) {
      prefix = "DR ";
    } else if (this.providerType === PROVIDER_ENUM.PA) {
      prefix = "PA/NP ";
    }

    console.log(`${prefix}${this.providerName}`);
    console.log(this.location);
    console.log(this.startTime);
    console.log(this.endTime);
    console.log(" ");
  }
}

/**
 * Calculates the overlap in milliseconds between two shifts.
 * 
 * @param {Shift} shift Provider shift
 * @param {Shift} userShift User's shift
 * 
 * @returns Length in milliseconds of the overlap. 0 if no overlap exists
 */
function getOverlap(shift, userShift) {

  let overlapStart = Math.max(userShift.startTime, shift.startTime);
  let overlapEnd = Math.min(userShift.endTime, shift.endTime);
  let overlapLength = Math.max(0, overlapEnd - overlapStart);

  return overlapLength;
}

/**
 * Parses an event in the ShiftGen printout calendar into a Shift object
 * @param {Node} elem HTML Node to parse
 * @param {String} month Target month
 * @param {String} year Target year
 * @returns A Shift object
 */
function parseEvent(elem, month, year) {
  const dayElement = document.evaluate(
    "./preceding-sibling::div[1]",
    elem, // root node
    null, // context node's namespace resolver
    XPathResult.FIRST_ORDERED_NODE_TYPE, // result type
    null // result object (not needed here)
  ).singleNodeValue;
  const day = dayElement.textContent;

  let info = {};
  let match = null;
  for (const [key, { pattern, groupNames }] of Object.entries(patterns)) {
    match = elem.textContent.match(pattern);
    if (match) {
      // populate info with match info
      // console.log("Got match:", match[0])
      info = groupNames.reduce((acc, name, i) => {
        acc[name] = match[i + 1];
        return acc;
      }, {});
      break;
    }
  }

  if (match === null) {
    // console.log("Event does not match:", elem.textContent);
    return undefined;
  }

  if (info["end_time_str"].length === 2) {
    info["end_time_str"] += "00";
  }

  if (info["start_time_str"].length === 2) {
    info["start_time_str"] += "00";
  }

  // edge case for 2400
  if (info["end_time_str"] === "2400") {
    info["end_time_str"] = "2359";
  }
  if (info["start_time_str"] === "2400") {
    info["start_time_str"] = "2359";
  }

  // get month
  const monthNumber = new Date(`${month} ${day}, ${year}`).getMonth();
  const startTime = new Date(
    parseInt(year),
    monthNumber,
    parseInt(day),
    parseInt(info["start_time_str"].slice(0, 2)),
    parseInt(info["start_time_str"].slice(2)),
    0
  );
  const endDateTime = new Date(
    parseInt(year),
    monthNumber,
    parseInt(day),
    parseInt(info["end_time_str"].slice(0, 2)),
    parseInt(info["end_time_str"].slice(2)),
    0
  );

  // edge case for overnight shifts
  let overnight = false;
  if (parseInt(info["end_time_str"].slice(0, 2)) < parseInt(info["start_time_str"].slice(0, 2))) {
    overnight = true;
    endDateTime.setDate(endDateTime.getDate() + 1)
  }

  // rename provider names
  if (info["name"] === "SAINTGEORGES") {
    info["name"] = "MSG";
  }

  if (info["name"] === "NISHIOKA") {
    info["name"] = "NISH";
  }

  return new Shift(
    startTime.getTime(),
    endDateTime.getTime(),
    info["location"].trim().toUpperCase(),
    info["name"].trim(),
    overnight
  );
}

/**
 * Scrapes the user's ShiftGen printout calendar
 * @returns Array of Shift objects
 */
function scrapeUser() {
  // get month and year
  const monthYearElement = document.querySelector("div:first-of-type > div:first-of-type");
  const match = monthYearElement.textContent.match(/(\w+)\s(\d{4})/);
  const month = match[1];
  const year = match[2];

  // get all shift elements
  const elements = document.querySelectorAll("td > span");

  // parse shift elements
  let shifts = [];
  for (const elem of elements) {
    const shift = parseEvent(elem, month, year);
    if (shift !== undefined) {
      shifts.push(shift);
    }
  }

  return shifts;
}

/**
 * Scrapes a Doctor's ShiftGen printout calendar
 * 
 * @param {Object} localStorage Chrome local storage object containing the "shifts" key
 * 
 * @returns Array of provider shifts scraped from the page, and the local storage
 * object updated with provider information.
 */
function scrapeDoctor(localStorage) {
  // get month and year
  const monthYearElement = document.querySelector("div:first-of-type > div:first-of-type");
  const match = monthYearElement.textContent.match(/(\w+)\s(\d{4})/);
  const month = match[1];
  const year = match[2];

  // get and parse all shift elements
  const elements = document.querySelectorAll("td > span");
  let shifts = [];
  for (const elem of elements) {
    const shift = parseEvent(elem, month, year);
    if (shift !== undefined) {
      shifts.push(shift);
    }
  }

  const userShifts = Object.values(localStorage["shifts"])

  // find overlapping user shifts
  for (const userShift of userShifts) {

    // don't find overlaps for shifts that have already been claimed
    if (userShift.providerName !== "") {
      continue;
    }

    let maxOverlap = 0;
    let maxOverlapShift = undefined;

    for (const shift of shifts) {
      // doctor shifts occur in the same location as the user
      if (userShift.location === shift.location) {
        let overlap = getOverlap(userShift, shift)
        if (overlap > maxOverlap) {
          console.log(overlap, shift)
          maxOverlap = overlap;
          maxOverlapShift = shift;
        }
      }
    }

    if (maxOverlapShift !== undefined) {
      localStorage["shifts"][userShift.startTime]["providerName"] = maxOverlapShift.name;
      localStorage["shifts"][userShift.startTime]["providerType"] = PROVIDER_ENUM.DOCTOR;
    }
  }

  return localStorage;
}

/**
 * Scrapes a PA's ShiftGen printout calendar
 * @param {Object} localStorage Chrome local storage object containing the "shifts" key
 * @returns Array of provider shifts scraped from the page, and the local storage
 * object updated with provider information.
 */
function scrapePA(localStorage) {
  // get month and year
  const monthYearElement = document.querySelector("div:first-of-type > div:first-of-type");
  const match = monthYearElement.textContent.match(/(\w+)\s(\d{4})/);
  const month = match[1];
  const year = match[2];

  // get and parse all shift elements
  const elements = document.querySelectorAll("td > span");
  let shifts = [];
  for (const elem of elements) {
    const shift = parseEvent(elem, month, year);
    if (shift !== undefined) {
      shifts.push(shift);
    }
  }

  const userShifts = Object.values(localStorage["shifts"])

  // find overlapping user shifts
  for (const userShift of userShifts) {

    // don't find overlaps for shifts that have already been claimed
    if (userShift.providerName !== "") {
      continue;
    }

    let maxOverlap = 0;
    let maxOverlapShift = undefined;

    for (const shift of shifts) {
      // PA shifts do not have a location
      let overlap = getOverlap(userShift, shift)
      if (overlap > maxOverlap) {
        console.log(overlap, shift)
        maxOverlap = overlap;
        maxOverlapShift = shift;
      }
    }

    if (maxOverlapShift !== undefined) {
      localStorage["shifts"][userShift.startTime]["location"] = "PA";
      localStorage["shifts"][userShift.startTime]["providerName"] = maxOverlapShift.name;
      localStorage["shifts"][userShift.startTime]["providerType"] = PROVIDER_ENUM.PA;
    }
  }

  return localStorage;
}

// TODO: maybe sort shifts by time to be more optimized?
// sort by start time
// sortedUserShifts.sort((a, b) => {
//   let aStart = new Date(a.startTime);
//   let bStart = new Date(b.startTime)
//   if (aStart < bStart) {
//     return -1;
//   } else if (aStart === bStart) {
//     return 0;
//   } else if (aStart > bStart) {
//     return 1;
//   }
// })