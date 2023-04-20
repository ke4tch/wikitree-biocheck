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

import { PersonDate } from "./PersonDate.js";
/**
 * Contains information about a WikiTree Profile.
 * Only contains a subset of the complete set of data available.
 * profileId is the unique id number;
 * wikiTreeId is the wikitree id (e.g., LNAB-####)
 * @extends PersonDate
 */
export class Person extends PersonDate {
  person = {
    profileId: 0,
    wikiTreeId: "",
    managerId: 0,
    firstName: "", // name for reporting
    lastName: "", // name for reporting if there is current use that else LNAB
    hasBio: false,
    bio: "",
    requestedProfileId: 0,
    verbose: false,
    hasName: false,
    privacyLevel: 0,
  };

  /**
   * constructor
   */
  constructor() {
    super();
  }

  /**
   * Set verbose logging
   * @param {Boolean} isVerbose true for logging
   */
  setVerbose(isVerbose) {
    this.verbose = isVerbose;
  }

  /**
   * Initialize person
   * @param {Object} profileObj containing the profile as returned from WikiTree APIs
   * @param {String} requestedId the Id used for getPerson
   * @returns {Boolean} true if profile has minimum set of information to be processed
   * such as a name (aka wikiTreeId)
   */
  initPerson(profileObj, requestedId) {
    this.init(profileObj); // initialize dates
    let canUseThis = true;
    this.person.profileId = profileObj.Id;
    this.requestedProfileId = requestedId;
    this.person.firstName = "";
    this.person.lastName = "";
    this.person.bio = "";
    // Even if something returned, we can't process it without a Name
    if (profileObj.Name != null) {
      this.person.wikiTreeId = profileObj.Name;
      this.person.hasName = true;
      if (profileObj.Manager != null) {
        this.person.managerId = profileObj.Manager;
      }
      if (profileObj.Privacy != null) {
        this.person.privacyLevel = profileObj.Privacy;
      }
      if (profileObj.bio != null) {
        this.person.bio = profileObj.bio;
        this.person.hasBio = true;
        // TODO this is a HACK 
        // to see if resolveRedirect was not honored by the API
        // look for a bio content that starts with 
        // and if so set hasBio false to force a call to the getBio API
        if (profileObj.bio.startsWith('#REDIRECT')) {
          this.person.hasBio = false;
        }
      }
      if (profileObj.FirstName != null) {
        this.person.firstName = profileObj.FirstName;
      } else {
        if (profileObj.RealName != null) {
          this.person.firstName = profileObj.RealName;
        }
      }
      if (profileObj.LastNameCurrent != null) {
        this.person.lastName = profileObj.LastNameCurrent;
      } else {
        if (profileObj.LastNameAtBirth != null) {
          this.person.lastName = profileObj.LastNameAtBirth;
        }
      }
    } else {
      // this might be a living person or a deleted account or a space page
      if (this.verbose) {
        console.log("  Cannot test profile " + this.person.profileId + " does not have Name");
      }
      canUseThis = false;
    }
    return canUseThis;
  }

  /**
   * Does this person have a bio
   * @returns {Boolean} true if person has bio
   */
  hasBio() {
    return this.person.hasBio;
  }
  /**
   * Get bio string for this person
   * @returns {String} bio string
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
   * @returns {Boolean} true if person has name
   */
  hasName() {
    return this.person.hasName;
  }
  /**
   * Get wikiTreeId for the person
   * @returns {String} wikiTreeId (e.g., Doe-100)
   */
  getWikiTreeId() {
    return this.person.wikiTreeId;
  }
  /**
   * Get profileId for the person
   * @returns {String} profileId (e.g., 12345678)
   */
  getProfileId() {
    return this.person.profileId;
  }
  /**
   * Get requested profile for the person
   * This may differ from the profile id on a redirect
   * @returns {String} requestedProfileId
   */
  getRequestedProfileId() {
    return this.person.requestedProfileId;
  }
  /**
   * Get first name
   * @returns {String} first name
   */
  getFirstName() {
    return this.person.firstName;
  }
  /**
   * Get last name to report
   * @returns {String} last name to report - lastNameCurrent if available
   * else lastNameAtBirth
   */
  getLastName() {
    return this.person.lastName;
  }
  /**
   * Get name to report
   * @returns {String} string with first and last name
   */
  getReportName() {
    let reportName = this.getFirstName() + " " + this.getLastName();
    return reportName;
  }
  /**
   * Get manager Id for the person
   * @returns {String} manager Id
   */
  getManagerId() {
    return this.person.managerId;
  }
  /**
   * Get WikiTree link
   * @returns {String} link to the WikiTree person
   */
  getWikiTreeLink() {
    const WIKI_TREE_URI = "https://www.wikitree.com/wiki/";
    return WIKI_TREE_URI + this.person.wikiTreeId;
  }
  /**
   * Get the privacy
   * @returns {Number} numeric privacy level
   */
  getPrivacy() {
    return this.person.privacyLevel;
  }
  /**
   * Get the privacy as a string to be displayed to the user
   * @returns {String} privacy string (i.e., the color)
   */
  getPrivacyString() {
    let privacyString = "";
    switch (this.person.privacyLevel) {
      case 0: // Not returned by API
        privacyString = "Unknown";
        break;
      case 10: // Unlisted
        privacyString = "Black";
        break;
      case 20: // Private
        privacyString = "Red";
        break;
      case 30: // Private, Public Bio
        privacyString = "Orange";
        break;
      case 35: // Private, Public Tree
        privacyString = "Light Orange";
        break;
      case 40: // Private, Public Bio & Tree
        privacyString = "Yellow";
        break;
      case 50: // Public
        privacyString = "Green";
        break;
      case 60: // Open
        privacyString = " ";
        break;
    }
    return privacyString;
  }
}
