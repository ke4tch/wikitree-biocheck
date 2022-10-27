/*
The MIT License (MIT)

Copyright (c) 2022 Kathryn J Knight

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
 * Contains information about a WikiTree Profile
 * only contains a subset of the complete set of data available
 */
import { Person } from "./Person.js"
export class BioCheckPerson extends Person {

  person = {
    uncheckedDueToPrivacy: false,
    uncheckedDueToDate: false,
  }

  MIN_PRIVACY = 40;
  OPEN_PRIVACY = 60;

  /**
   * constructor
   */
  constructor() {
    super();
  }

  /**
   * Set verbose logging
   * @param isVerbose true for logging
   */
  setVerbose(isVerbose) {
    this.verbose = isVerbose;
  }

  /**
   * Initialize person
   * @param profileObj containing the profile as returned from WikiTree APIs
   * @param mustBeOpen true if profile must be open privacy
   * @param ingorePre1500 true to ignore Pre1500 profiles
   * @param userId wikiTreeId of the person running the app
   * @param requestedId the Id used for getPerson 
   * @return true if it was possible to build a bio else false (e.g., living person)
   */
  build(profileObj, mustBeOpen, ignorePre1500, userId, requestedId) {
    //let canUse = this.initPerson(profileObj, requestedId);
    let canUse = this.initPerson(profileObj, requestedId);
    if (canUse) {
      if (this.person.privacyLevel < this.MIN_PRIVACY) {
        if (userId === 0) {            // user not logged in
          canUse = false;
        }
      }
      if ((mustBeOpen) && (this.person.privacyLevel < this.OPEN_PRIVACY)) {
        canUse = false;
      }
      if (!canUse) {
        this.person.uncheckedDueToPrivacy = true;
        if (this.verbose) {
          console.log("  Cannot test profile " + this.person.profileId + 
                      " with Privacy " + this.person.privacyLevel);
        }
      } else {
        // check for birth/death date before 1500
        if ((ignorePre1500) && (this.isPersonPre1500())) {
          canUse = false;
          this.person.uncheckedDueToDate = true;
        }
      }
    } 
    return canUse;
  }

  /**
   * Was profile not checked due to privacy
   * @return true if profile could not be checked due to privacy
   */
  isUncheckedDueToPrivacy() {
    return this.person.uncheckedDueToPrivacy;
  } 
  /**
   * Was profile not checked due to date
   * @return true if profile could not be checked due to date
   */
  isUncheckedDueToDate() {
    return this.person.uncheckedDueToDate;
  } 

}
