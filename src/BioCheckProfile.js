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
import { BioCheckPerson } from "./BioCheckPerson.js";
import { BioChecker } from "./BioChecker.js";
/**
 * Check biography for a profile, and optionally ancestors
 * @extends BioChecker
 */
export class BioCheckProfile extends BioChecker {

  static MAX_DEPTH = 10;
  static MAX_GENERATIONS = 20;

  /**
   * Constructor
   * @param {BioTestResults} theTestResults container for results 
   * @param {Object} userArgs what to do pushed from the Vue
   */
  constructor(theTestResults, theUserArgs) {
    super(theTestResults, theUserArgs);
  }

  /*
   * Use getPeople for various options, with the following exceptions
   *   - for more than 10 generations of ancestors, walk through the
   *     remaining generations of those 10 generations (until you hit max)
   *   - for degress (nuclear) check invalid only, build a collection of
   *     the invalid profiles then getPeople for those at 1 nuclear, then
   *     repeat this degrees times (until you hit max)
   *   - the GUI sets descendants max to 5, so this should be good
   *     No, user can enter a number > 5 and getPeople seems to honor it
  */

  /**
   * Check a profile for the input wikiTreeId
   */
  async check() {
    let profileIdArray = [];
    profileIdArray.push(this.getInputWikiTreeId().trim());
    this.testResults.setStateMessage("Gathering profiles for " + this.getInputWikiTreeId().trim());

    let numAncestors = this.getNumAncestorGen();
    if (numAncestors > BioCheckProfile.MAX_DEPTH) {
      numAncestors = BioCheckProfile.MAX_DEPTH;
    }
    let numDescendants = this.getNumDescendantGen();
    if (numDescendants > BioCheckProfile.MAX_DEPTH) {
      numDescendants = BioCheckProfile.MAX_DEPTH;
    }
    this.ancestorParents = new Set();
    let numRelatives = 0;
    if (this.getCheckAllConnections()) {
      numRelatives = this.getNumRelatives();
    }

    // Check the people a page at a time, bail if max reached
    await this.pageThroughPeople(profileIdArray, numAncestors, numDescendants, numRelatives);

    // Check more ancestors beyond the ancestor limits
    // but only if you have not already reached max limits
    if ((this.getNumAncestorGen() > 0) && !this.timeToQuit() &&
        (this.getNumAncestorGen() > BioCheckProfile.MAX_DEPTH)) {
      numAncestors = this.getNumAncestorGen();
      let remainingAncestorGenerations = 0;
      let depth = BioCheckProfile.MAX_GENERATIONS;
      if (numAncestors > BioCheckProfile.MAX_GENERATIONS) {
        numAncestors = BioCheckProfile.MAX_GENERATIONS;
      }
      remainingAncestorGenerations = numAncestors - BioCheckProfile.MAX_DEPTH;
      depth = BioCheckProfile.MAX_DEPTH;
      if (remainingAncestorGenerations > 0) {
        let promise = this.#checkMoreAncestors(remainingAncestorGenerations);
        await promise;
      }

      let promiseArray = await this.promiseCollection;
      let allPromises = Promise.all(promiseArray);
      await allPromises;
      this.promiseCollection = new Array();
    }

    // Now check unsourced relatives, if any
    numRelatives = this.getNumRelatives();
    if ((numRelatives > 0) && (!this.getCheckAllConnections())) {
      await this.checkUnsourcedRelatives();
    }
    this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount());
  }

  /*
   * Add more ancestor generations (11-20) check ancestorParents
   * @param {Number} remainingAncestorGenerations how many
   */
  async #checkMoreAncestors(remainingAncestorGenerations) {
    // only get the ancestors if either the mother/father for this person are not already checked
    let ancestorsToCheck = new Set();
    for (let profileId of this.ancestorParents) {
      if (!this.thePeopleManager.hasPerson(profileId)) {
        ancestorsToCheck.add(profileId);
      }
    }
    let ancestorIds = Array.from(ancestorsToCheck);
    let currentAncestor = 0;
    let msg = "Gathering ancestor profiles for another " + remainingAncestorGenerations + " generation";
    if (remainingAncestorGenerations > 1) {
      msg += "s";
    }
    this.testResults.setStateMessage(msg);
    this.needToGetMorePeople = true;  // make it start checking again
    await this.pageThroughPeople(ancestorIds, remainingAncestorGenerations, 0, 0);
    let promise = new Promise(function (resolve, reject) {
      let trueVal = true;
      if (trueVal) {
        resolve();
      } else {
        reject();
      }
    });
    return promise;
  }
}
