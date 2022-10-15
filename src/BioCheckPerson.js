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
    let canUseThis = this.initPerson(profileObj, requestedId);
    if (canUseThis) {
      if (this.person.privacyLevel < this.MIN_PRIVACY) {
        if (userId === 0) {            // user not logged in
          canUseThis = false;
        }
      }
      if ((mustBeOpen) && (this.person.privacyLevel < this.OPEN_PRIVACY)) {
        canUseThis = false;
      }
      if (!canUseThis) {
        this.person.uncheckedDueToPrivacy = true;
        if (this.verbose) {
          console.log("  Cannot test profile " + this.person.profileId + 
                      " with Privacy " + this.person.privacyLevel);
        }
      } else {
        // check for birth/death date before 1500
        if ((ignorePre1500) && (this.isPersonPre1500())) {
          canUseThis = false;
          this.person.uncheckedDueToDate = true;
        }
      }
    } 
    return canUseThis;
  }

  /**
   * Does this person have a bio
   * @return true if person has bio
   */
  hasBio() {
    return this.person.hasBio;
  }
  /**
   * Get bio string for this person
   * @return bio string
   */
  getBio() {
    return this.person.bio;
  }
  /**
   * Clear bio for this person
   * to allow for garbage collection
   */
  clearBio() {
    this.person.bio = "";
  }
  /**
   * Does this person have a name field?
   * @return true if person has name
   */
  hasName() {
    return this.person.hasName;
  }
  /**
   * Get wikiTreeId for the person
   * @return wikiTreeId
   */
  getWikiTreeId() {
    return this.person.wikiTreeId;
  }
  /**
   * Get profileId for the person
   * @return profileId 
   */
  getProfileId() {
    return this.person.profileId;
  }
  /**
   * Get requested profile for the person
   * This may differ from the profile id on a redirect
   * @return requestedProfileId 
   */
  getRequestedProfileId() {
    return this.person.requestedProfileId;
  }
  /**
   * Get first name
   * @return first name
   */
  getFirstName() {
    return this.person.firstName;
  }
  /**
   * Get last name to report
   * @return last name to report
   */
  getLastName() {
    return this.person.lastName;
  }
  /**
   * Get name to report
   * @return string with first and last name
   */
  getReportName() {
    let reportName = this.getFirstName() + " " + this.getLastName();
    return reportName;
  }
  /**
   * Get manager Id for the person
   * @return manager Id
   */
  getManagerId() {
    return this.person.managerId;
  }
  /**
   * Get WikiTree link
   * @param wikiTreeId for the person
   * @return link to the WikiTree person
   */
  getWikiTreeLink() {
    const WIKI_TREE_URI = "https://www.wikitree.com/wiki/";
    return WIKI_TREE_URI  + this.person.wikiTreeId;
  }
  /**
   * Get the privacy
   * @return numeric privacy level
   */
  getPrivacy() {
    return this.person.privacyLevel;
  }
  /**
   * Get the privacy as a string to be displayed to the user
   * @return privacy string (i.e., the color)
   */
  getPrivacyString() {
    let privacyString = "";
    switch (this.person.privacyLevel) {
      case 0:           // Not returned by API
        privacyString = "Unknown";
      break;
      case 10:           // Unlisted
        privacyString = "Black";
      break;
      case 20:           // Private
        privacyString = "Red";
      break;
      case 30:           // Private, Public Bio
        privacyString = "Orange";
      break;
      case 35:           // Private, Public Tree
        privacyString = "Light Orange";
      break;
      case 40:          // Private, Public Bio & Tree
        privacyString = "Yellow";
      break;
      case 50:         // Public
        privacyString = "Green";
      break;
      case 60:         // Open
        privacyString = " ";
      break;
    }
    return privacyString;
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
