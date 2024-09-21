/*
The MIT License (MIT)

Copyright (c) 2024 Kathryn J Knight

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * BioCheck Calendar Manager
 */
export class BioCheckCalendarManager {

  /*
  * Map of active challenges
  * key is challenge display name (including spaces)
  * value is array of challenge display date (including -)
  */
  activeChallengeMap = null;
  // Map of challenge request name to challenge display name
  // Map of challenge request date to challenge display date
  challengeNameMap = null;
  challengeDateMap = null;

  static WIKI_TREE_PLUS_CAL = "https://plus.wikitree.com/calendarExp.json?appId=bioCheck";
  constructor() {
  } 

  /**
   * Load the calendar data from WikiTree Plus.
   * This only needs to be done once, at initialization.
   */
  async load() {
    await this.#loadCalendar();
  }
  /*
  * Do the actual load separately so we can wait for this synchronously
  */
  async #loadCalendar() {
    try {
      const fetchResponse = await fetch(BioCheckCalendarManager.WIKI_TREE_PLUS_CAL);
      if (!fetchResponse.ok) {
        console.log("Error " + fetchResponse.status);
      } else {
        const jsonData = await fetchResponse.json();
        // map where the key is the challenge name
        // and the value is the array of challenge start date
        this.activeChallengeMap = new Map();
        // map to find display name from request name
        this.challengeNameMap = new Map();
        // map to find display date from request date
        this.challengeDateMap = new Map();
        // most recent user requested date for a challenge
        this.challengeUsedDateMap = new Map();

        for (let i = 0; i < jsonData.activeChallenges.length; i++) {
          if (jsonData.activeChallenges[i].tracking != undefined ) {
            let name = jsonData.activeChallenges[i].name;
            let date = jsonData.activeChallenges[i].startDate;
            let requestDate = date.replace(/-/g, "");
            if (this.activeChallengeMap.has(name)) {
              let dateArray = this.activeChallengeMap.get(name);
              dateArray.push(date);
              this.challengeDateMap.set(requestDate, date);
              this.challengeUsedDateMap.set(name, date);
            } else {
              let requestName = name.replace(/ /g, "");
              this.challengeNameMap.set(requestName, name);
              let dateArray = new Array();
              dateArray.push(date);
              this.activeChallengeMap.set(name, dateArray);
              this.challengeDateMap.set(requestDate, date);
              this.challengeUsedDateMap.set(name, date);
            }
          }
        }
      }
      return fetchResponse;
    } catch (e) {
      console.log('error ' + e);
    }
  }

  /*
   * return map of active challenges
   */
  getActiveChallenges() {
    return this.activeChallengeMap;
  }

  /*
   * Set the most recently user requested date
   */
  setChallengeUsedDate(displayName, displayDate) {
    this.challengeUsedDateMap.set(displayName, displayDate);
  }
  /*
   * Get the most recently user requested date
   * in display format
   */
  getChallengeUsedDate(displayName) {
    return this.challengeUsedDateMap.get(displayName);
  }

  /*
   * Get the name to display from the name to request
   */
  getChallengeDisplayName(requestName) {
    return this.challengeNameMap.get(requestName);
  }
  /*
   * Get the date to display from the date to request
   */
  getChallengeDisplayDate(requestDate) {
    return this.challengeDateMap.get(requestDate);
  }

  /*
   * Get the name to use for the request from the display name
   */
  getChallengeRequestName(displayName) {
    return displayName.replace(/ /g, "");
  }

  /*
   * Get the date to use for the request from the display name
   */
  getChallengeRequestDate(displayDate) {
    return displayDate.replace(/-/g, "");
  }

}
