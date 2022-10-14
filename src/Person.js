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
import { PersonDate } from "./PersonDate.js"
export class Person extends PersonDate {

  person = {
    profileId: 0,
    wikiTreeId: "",
    managerId: 0,
    firstName: "",   // name for reporting
    lastName: "",   // name for reporting if there is current use that else LNAB
    hasBio: false,
    bio: "",
    requestedProfileId: 0,
    uncheckedDueToPrivacy: false,
    uncheckedDueToDate: false,
    verbose: false,
    hasName: false,
    privacyLevel: 0,
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

    this.init(profileObj);         // initialize dates

    // TODO checking privacy okay except for Privacy 30 Semiprivate bio
    // in this case getPerson/getProfile/etc do not return Name or Privacy
    // and do not return the bio. Notified team 12/17/20
    // this seems to be fixed as of 4/18/21
    // it might still be glitchy when the Privacy field is not returned
    let canUseThis = true;
    this.person.profileId = profileObj.Id;
    this.requestedProfileId = requestedId;
    // Even if something returned, we can't report it without a Name
    // Not all returned profile have bio (e.g., Watchlist)
    if (profileObj.Name != null) {
      this.person.wikiTreeId = profileObj.Name;
      this.person.hasName = true;
      if (profileObj.Manager != null) {
        this.person.managerId = profileObj.Manager;
      }
      if (profileObj.Privacy != null) {
        let privacyLevel = profileObj.Privacy;
        this.person.privacyLevel = privacyLevel;
        if (privacyLevel < this.MIN_PRIVACY) {
          if (userId === 0) {            // user not logged in
            canUseThis = false;
          }
        }
        if ((mustBeOpen) && (privacyLevel < this.OPEN_PRIVACY)) {
          canUseThis = false;
        }
        if ((this.verbose) && (!canUseThis)) {
          console.log("  Cannot test profile " + this.person.profileId + " with Privacy " + privacyLevel);
        }
      }
    } else {
      // this might be a living person or a deleted account
      if (this.verbose) {
        console.log("  Cannot test profile " + this.person.profileId + " does not have Name");
      }
      canUseThis = false;
    } 
    if (!canUseThis) {
      this.person.uncheckedDueToPrivacy = true;
    } else {
      if (profileObj.bio != null) {
       this.person.bio = profileObj.bio;
       this.person.hasBio = true;
      }
      if (profileObj.FirstName != null) {
        this.person.firstName = profileObj.FirstName;
      }
      if (profileObj.LastNameCurrent != null) {
        this.person.lastName = profileObj.LastNameCurrent;
      } else {
        if (profileObj.LastNameAtBirth != null) {
          this.person.lastName = profileObj.LastNameAtBirth;
        }
      }
      // check for birth/death date before 1500
      if ((ignorePre1500) && (this.isPersonPre1500())) {
        canUseThis = false;
        this.person.uncheckedDueToDate = true;
      }
    }
    return canUseThis;
  }

  /**
   * Does this profile have a name field?
   * @return true if profile has name
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

}
