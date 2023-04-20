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
   * Notes about using getPeople. It might work all at once BUT
   * how do you know when you will hit the limits
   * - return a max of 1000 profiles
   * - max ancestor generations 10
   * - max profileId (keys) 100
   *
   * So how do you know when you will have > 1000 returned?
   * - depends. for Myles Standish Standish-112 you will hit > 1000 in 5 descendants
   * - you pretty much will hit 1000 if you combine ancestors/descendants and nuclear
   * - for me with 0 ancestors/descendants you hit > 1000 on CC7 (but CC6 is okay)
   *
   * response status Maximum number of profiles (1000) reached while adding relatives
   *   - assume you can just test for "Maximum number of profiles"
   *
   * - but bugs where the error is not returned, you might get 1001 profiles, or fewer
   *
   * get all of the user inputs and try with a single getPeople call
   * if that succeeds, just report them
   * else individually call getAncestors, getDescendants, and checkUnsourcedRelatives
   *   - but inside them if there is a failure then use getPeople on the collection
   *   - and change checkUnsourcedRelatives to always use getPeople on the collection
   *   - and if checkUnsourced fails on the collection, maybe try fewer connection levels
   *   - and muck with the lists of profile ids. Or, just report to user.
   *   - once there has been a failure due to the sizes, report some then give up, tell user.
   */

  /**
   * Check a profile for the input wikiTreeId
   */
  async check() {
    this.testResults.setProgressMessage("Gathering profiles");

    let profileIdArray = [];
    profileIdArray.push(this.getInputWikiTreeId().trim());

    // Use getPeople if ancestors < max ancestor generations 
    let numAncestors = this.getNumAncestorGen();
    if (numAncestors > BioCheckProfile.MAX_DEPTH) {
      numAncestors = BioCheckProfile.MAX_DEPTH;
    }
    this.ancestorParents = new Set();

    // Use getPeople if checking all connections (not just problem profiles)
    let numRelatives = 0;
    if (this.getCheckAllConnections()) {
      numRelatives = this.getNumRelatives();
    }

    if (this.useGetPeopleAPI) {
      await this.checkPeople(profileIdArray, numAncestors, this.getNumDescendantGen(), numRelatives, 0, 1000, 0);
//console.log('after checkPeople reachedMax ' + this.reachedMaxProfiles);
      if (this.reachedMaxProfiles) {
        this.reportReachedMax = true;
      }
      if ((this.getNumAncestorGen() > 0) && !this.timeToQuit() &&
          (this.reachedMaxProfiles || (this.getNumAncestorGen() > BioCheckProfile.MAX_DEPTH))) {
        await this.#checkAncestors(this.getNumAncestorGen());
        let promiseArray = await this.promiseCollection;
        let allPromises = Promise.all(promiseArray);
        await allPromises;
        this.promiseCollection = new Array();
//console.log('after checkAncestors reachedMax ' + this.reachedMaxProfiles);
      }
    } else {
      // don't use getPeople API
      await this.checkPeople(profileIdArray, 0, 0, 0, 0, 1000, 0);
      if ((numAncestors > 0) && !this.timeToQuit()) {
        await this.#checkAncestors(this.getNumAncestorGen());
        let promiseArray = await this.promiseCollection;
        let allPromises = Promise.all(promiseArray);
        await allPromises;
        this.promiseCollection = new Array();
      }
    }
    if (this.reachedMaxProfiles) {
      this.reportReachedMax = true;
    }
    // Now if we reached max profiles and there are descendent generations, get descendants separarately
    if (this.useGetPeopleAPI) {
      if (this.reachedMaxProfiles && !this.timeToQuit() && (this.getNumDescendantGen() > 0)) {
        await this.#checkDescendants(this.getNumDescendantGen());
        let promiseArray = await this.promiseCollection;
        let allPromises = Promise.all(promiseArray);
        await allPromises;
        this.promiseCollection = new Array();
//console.log('after checkDescendants reachedMax ' + this.reachedMaxProfiles);
      }
    } else {
      if (this.getNumDescendantGen() > 0) {
        await this.#checkDescendants(this.getNumDescendantGen());
        let promiseArray = await this.promiseCollection;
        let allPromises = Promise.all(promiseArray);
        await allPromises;
        this.promiseCollection = new Array();
      }
    }

    let anchorId = this.getInputWikiTreeId().trim();
    numRelatives = this.getNumRelatives();
    if (this.useGetPeopleAPI) {
      await this.checkRelatives(anchorId);
    } else {
      await this.#checkRelativesCollection();
    }
    this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount(), this.reportReachedMax);
  }

  /*
   * Check ancestors
   * @param {Number} numAncestorGen number of generations to check
   */
  async #checkAncestors(numAncestorGen) {
    let remainingAncestorGenerations = 0;
    let depth = BioCheckProfile.MAX_GENERATIONS;
    if (numAncestorGen > BioCheckProfile.MAX_DEPTH) {
      if (numAncestorGen > BioCheckProfile.MAX_GENERATIONS) {
        numAncestorGen = BioCheckProfile.MAX_GENERATIONS;
      }
      remainingAncestorGenerations = numAncestorGen - BioCheckProfile.MAX_DEPTH;
      depth = BioCheckProfile.MAX_DEPTH;
    } else {
      depth = numAncestorGen;
    }
    //if (this.reachedMaxProfiles) {
    if (!this.useGetPeopleAPI || this.reachedMaxProfiles) {
      this.testResults.setStateMessage("Gathering ancestor profiles for " + numAncestorGen + " generations");
      this.testResults.setProgressMessage("Waiting for server response...");
      const url = BioChecker.WIKI_TREE_URI + "?action=getAncestors" + "&key=" + this.getInputWikiTreeId() +
        "&depth=" + depth + "&fields=" + BioChecker.BASIC_PROFILE_REQUEST_FIELDS + ",Mother,Father" +
        BioChecker.REDIRECT_KEY;
      this.pendingRequestCount++;
      try {
        this.testResults.countRequest();  // instrumentation
        const fetchResponse = await fetch(url, {
          credentials: "include",
        });
        if (!fetchResponse.ok) {
          this.testResults.resetStateOnError();
          console.log("Error from getAncestors " + fetchResponse.status);
        } else {
          const theJson = await fetchResponse.json();
          let responseObj = theJson[0];
          let responseStatus = responseObj.status;
          if (responseStatus != 0) {
            this.testResults.resetStateOnError();
            this.testResults.setProgressMessage("Profile " + this.getInputWikiTreeId() + " is " + responseStatus);
          } else {
            if (responseObj.ancestors != null) {
              let ancestorArray = responseObj.ancestors;
              let len = ancestorArray.length;
              // don't count as a total profile here due to pedigree collapse
              let ancestorNum = 0;
              this.testResults.setProgressMessage("Examining " + len + " ancestors");
              while (ancestorNum < len && !this.timeToQuit()) {
                let profileObj = ancestorArray[ancestorNum];
                let thePerson = new BioCheckPerson();
                let canUseThis = thePerson.build( profileObj, this.getOpenOnly(), this.getIgnorePre1500(),
                  this.getUserId(), 0);
                if (canUseThis) {
                  this.saveAncestorParents(profileObj);
                }
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
                ancestorNum++;
              }
              // Check for more than 10 generations of ancestors
              if (remainingAncestorGenerations > 0) {
                let promise = this.#checkMoreAncestors(remainingAncestorGenerations);
                await promise;
              }
            }
          }
        }
      } catch (error) {
        this.testResults.resetStateOnError();
        this.testResults.setProgressMessage("Error getting ancestors for profile " + error);
      }
    } else {
      // already got some from getPeople
      // Check for more than 10 generations of ancestors
      if (remainingAncestorGenerations > 0) {
        let promise = this.#checkMoreAncestors(remainingAncestorGenerations);
        await promise;
      }
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
    await this.checkPeople(ancestorIds, remainingAncestorGenerations, 0, 0, 0, 1000, 0);

    if (this.reachedMaxProfiles) {
      this.testResults.resetStateOnError();
      this.testResults.setProgressMessage("Too many profiles, try with fewer generations");
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
              let canUseThis = thePerson.build( profileObj, this.getOpenOnly(), this.getIgnorePre1500(),
                this.getUserId(), 0);
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
