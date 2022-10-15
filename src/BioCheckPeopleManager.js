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
 * Manages a collection of WikiTree profiles for BioCheck
 * should be a singleton. 
e*/
import { PeopleManager } from "./PeopleManager.js"
export class BioCheckPeopleManager extends PeopleManager {

  /*
   * keep all the persons who have not been checked
   * all the persons checked, sourced, but with style issues
   * all the persons checked, unsourced, marked
   * all the persons checked, possibly unsourced
   *
   * not all lists are used, but might be in the future
   *
   * profileId is the unique id number
   * wikiTreeId is the wikitree id (e.g., LNAB-####)
   */

  removedProfileIds = [];
  markedProfileIds = [];
  unmarkedProfileIds = [];
  styleProfileIds = [];

  constructor() {
    super();
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
    let id = this.personIdToWikiTreeIdMap.get(profileId);
    id = null;  // force code not to execute
    if (id != null) {
      // this.wikiTreeIdToPersonIdMap.delete(person.wikiTreeId);
      // person = null;                 // allow gc
      // this.personIdToWikiTreeIdMap.delete(profileId);
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
  /**
   * Get number of profiles marked unsourced
   * @return number of profiles marked unsourced
   */
  getMarkedProfileCount() {
    return this.markedProfileIds.length;
  }
  /**
   * Get all profiles IDs marked unsourced
   * @return array of profile Id
   */
  getMarkedProfileIds() {
    return this.markedProfileIds;
  }
  /**
   * Get number of profiles unmarked 
   * @return number of profiles not marked unsourced
   * that are possibly not sourced
   */
  getUnmarkedProfileCount() {
    return this.unmarkedProfileIds.length;
  }
  /**
   * Get all profiles IDs not marked unsourced
   * @return array of profile Id not marked unsourced
   * that are possibly not sourced
   */
  getUnmarkedProfileIds() {
    return this.unmarkedProfileIds;
  }
  /**
   * Get number of profiles with style issues
   * @return number of profiles with style issues
   */
  getStyleProfileCount() {
    return this.styleProfileIds.length;
  }
  /**
   * Get all profiles IDs with style issues
   * @return array of profile Id with style issues
   */
  getStyleProfileIds() {
    return this.styleProfileIds;
  }
}
