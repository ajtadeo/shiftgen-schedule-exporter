/**
 * @file shift.js
 * @brief Shift class for storing data about user and provider shifts.
 */

/**
 * @class Shift
 */
class Shift {
  /**
   * @brief Constructor for Shift class
   * 
   * @param {number} startTime Shift start time in epoch milliseconds
   * @param {number} endTime Shift end time in epoch milliseconds
   * @param {string} location Shift location
   * @param {string} name Shift owner name
   * @param {boolean} overnight Overnight flag, true if overnight else false. Default is false.
   */
  constructor(startTime, endTime, location, name, overnight = false) {
    this.startTime = startTime;                // epoch seconds (int)
    this.endTime = endTime;                    // epoch seconds (int)
    this.location = location;                  // string
    this.overnight = overnight;                // bool
    this.name = name;                          // string
    this.providerType = PROVIDER_ENUM.UNKNOWN; // int
    this.providerName = "";                    // string
  }

  /**
   * @brief Gets shift data as a JSON object for storage in local storage.
   * 
   * @returns Shift data as a JSON object
   */
  getJSON() {
    return {
      "startTime": this.startTime,
      "endTime": this.endTime,
      "location": this.location,
      "overnight": this.overnight,
      "providerType": this.providerType,
      "providerName": this.providerName
    }
  }

  /**
   * @brief Prints shift data. Useful for debugging.
   */
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