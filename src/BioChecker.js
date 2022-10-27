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
 * Check biographies
 * This is a base class for various types of checks to be performed
 */
import { theSourceRules } from "./SourceRules.js"
import { BioCheckPeopleManager } from "./BioCheckPeopleManager.js"
import { BioCheckPerson } from "./BioCheckPerson.js"
import { Biography } from "./Biography.js"

export class BioChecker {

  testResults = null;
  thePeopleManager = new BioCheckPeopleManager();

  relativesIncrement = 400;
  requestedProfileCount = 0;                 // total number of profiles examined
  promiseCollection = ([]);                  // what we are waiting for
  pendingRequestCount = 0;                   // how many we are waiting for
  verbose = false;                           // control logging

  userArgs = null;

  totalValidateTime = 0;                       // optionally report total ms for validation

  static MAX_PENDING_REQUESTS = 80;            // after this many wait for all responses from server
  static SYNC_DELAY_MS = 80;                   // milliseconds to delay to sync with server
  static MAX_TO_CHECK = 10000;
  static WIKI_TREE_URI = "https://api.wikitree.com/api.php";
  static BASIC_PROFILE_REQUEST_FIELDS = "Id,Name,IsLiving,Privacy,Manager,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,FirstName,LastNameCurrent,LastNameAtBirth,Bio";
  static  REDIRECT_KEY = "&resolveRedirect=1";

  /*
  * The pending request count is used with MAX_PENDING_REQUESTS
  * to force a sync (aka wait). This seems to be of use when
  * many requests are issued to the API server to clear things
  * so that the API server does not start rejecting requests.
  */


  /**
   * Construct the base class 
   * @param theTestResults container for results
   * @param userArgs what to do
   */
  constructor(theTestResults, theUserArgs) {
    this.testResults = theTestResults;
    this.userArgs = theUserArgs;
  }

  /**
   * Getters for the user args
   */
  getInputWikiTreeId() {
    return this.userArgs.inputWikiTreeId;
  }
  getNumAncestorGen() {
    return this.userArgs.numAncestorGen;
  }
  getNumDescendantGen() {
    return this.userArgs.numDescendantGen;
  }
  getQueryArg() {
    return this.userArgs.queryArg;
  }
  getMaxQuery() {
    return this.userArgs.maxQuery;
  }
  getSearchStart() {
    return this.userArgs.searchStart;
  }
  getSearchMax() {
    return this.userArgs.searchMax;
  }
  getOpenOnly() {
    return this.userArgs.openOnly;
  }
  getIgnorePre1500() {
    return this.userArgs.ignorePre1500;
  }
  getReliableSourcesOnly() {
    return this.userArgs.reliableSourcesOnly;
  }
  getCheckAutoGenerated() {
    return this.userArgs.checkAutoGenerated;
  }
  getNumRelatives() {
    return this.userArgs.numRelatives;
  }
  getCheckAllConnections() {
    return this.userArgs.checkAllConnections;
  }
  getMaxReport() {
    return this.userArgs.maxReport;
  }
  getReportAllProfiles() {
    return this.userArgs.reportAllProfiles;
  }
  getReportNonManaged() {
    return this.userArgs.reportNonManaged;
  }
  getSourcesReport() {
    return this.userArgs.sourcesReport;
  }
  getProfileReviewReport() {
    return this.userArgs.profileReviewReport;
  }
  getReportStatsOnly() {
    return this.userArgs.reportStatsOnly;
  }
  getUserId() {
    return this.userArgs.userId;
  }

  /*
   * sleep in milliseconds. await this
   * @param duration time in milliseconds
   */
  sleep(duration) {
    return new Promise(resolve => {
      setTimeout(() => {
      resolve()
      }, duration)
    })
  }

  /*
   * Time to quit? Either at max report or a cancel pending
   * @return true if at max report or cancel pending
   */
  timeToQuit() {
    if ((this.testResults.getReportCount() >= this.getMaxReport()) ||
      (this.testResults.isCancelPending())) {
      return true;
    } else {
      return false;
    }
  }

  /* 
   * Need to check relatives?
   * @return number of profiles to check
   * if not time to quit and and any relative checks specified
   * AND either unsourced or check all connections
   */
  needToCheckRelatives() {
    let numUnsourced = 0;
    if ((!this.timeToQuit()) && (this.getNumRelatives() > 0)) {
      if (this.getCheckAllConnections()) { 
        numUnsourced = this.thePeopleManager.getProfileCount();
      } else {
        numUnsourced = this.thePeopleManager.getUnmarkedProfileCount() +
                       this.thePeopleManager.getMarkedProfileCount();
      }
    }
    return numUnsourced;
  }

  /*
   * Set detailed progress
   * with the incremented number of requested profiles
   */
  setDetailedProgress() {
    this.requestedProfileCount++;
    this.testResults.setProgressMessageDetails(this.requestedProfileCount);
  }

  /* 
   * Check unsourced (or all) relatives
   * This gives the capability to check a CC#
   */
  async checkUnsourcedRelatives() {

    let numUnsourced = this.needToCheckRelatives();
    this.relativesIncrement = this.getMaxReport();
    if ((this.getNumRelatives() > 0) && (numUnsourced > 0)) {
      let stateMessage = "Examining relatives for " + numUnsourced
        + " profiles";
      this.testResults.setStateMessage(stateMessage);
      this.testResults.setProgressMessage("Examining relatives");
      
      // Use a set of profiles so that profiles are only checked once
      // The people manager knows who has already been checked
      this.relativesIncrement = 0;
      let persons = [];
      let profileIdSet = new Set();
      let relativesAlreadyChecked = new Set();
      let alreadyHaveRelatives = new Set();
      let checkNum = 0;
      while ((checkNum < this.getNumRelatives()) && (!this.timeToQuit())) {
        if (this.getCheckAllConnections()) {
          this.thePeopleManager.getAllProfileIds().forEach(item => profileIdSet.add(item));
        } else {
          this.thePeopleManager.getUnmarkedProfileIds().forEach(item => profileIdSet.add(item));
          this.thePeopleManager.getMarkedProfileIds().forEach(item => profileIdSet.add(item))
          this.thePeopleManager.getStyleProfileIds().forEach(item => profileIdSet.add(item));
        }
        let profilesToCheck = [];
        for (let profileId of profileIdSet) {
            profilesToCheck.push(profileId);
        }
        for (let profileId of profileIdSet) {
          if ((!alreadyHaveRelatives.has(profileId)) && (!this.timeToQuit())) {
            alreadyHaveRelatives.add(profileId);
            let promise = this.checkRelatives(profileId, persons, relativesAlreadyChecked);
            await promise;
            let i = checkNum + 1;
            let msg = stateMessage + " degree number " + i + " for " + persons.length + " profiles";
            this.testResults.setStateMessage(msg);
            // cannot add to total count here because of possible duplicates
            let personNum = 0;
            while ((personNum < persons.length) && (!this.timeToQuit())) {
              if ((!this.thePeopleManager.hasPerson(persons[personNum].person.profileId))
                    && (!this.timeToQuit())) {
                this.setDetailedProgress();
                if (this.pendingRequestCount > this.MAX_PENDING_REQUESTS) {
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
    this.testResults.reportStatistics();
  }

  /*
   * Determine if need to check bio 
   * If the person does not have a bio, call the API to get it
   * and check it
   * @param thePerson person to be checked
   * @return true if need to get and check bio
   */
  needToGetBio(thePerson) {
    let needToCheckBio = false;
    if (!this.thePeopleManager.hasPerson(thePerson.getProfileId())) {
      this.thePeopleManager.addPerson(thePerson.getProfileId(), 
          thePerson.getWikiTreeId(), thePerson.getRequestedProfileId());
      if (!thePerson.hasBio()) {
        needToCheckBio = true;
      } else {
        this.checkBio(thePerson, thePerson.getBio());
      }
    }
    return needToCheckBio;
  }

  /*
   * Check person
   * Get the biography for the person and check it
   * @param thePerson to be checked
   * @return a promise to resolve when person finished
   */
  async checkPerson(thePerson) {
    let url = BioChecker.WIKI_TREE_URI + "?action=getBio" + "&key=" + thePerson.getProfileId();
    this.pendingRequestCount++;
    let fetchResponse = await fetch(url, {
        credentials: "include",
    });
    if (!fetchResponse.ok) {
      console.log("Error from getBio " + fetchResponse.status);
    } else {
      let theJson = await (fetchResponse.json());
      if (!this.timeToQuit()) {
        let bioObj = theJson[0];
        if (bioObj.status === "Permission denied") {
          this.testResults.addUncheckedDueToPrivacy();
          this.testResults.setProgressMessage("Profile " +
              thePerson.getWikiTreeId() + " privacy does not allow testing");
          console.log("Get Bio for Profile " + thePerson.getWikiTreeId() + " privacy does not allow testing");
        } else {
          this.testResults.setProgressMessage("Examining profile for " + thePerson.getWikiTreeId());
          if (bioObj.bio != null) {
            let bioString = bioObj.bio;
            this.checkBio(thePerson, bioString);
          } else {
            this.testResults.addUncheckedDueToPrivacy();
            this.testResults.setProgressMessage("Profile " + thePerson.getWikiTreeId() + 
                " privacy does not allow testing");
            console.log("Get Bio for Profile " + thePerson.getWikiTreeId() + " does not have a bio ");
          }
        }
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
   * Check bio for a person and update test results
   * @param bioString the bio
   */
  async checkBio(thePerson, bioString) {
    this.testResults.setProgressMessage("Examining profile for " + thePerson.getWikiTreeId());

//    let startTime = new Date();                    // timing instrumentation

    // get information about person dates
    let isPre1500 = thePerson.isPersonPre1500();
    let isPre1700 = thePerson.isPersonPre1700();
    let mustBeOpen = thePerson.mustBeOpen();
    let bioUndated = false;
    if ((thePerson.isUndated()) && (thePerson.getPrivacy() > 0)) {
      bioUndated = true;
    }

    let biography = new Biography(theSourceRules);
    biography.parse(bioString, isPre1500, isPre1700, mustBeOpen, bioUndated, this.getCheckAutoGenerated());
    biography.validate();
    
//    let endTime = new Date();
//    let timeDiff = endTime.getTime() - startTime.getTime();
//    this.totalValidateTime = this.totalValidateTime + timeDiff;

    // keep track of what you found
    if (biography.bioResults.style.bioHasStyleIssues) {
      this.thePeopleManager.setProfileStyle(thePerson.getProfileId());
    }
    if (biography.bioResults.stats.bioIsMarkedUnsourced) {
      this.thePeopleManager.setProfileMarked(thePerson.getProfileId());
    } else {
      if (!biography.bioResults.sources.sourcesFound) {
        this.thePeopleManager.setProfileUnmarked(thePerson.getProfileId());
      }
    }
    // add person to report
    this.testResults.addProfile(biography.bioResults, thePerson.getProfileId(),
        thePerson.getWikiTreeId(), thePerson.getWikiTreeLink(),
        thePerson.getReportName(), thePerson.getManagerId(),
        thePerson.getPrivacyString(), 
        thePerson.getReportDate(true), thePerson.getReportDate(false),
        this.getReportAllProfiles(), this.getReportNonManaged(), 
        this.getSourcesReport(), this.getProfileReviewReport(),
        this.getReportStatsOnly(), this.getUserId());

    // allow garbage collection
    //bioValidator = null;
    biography = null;
    thePerson.clearBio();
  }

  /*
   * check relatives
   * @param profileIds to test (can be a , delimited list)
   * @param persons to be tested
   * @return a promise to resolve when relatives found
   */
  async checkRelatives(profileId, persons, relativesAlreadyChecked) {

    try {
      const url = BioChecker.WIKI_TREE_URI + "?action=getRelatives&keys=" + profileId +
        "&getParents=true&getChildren=true&getSpouses=true&getSiblings=true" +
        "&fields=" + BioChecker.BASIC_PROFILE_REQUEST_FIELDS + BioChecker.REDIRECT_KEY;
      this.pendingRequestCount++;
      const fetchResponse = await fetch(url, {
        credentials: "include",
      });
      if (!fetchResponse.ok) {
        console.log("Error from getRelatives " + fetchResponse.status);
      }
      const theJson = await fetchResponse.json();
      let relatives = theJson[0].items;
      let personNum = 0;
      while ((personNum < relatives.length) && (!this.timeToQuit())) {
        let personObj = relatives[personNum].person;
        relativesAlreadyChecked.add(personObj.Id);

        // put each relative into one array, then check them all
        if (personObj.Parents != null) {
          let personArray = Object.values(personObj.Parents);
          this.gatherFamilyMembers(personArray, persons, relativesAlreadyChecked);
        }
        if (personObj.Spouses != null) {
          let personArray = Object.values(personObj.Spouses);
          this.gatherFamilyMembers(personArray, persons, relativesAlreadyChecked);
        }
        if (personObj.Children != null) {
          let personArray = Object.values(personObj.Children);
          this.gatherFamilyMembers(personArray, persons, relativesAlreadyChecked);
        }
        if (personObj.Siblings != null) {
          let personArray = Object.values(personObj.Siblings);
          this.gatherFamilyMembers(personArray, persons, relativesAlreadyChecked);
        }
        personNum++;
      }
    } catch (error) {
      console.log("Error from getRelatives for " + profileId + " " + error);
      this.testResults.setProgressMessage("Error getting relatives " + error);
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
  * Gather family members
  * @param personArray array of person objects
  * @param persons collection of Person to check
  * @param relativesAlreadyChecked
  */
  gatherFamilyMembers(personArray, persons, relativesAlreadyChecked 
                           ) {
    for (let i = 0; i < personArray.length; i++) {
      let thePerson = new BioCheckPerson();
      let canUseThis = thePerson.build(personArray[i], this.getOpenOnly(), 
                                       this.getIgnorePre1500(), this.getUserId(), 0);
      if ((!relativesAlreadyChecked.has(thePerson.getProfileId()))
           && (!this.thePeopleManager.hasPerson(thePerson.getProfileId()))) {
        this.testResults.countProfile(1, thePerson.isUncheckedDueToPrivacy(),
            thePerson.isUncheckedDueToDate());
        if (canUseThis) {
          persons.push(thePerson);
          relativesAlreadyChecked.add(thePerson.getProfileId());
        }
      }
    }
  }
}