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
 * Check biography for a profile, and optionally ancestors
 */

import { BioCheckPerson } from "./BioCheckPerson.js";
import { BioChecker } from "./BioChecker.js";

export class BioCheckProfile extends BioChecker {
  sourcesReport = false;

  static MAX_DEPTH = 10;
  static MAX_GENERATIONS = 20;
  static MAX_DESCENDANT_GEN = 5;

  /**
   * Constructor
   * @param theTestResults container for results
   * @param userArgs what to do
   */
  constructor(theTestResults, theUserArgs) {
    super(theTestResults, theUserArgs);
  }

  /**
   * Check a profile for the input wikiTreeId
   */
  async check() {
    this.testResults.setProgressMessage("Gathering profiles");

    const url =
      BioChecker.WIKI_TREE_URI +
      "?action=getProfile" +
      "&key=" +
      this.getInputWikiTreeId().trim() +
      "&fields=" +
      BioChecker.BASIC_PROFILE_REQUEST_FIELDS +
      BioChecker.REDIRECT_KEY;
    this.testResults.countProfile(1, false, false);
    this.setDetailedProgress();
    this.pendingRequestCount++;
    try {
      this.testResults.countRequest();  // instrumentation
      const fetchResponse = await fetch(url, {
        credentials: "include",
      });
      if (!fetchResponse.ok) {
        this.testResults.resetStateOnError();
        this.testResults.setProgressMessage(
          "Error " + fetchResponse.status + " getting profile " + this.getInputWikiTreeId()
        );
        console.log("Error from getProfile " + fetchResponse.status);
        this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount());
      }
      const theJson = await fetchResponse.json();
      let responseObj = theJson[0];
      let responseStatus = responseObj.status;
      if (responseStatus != 0) {
        this.testResults.resetStateOnError();
        this.testResults.setProgressMessage("Profile " + this.getInputWikiTreeId() + " is " + responseObj["status"]);
      } else {
        if (responseObj.profile != null) {
          let profileObj = responseObj.profile;
          let thePerson = new BioCheckPerson();
          let canUseThis = thePerson.build(
            profileObj,
            this.getOpenOnly(),
            this.getIgnorePre1500(),
            this.getUserId(),
            0
          );
          if (!canUseThis) {
            this.testResults.countProfile(0, thePerson.isUncheckedDueToPrivacy(), thePerson.isUncheckedDueToDate());
            // in most cases just swallow the error, but this is what user asked for
            this.testResults.resetStateOnError();
            this.testResults.setProgressMessage(
              "Profile " + this.getInputWikiTreeId() + " privacy does not allow testing"
            );
            console.log("Profile " + this.getInputWikiTreeId() + " privacy does not allow testing");
            this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount());
          } else {
            if (!this.timeToQuit()) {
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
                this.promiseCollection.push(promise);
              }
            }
            // Wait for all to complete then check relatives and report
            let promiseArray = await this.promiseCollection;
            let allPromises = Promise.all(promiseArray);
            await allPromises;
            this.promiseCollection = new Array();
          }
        }
      }
    } catch (error) {
      this.testResults.resetStateOnError();
      console.log("Error from getProfile " + error);
      this.testResults.setProgressMessage("Error getting profile " + this.getInputWikiTreeId() + " " + error);
    }
    // Now check ancestors, descendants and relatives
    if (this.getNumAncestorGen() > 0) {
      await this.#checkAncestors(this.getNumAncestorGen());
      let promiseArray = await this.promiseCollection;
      let allPromises = Promise.all(promiseArray);
      await allPromises;
      this.promiseCollection = new Array();
    }
    if (this.getNumDescendantGen() > 0) {
      await this.checkDescendants(this.getNumDescendantGen());
      let promiseArray = await this.promiseCollection;
      let allPromises = Promise.all(promiseArray);
      await allPromises;
      this.promiseCollection = new Array();
    }
    if (this.needToCheckRelatives()) {
      this.checkUnsourcedRelatives();
    } else {
      this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount());
    }
  }

  /*
   * Check ancestors
   * @param numAncestorGen number of generations to check
   */
  async #checkAncestors(numAncestorGen) {
    let remainingAncestorGenerations = 0;
    let ancestorParents = new Set();
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
    this.testResults.setStateMessage("Gathering ancestor profiles for " + numAncestorGen + " generations");
    this.testResults.setProgressMessage("Waiting for server response...");
    const url =
      BioChecker.WIKI_TREE_URI +
      "?action=getAncestors" +
      "&key=" +
      this.getInputWikiTreeId() +
      "&depth=" +
      depth +
      "&fields=" +
      BioChecker.BASIC_PROFILE_REQUEST_FIELDS +
      ",Mother,Father" +
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
      }
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
            let canUseThis = thePerson.build(
              profileObj,
              this.getOpenOnly(),
              this.getIgnorePre1500(),
              this.getUserId(),
              0
            );
            if (canUseThis) {
              this.saveAncestorParents(profileObj, ancestorParents);
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
            let promise = this.checkMoreAncestors(remainingAncestorGenerations, ancestorParents);
            await promise;
          }
        }
      }
    } catch (error) {
      this.testResults.resetStateOnError();
      this.testResults.setProgressMessage("Error getting ancestors for profile " + this.getInputWikiTreeId() + error);
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
   * Save parents for an ancestor
   * @param profileObj the profile
   * @param ancestoryParents collection of the parents
   */
  saveAncestorParents(profileObj, ancestorParents) {
    let id = 0;
    if (profileObj.Mother != null) {
      id = profileObj.Mother;
      if (id != 0) {
        ancestorParents.add(id);
      }
    }
    if (profileObj.Father != null) {
      id = profileObj.Father;
      if (id != 0) {
        ancestorParents.add(id);
      }
    }
  }

  /*
   * Add more ancestor generations (11-20)
   * @param remainingAncestorGenerations how many
   * @param ancestorsParents for whom
   */
  async checkMoreAncestors(remainingAncestorGenerations, ancestorParents) {
    // only get the ancestors if either the mother/father for this person are not already checked
    let ancestorsToCheck = new Set();
    for (let profileId of ancestorParents) {
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
    while (currentAncestor < ancestorIds.length && !this.timeToQuit()) {
      let wikiTreeId = ancestorIds[currentAncestor];
      const url =
        BioChecker.WIKI_TREE_URI +
        "?action=getAncestors" +
        "&key=" +
        wikiTreeId +
        "&depth=" +
        remainingAncestorGenerations +
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
          console.log("Error from getAncestors " + fetchResponse.status);
        }
        const theJson = await fetchResponse.json();
        let responseObj = theJson[0];
        let responseStatus = responseObj.status;
        if (responseStatus != 0) {
          this.testResults.resetStateOnError();
          this.testResults.setProgressMessage("Profile " + wikiTreeId + " is " + responseStatus);
        } else {
          if (responseObj.ancestors != null) {
            let ancestorArray = responseObj.ancestors;
            let len = ancestorArray.length;
            // don't count as a total profile here due to pedigree collapse
            let ancestorNum = 0;
            while (ancestorNum < len && !this.timeToQuit()) {
              let profileObj = ancestorArray[ancestorNum];
              let thePerson = new BioCheckPerson();
              let canUseThis = thePerson.build(
                profileObj,
                this.getOpenOnly(),
                this.getIgnorePre1500(),
                this.getUserId(),
                0
              );
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
          }
        }
      } catch (error) {
        this.testResults.resetStateOnError();
        this.testResults.setProgressMessage("Error getting ancestors for profile " + wikiTreeId + error);
      }
      currentAncestor++;
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
   * @param numDescendant number of generations
   */
  async checkDescendants(numDescendantGen) {
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
      }
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
            let canUseThis = thePerson.build(
              profileObj,
              this.getOpenOnly(),
              this.getIgnorePre1500(),
              this.getUserId(),
              0
            );
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
}
