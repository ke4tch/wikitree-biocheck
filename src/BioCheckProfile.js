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
import { BioCheckPerson } from "./BioCheckPerson.js";
import { BioChecker } from "./BioChecker.js";
/**
 * Check biography for a profile, and optionally ancestors
 * @extends BioChecker
 */
export class BioCheckProfile extends BioChecker {
  sourcesReport = false;

  useGetPeopleAPI = true;

  static MAX_DEPTH = 10;
  static MAX_GENERATIONS = 20;
  static MAX_DESCENDANT_GEN = 5;

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
  */

  /**
   * Check a profile for the input wikiTreeId
   */
  async check() {
    this.testResults.setStateMessage("Gathering profiles");
    let profileIdArray = [];
    profileIdArray.push(this.getInputWikiTreeId().trim());

    let numAncestors = this.getNumAncestorGen();
    if (numAncestors > BioCheckProfile.MAX_DEPTH) {
      numAncestors = BioCheckProfile.MAX_DEPTH;
    }
    this.ancestorParents = new Set();
    let numRelatives = 0;
    if (this.getCheckAllConnections()) {
      numRelatives = this.getNumRelatives();
    }

    // Check the people a page at a time, bail if max reached
    await this.pageThroughPeople(profileIdArray, numAncestors, this.getNumDescendantGen(), numRelatives);

    // Check more ancestors beyond the ancestor limits
    // but only if you have not already reached max limits
    if ((this.getNumAncestorGen() > 0) && !this.timeToQuit() && !this.reportReachedMax &&
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
    this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount(), this.reportReachedMax);
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

  /*
   * Check descendants
   * @param {Number} numDescendant number of generations
   */
  async #checkDescendants(numDescendantGen) {
    let depth = numDescendantGen;
    if (depth > this.MAX_DESCENDANT_GEN) {
      depth = this.MAX_DESCENDANT_GEN;
    }
    this.testResults.setStateMessage("Gathering descendant profiles for " + depth + " generations");
    this.testResults.setProgressMessage("Waiting for server response...");
    const url =
      BioChecker.WIKI_TREE_URI +
      "?action=getDescendants" +
      "&key=" +
      this.getInputWikiTreeId() +
      "&depth=" +
      depth +
      "&fields=" +
      BioChecker.BASIC_PROFILE_REQUEST_FIELDS +
      BioChecker.REDIRECT_KEY;
    this.pendingRequestCount++;
    try {
      this.testResults.countRequest();  // instrumentation
      const fetchResponse = await fetch(url, {
        credentials: "include",
      });
      if (!fetchResponse.ok) {
        this.testResults.resetStateOnError();
        console.log("Error from getDescendants " + fetchResponse.status);
      } else {
        const theJson = await fetchResponse.json();
        let responseObj = theJson[0];
        let responseStatus = responseObj.status;
        if (responseStatus != 0) {
          this.testResults.resetStateOnError();
          this.testResults.setProgressMessage("Profile " + this.InputWikiTreeId() + " is " + responseStatus);
        } else {
          if (responseObj.descendants != null) {
            let descendantArray = responseObj.descendants;
            let len = descendantArray.length;
            // don't count as a total profile here due to pedigree collapse
            let descendantNum = 0;
            this.testResults.setProgressMessage("Examining " + len + " descendants");
            while (descendantNum < len && !this.timeToQuit()) {
              let profileObj = descendantArray[descendantNum];
              let thePerson = new BioCheckPerson();
              let canUseThis = thePerson.canUse( profileObj, this.getOpenOnly(), this.getIgnorePre1500(), this.getUserId());
              if (!this.thePeopleManager.hasPerson(thePerson.getProfileId())) {
                this.testResults.countProfile(1, thePerson.isUncheckedDueToPrivacy(), thePerson.isUncheckedDueToDate());
                if (canUseThis && !this.timeToQuit()) {
                  this.setDetailedProgress();
                  if (this.pendingRequestCount > BioChecker.MAX_PENDING_REQUESTS) {
                    this.testResults.countPromiseWait();
                    await this.sleep(BioChecker.SYNC_DELAY_MS);
                    let promiseArray = await this.promiseCollection;
                    let allPromises = Promise.all(promiseArray);
                    await allPromises;
                    this.promiseCollection = new Array();
                    this.pendingRequestCount = 0;
                  }
                  if (this.needToGetBio(thePerson)) {
                    let promise = this.checkPerson(thePerson);
                    if (!this.timeToQuit()) {
                      this.promiseCollection.push(promise);
                    }
                  }
                }
              }
              descendantNum++;
            }
          }
        }
      }
    } catch (error) {
      this.testResults.resetStateOnError();
      this.testResults.setProgressMessage("Error getting descendants for profile " + this.getInputWikiTreeId() + error);
    }
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

  /* 
   * check relatives without using getPeople
   */
  async #checkRelativesCollection() {
    let numUnsourced = 0;
    if (!this.timeToQuit() && this.getNumRelatives() > 0) {
      if (this.getCheckAllConnections()) {
        numUnsourced = this.thePeopleManager.getProfileCount();
      } else {
        numUnsourced = this.thePeopleManager.getUnmarkedProfileCount() + this.thePeopleManager.getMarkedProfileCount()
                       + this.thePeopleManager.getStyleProfileCount();
      }
    }
    if (numUnsourced > 0) {
      let stateMessage = "Examining relatives for " + numUnsourced + " profiles";
      this.testResults.setStateMessage(stateMessage);
      this.testResults.setProgressMessage("Examining relatives");

      // Use a set of profiles so that profiles are only checked once
      // The people manager knows who has already been checked
      let persons = [];
      let profileIdSet = new Set();
      let relativesAlreadyChecked = new Set();
      let alreadyHaveRelatives = new Set();
      let checkNum = 0;
      while (checkNum < this.getNumRelatives() && !this.timeToQuit()) {
        if (this.getCheckAllConnections()) {
          this.thePeopleManager.getAllProfileIds().forEach((item) => profileIdSet.add(item));
        } else {
          this.thePeopleManager.getUnmarkedProfileIds().forEach((item) => profileIdSet.add(item));
          this.thePeopleManager.getMarkedProfileIds().forEach((item) => profileIdSet.add(item));
          this.thePeopleManager.getStyleProfileIds().forEach((item) => profileIdSet.add(item));
        }
        let profilesToCheck = [];
        for (let profileId of profileIdSet) {
          profilesToCheck.push(profileId);
        }
        for (let profileId of profileIdSet) {
          if (!alreadyHaveRelatives.has(profileId) && !this.timeToQuit()) {
            alreadyHaveRelatives.add(profileId);
            let promise = this.checkNuclearRelatives(profileId, persons, relativesAlreadyChecked);
            await promise;
            let i = checkNum + 1;
            let msg = stateMessage + " degree number " + i + " for " + persons.length + " profiles";
            this.testResults.setStateMessage(msg);
            // cannot add to total count here because of possible duplicates
            let personNum = 0;
            while (personNum < persons.length && !this.timeToQuit()) {
              if (!this.thePeopleManager.hasPerson(persons[personNum].person.profileId) && !this.timeToQuit()) {
                this.setDetailedProgress();
                if (this.pendingRequestCount > this.MAX_PENDING_REQUESTS) {
                  this.testResults.countPromiseWait();
                  await this.sleep(BioChecker.SYNC_DELAY_MS);
                  let promiseArray = await this.promiseCollection;
                  let allPromises = Promise.all(promiseArray);
                  await allPromises;
                  this.promiseCollection = new Array();
                 this.pendingRequestCount = 0;
                }
                if (this.needToGetBio(persons[personNum])) {
                  let promise = this.checkPerson(persons[personNum]);
                  if (!this.timeToQuit()) {
                    this.promiseCollection.push(promise);
                  }
                }
              }
              personNum++;
            }
          }
        }
        // now get all these folks before the next iteration
        let promiseArray = await this.promiseCollection;
        let allPromises = Promise.all(promiseArray);
        await allPromises;
        this.promiseCollection = new Array();
        checkNum++;
      }
    }
  }
}
