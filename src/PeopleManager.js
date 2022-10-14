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
 * Manages a collection of WikiTree profiles
 * should be a singleton. 
e*/
export class PeopleManager {

  /*
   * keep all the persons who have not been checked
   * all the persons checked, sourced, but with style issues
   * all the persons checked, unsourced, marked
   * all the persons checked, possibly unsourced
   *
   * in other words, put in a person to check
   * if no issues with them, remove them, else
   * add their id to the applicable list
   *
   * not all lists are used, but might be in the future
   *
   * profileId is the unique id number
   * wikiTreeId is the wikitree id (e.g., LNAB-####)
   */

  wikiTreeIdToPersonIdMap = new Map();   // List of person id, accessed by name
  personMap = new Map();                 // list of profiles, accessed by person id
  allProfileIds = [];                    // all profile ids
  removedProfileIds = [];
  markedProfileIds = [];
  unmarkedProfileIds = [];
  styleProfileIds = [];
  redirectedProfileIds = new Set();
  duplicateProfileCount = 0;

  constructor() {
  }

  /**
   * Add person
   * @param thePerson the person object
   */
  addPerson(thePerson) {
    let profileId = thePerson.person.profileId;
    if (!this.personMap.has(profileId)) {
      this.personMap.set(profileId, thePerson);
      this.wikiTreeIdToPersonIdMap.set(thePerson.person.wikiTreeId, profileId);
      this.allProfileIds.push(profileId);
    }
    // Keep track of redirected profiles
    if ((thePerson.person.requestedProfileId > 0) && 
        (thePerson.person.requestedProfileId != thePerson.person.profileId)) {
      this.redirectedProfileIds.add(thePerson.person.requestedProfileId);
    }
  }

  /**
   * Has the person already been processed?
   * @return true if person has already been processed
   */
  hasPerson(profileId) {
    if ((this.personMap.has(profileId)) || (this.redirectedProfileIds.has(profileId))) {
      this.duplicateProfileCount++;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Get count of duplicate profiles ignored
   */
  getDuplicateProfileCount() {
    return this.duplicateProfileCount;
  }

  /**
   * Remove profile
   * Don't do this or you double check when iterating relatives
   * side effect set person null so it can be garbage collected
   *
   * TODO
   * Can you figure out a way around this to allow some garbage collection?
   */
  removeProfile(profileId) {
    let person = this.personMap.get(profileId);
    person = null;  // force code not to execute
    if (person != null) {
      // this.wikiTreeIdToPersonIdMap.delete(person.wikiTreeId);
      // person = null;                 // allow gc
      // this.personMap.delete(profileId);
      // this.removedProfileIds.push(profileId);
    }
  }

  /**
   * Add to list of profiles with style issues
   * @param profileId profile to add
   */
  setProfileStyle(profileId) {
    this.styleProfileIds.push(profileId);
  }
  /**
   * Add to list of profiles marked unsourced
   * @param profileId profile to add
   */
  setProfileMarked(profileId) {
    this.markedProfileIds.push(profileId);
  }
  setProfileUnmarked(profileId) {
  /**
   * Add to list of profiles maybe unsourced, not marked
   * @param profileId profile to add
   */
    this.unmarkedProfileIds.push(profileId);
  }

  /* 
   * Get the list of the profiles held by the manager
   * in alphabetical order
   * @return array of wikiTreeID
   */
  getProfileNames() {
    let profileNames = [];
    let m = this.wikiTreeIdToPersonIdMap;
    for (let profileName of m.keys()) {
      profileNames.push(profileName);
    }
    profileNames.sort();
    return profileNames;
  }

}
