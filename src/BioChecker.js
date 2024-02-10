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
import { theSourceRules } from "./SourceRules.js";
import { BioCheckPeopleManager } from "./BioCheckPeopleManager.js";
import { BioCheckPerson } from "./BioCheckPerson.js";
import { Biography } from "./Biography.js";

/**
 * Check biographies
 * This is a base class for various types of checks to be performed
 */
export class BioChecker {
  testResults = null;
  thePeopleManager = new BioCheckPeopleManager();

  requestedProfileCount = 0; // total number of profiles examined
  promiseCollection = []; // what we are waiting for
  pendingRequestCount = 0; // how many we are waiting for
  ancestorParents = new Set();
  alreadyHaveRelatives = new Set();
  encounteredError = false;
  peopleCount = 0;               // number of profiles returned by getPeople

  userArgs = null;

  totalValidateTime = 0; // optionally report total ms for validation
  totalFetchTime = 0; // optionally report total ms for fetch

  useGetPeopleAPI = true;

  static MAX_PENDING_REQUESTS = 80; // after this many wait for all responses from server
  static MAX_PENDING_PEOPLE_REQUESTS = 8; // after this many wait for all responses from server
  static SYNC_DELAY_MS = 80; // milliseconds to delay to sync with server
  static MAX_TO_CHECK = 10000;
  static WIKI_TREE_URI = "https://api.wikitree.com/api.php";
  //static WIKI_TREE_URI = "https://staging.wikitree.com/api.php";
  // staging.wikitree.com 
  static BASIC_PROFILE_REQUEST_FIELDS =
   "Id,Name,IsLiving,Privacy,Manager,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,FirstName,RealName,LastNameCurrent,LastNameAtBirth,Mother,Father,DataStatus,Bio,IsMember";
  static REDIRECT_KEY = "&resolveRedirect=1";
  static MAX_API_PROFILES = 100;
  static LARGE_MAX_API_PROFILES = 1000;
  static MEDIUM_MAX_API_PROFILES = 250;   // for the impatient
  static MAX_RELATIVES = 10;
  static GET_PEOPLE_MAX_RESPONSE = 1000;
  static GET_PEOPLE_MAX_PAGES = 4;
  static MY_ID = "bioCheck";
  static MY_ID_KEY = "&appId=" + BioChecker.MY_ID + " ";
  static MAX_UNSOURCED_RELATIVES = 3;

  /*
   * The pending request count is used with MAX_PENDING_REQUESTS
   * to force a sync (aka wait). This seems to be of use when
   * many requests are issued to the API server to clear things
   * so that the API server does not start rejecting requests.
   */

  /**
   * Construct the base class
   * @param {BioTestResults} theTestResults container for results 
   * @param {Object} userArgs what to do pushed from the Vue
   */
  constructor(theTestResults, theUserArgs) {
    this.testResults = theTestResults;
    this.userArgs = theUserArgs;
  }

  /**
   * Get input WikiTree Id for the logged in user
   * @returns {String} input WikiTreeId (e.g., Doe-100)
   */
  getInputWikiTreeId() {
    return this.userArgs.inputWikiTreeId;
  }
  /**
   * Get number of ancestor generations to check
   * @returns {Number} number of ancestor generations
   */
  getNumAncestorGen() {
    return this.userArgs.numAncestorGen;
  }
  /**
   * Get number of descendant generations to check
   * @returns {Number} number of descendant generations
   */
  getNumDescendantGen() {
    return this.userArgs.numDescendantGen;
  }
  /**
   * Get arguments for WT+ text/search
   * @returns {String} arguments for WT+ text/search
   */
  getQueryArg() {
    return this.userArgs.queryArg;
  }
  /**
   * Get max value for WT+ text/search
   * @returns {Number} max value for WT+ text/search
   */
  getMaxQuery() {
    return this.userArgs.maxQuery;
  }
  /**
   * Get start value to begin processing in WT+ search results
   * @returns {Number} start value
   */
  getSearchStart() {
    return this.userArgs.searchStart;
  }
  /**
   * Get max to process from WT+ search results
   * @returns {Number} max to process
   */
  getSearchMax() {
    return this.userArgs.searchMax;
  }
  /**
   * Get max to process from random
   * @returns {Number} max to process
   */
  getSearchMaxRandom() {
    return this.userArgs.searchMaxRandom;
  }
  /**
   * Get open only argument
   * @returns {Boolean} true to check only profiles with open privacy
   */
  getOpenOnly() {
    return this.userArgs.openOnly;
  }
  /**
   * Get orphan only argument
   * @returns {Boolean} true to check only profiles with 
   */
  getOrphanOnly() {
    return this.userArgs.orphanOnly;
  }
  /**
   * Get ignore pre1500 argument
   * @returns {Boolean} true to ignore profiles born or died before 1500
   */
  getIgnorePre1500() {
    return this.userArgs.ignorePre1500;
  }
  /**
   * Get reliable sources only argument
   * @returns {Boolean} true to treat all profiles as born/died before 1700
   */
  getReliableSourcesOnly() {
    return this.userArgs.reliableSourcesOnly;
  }
  /**
   * Get search string argument
   * @returns {String} to search and report if found in any profile
   */
  getBioSearchString() {
    return this.userArgs.bioSearchString;
  }
  /**
   * Get number of relative checks (e.g., connection count)
   * @returns {Number} number of times to check relatives
   */
  getNumRelatives() {
    // numRelatives should be limited by the GUI, but just in case
    let numRel = this.userArgs.numRelatives;
    if (numRel > BioChecker.MAX_RELATIVES) {
      numRel = BioChecker.MAX_RELATIVES;
    }
    return numRel;
  }
  /**
   * Get check all connections argument
   * @returns {Boolean} true to check all connections for all profiles or
   * false to check connections only for profiles with source or style issues
   */
  getCheckAllConnections() {
    return this.userArgs.checkAllConnections;
  }
  /**
   * Get max number of profiles to report
   * @returns {Number} max number of profiles to report
   */
  getMaxReport() {
    return this.userArgs.maxReport;
  }
  /**
   * Get report all profiles argument
   * @returns {Boolean} true to report all profiles or false to report
   * only profiles with source or style issues
   */
  getReportAllProfiles() {
    return this.userArgs.reportAllProfiles;
  }
  /**
   * Get report non managed argument
   * @returns {Boolean} true to report only those watchlist profiles
   * that are not managed by the logged in user
   */
  getReportNonManaged() {
    return this.userArgs.reportNonManaged;
  }
  /**
   * Get report style details
   * @returns {Boolean} true to report style details
   */
  getReportStyleDetails () {
    return this.userArgs.reportStyleDetails;
  }
  /*
   * Get stats only report argument
   * @returns {Boolean} true to report statistics only
   */
  getReportStatsOnly() {
    return this.userArgs.reportStatsOnly;
  }
  /**
   * Get userId
   * @returns {Number} userId for the logged in user (e.g., 12345678)
   */
  getUserId() {
    return this.userArgs.userId;
  }
  /**
   * Get max profiles to report from watchlist
   * @returns {Number} max profiles to report from watchlist
   */
  getMaxWatchlistCount() {
    return this.userArgs.maxWatchlistCount;
  }
  /**
   * Get watchlist search start
   * @returns {Number} position in watchlist to start checking
   */
  getSearchStartWatchlist() {
    return this.userArgs.searchStartWatchlist;
  }
  /**
   * Get max profiles to search from watchlist
   * @returns {Number} max profiles to search from watchlist
   */
  getSearchMaxWatchlist() {
    return this.userArgs.searchMaxWatchlist;
  }
  /**
   * Get min random number
   * @returns {Number} min random number to check random profiles
   */
  getMinRandom() {
    return this.userArgs.minRandom;
  }
  /**
   * Get max random number
   * @returns {Number} max random number to check random profiles
   */
  getMaxRandom() {
    return this.userArgs.maxRandom;
  }

  /*
   * sleep in milliseconds. await this
   * @param duration time in milliseconds
   */
  sleep(duration) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  /*
   * Time to quit? Either at max report or a cancel pending
   * @returns {Boolean} true if at max report or cancel pending
   */
  timeToQuit() {
    if (this.encounteredError ||
       (this.testResults.getReportCount() >= this.getMaxReport()) || 
       (this.testResults.results.maxProfilesReached) ||
       (this.testResults.results.apiLimitReached) ||
       (this.testResults.isCancelPending())) {
      return true;
    } else {
      return false;
    }
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
   * Check relatives for profiles that have source or style issues
   * Differs from check all in that it only checks profiles with source or style issues
   * and thus will need to add the newly found profiles to be checked on each iteration
   * and therefore only checks 1 nuclear at a time
   */
  async checkUnsourcedRelatives() {

    // In this case you want to take the set of profiles from the people manager
    // that have source or style issues, and check them. 
    // This needs to iterate for numRelatives times. The first time it can just
    // use the profiles that are marked already. But on subsequent times, it should
    // only check profiles that had not been checked previously (already have relatives)

    // So the logic inside checkPeople will ignore an input profile Id if the 
    // people manager already has it. In this case, they should not be ignored.

    // Use a set of profiles so that profiles are only checked once
    // The people manager knows who has already been checked
    let stateMessage = "Examining relatives for unsourced profiles";
    this.testResults.setStateMessage(stateMessage);
    this.alreadyHaveRelatives.clear();
    let numUnsourced = 0;
    let gotAllPeople = false;
    let numRelativeChecks = this.getNumRelatives();
    let chokedDown = false;
    if (numRelativeChecks > BioChecker.MAX_UNSOURCED_RELATIVES) {
      chokedDown = true;
      numRelativeChecks = BioChecker.MAX_UNSOURCED_RELATIVES;
    }
    if (!this.timeToQuit() && numRelativeChecks > 0) {
      numUnsourced = this.thePeopleManager.getUnmarkedProfileCount() +
          this.thePeopleManager.getMarkedProfileCount() +
          this.thePeopleManager.getStyleProfileCount();
      if (numUnsourced > 0) {
        let profileIdSet = new Set();
        this.alreadyHaveRelatives = new Set();
        let checkNum = 0;
        while (checkNum < numRelativeChecks && !this.timeToQuit() && !gotAllPeople) {
          this.thePeopleManager.getUnmarkedProfileIds().forEach((item) => profileIdSet.add(item));
          this.thePeopleManager.getMarkedProfileIds().forEach((item) => profileIdSet.add(item));
          this.thePeopleManager.getStyleProfileIds().forEach((item) => profileIdSet.add(item));
          let profilesToCheck = [];
          for (let profileId of profileIdSet) {
            if (!this.alreadyHaveRelatives.has(profileId)) {
              profilesToCheck.push(profileId);
              this.alreadyHaveRelatives.add(profileId);  // will have them next time
            }
          }
          if (profilesToCheck.length == 0) {
            gotAllPeople = true; // So here there are no more to be found
          } else {
            let maxMsg = numRelativeChecks;
            if (chokedDown) {
              maxMsg = 'within a maximum of ' + numRelativeChecks;
            }
            let stateMessage = "Examining " + profilesToCheck.length + " profiles within " + maxMsg + 
                " degrees of profiles with source or style issues";
            this.testResults.setStateMessage(stateMessage);
          }
          // instead of N nuclear here we want 1 nuclear for each iteration of unsourced checking
          await this.pageThroughPeople(profilesToCheck, 0, 0, 1);
          checkNum++;
        }
      }
    }
  }

  /*
   * Determine if need to check bio
   * If the person does not have a bio, call the API to get it
   * and check it
   * @param {BioChecPerson} thePerson person to be checked
   * @returns {Boolean} true if need to get and check bio
   */
  needToGetBio(thePerson) {
    let needToCheckBio = false;
    if (!this.thePeopleManager.hasPerson(thePerson.getProfileId())) {
      this.thePeopleManager.addPerson(
        thePerson.getProfileId(),
        thePerson.getWikiTreeId()
      );
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
   * @param {BioChecPerson} thePerson person to be checked
   * @returns {Promise} a promise to resolve when person finished
   */
  async checkPerson(thePerson) {
    let url = BioChecker.WIKI_TREE_URI + "?action=getBio" + BioChecker.MY_ID_KEY  + " &resolveRedirect=1&key=" + thePerson.getProfileId();
    this.pendingRequestCount++;
    this.testResults.countRequest();  // instrumentation
    let fetchResponse = await fetch(url, {
      credentials: "include",
    });
    if (!fetchResponse.ok) {
      console.log("Error from getBio " + fetchResponse.status);
    } else {
      let theJson = await fetchResponse.json();
      if (!this.timeToQuit()) {
        let bioObj = theJson[0];
        if (bioObj.status === "Permission denied") {
          this.testResults.addUncheckedDueToPrivacy();
          this.testResults.setProgressMessage(
            "Profile " + thePerson.getWikiTreeId() + " privacy does not allow testing"
          );
          console.log("Get Bio for Profile " + thePerson.getWikiTreeId() + " privacy does not allow testing");
        } else {
          this.testResults.setProgressMessage("Examining profile for " + thePerson.getWikiTreeId());
          if (bioObj.bio != null) {
            let bioString = bioObj.bio;
            this.checkBio(thePerson, bioString);
          } else {
            this.testResults.addUncheckedDueToPrivacy();
            this.testResults.setProgressMessage(
              "Profile " + thePerson.getWikiTreeId() + " privacy does not allow testing"
            );
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
   * @param thePerson {BioCheckPerson} person to check
   * @param {String} bioString the bio
   */
  async checkBio(thePerson, bioString) {
    let startTime = new Date();                    // timing instrumentation

    // get information about person dates
    let isPre1500 = thePerson.isPre1500();
    let isPre1700 = thePerson.isPre1700();
    let bioUndated = false;
    if (thePerson.isUndated() && thePerson.getPrivacy() > 0) {
      bioUndated = true;
    }

    let biography = new Biography(theSourceRules);
    if (this.userArgs.reliableSourcesOnly) {
      biography.applyPre1700ToAll();
    }
    biography.parse(bioString, thePerson, this.getBioSearchString());
    biography.validate();

    let endTime = new Date();
    let timeDiff = endTime.getTime() - startTime.getTime();
    this.totalValidateTime = this.totalValidateTime + timeDiff;
    this.testResults.setTotalValidateTime(this.totalValidateTime);

    // keep track of what you found
    if (biography.hasStyleIssues()) {
      this.thePeopleManager.setProfileStyle(thePerson.getProfileId());
    }
    if (biography.isMarkedUnsourced()) {
      this.thePeopleManager.setProfileMarked(thePerson.getProfileId());
    } else {
      if (!biography.hasSources()) {
        this.thePeopleManager.setProfileUnmarked(thePerson.getProfileId());
      }
    }
    // add person to report
    this.testResults.addProfile(
      biography, thePerson,
      this.getReportAllProfiles(),
      this.getReportNonManaged(),
      this.getReportStyleDetails(),
      this.getReportStatsOnly(),
      this.getUserId());

    // allow garbage collection
    biography = null;
    thePerson.clearBio();
  }

  /*
   * Check people a chunk (page) at a time
  */
  async pageThroughPeople(profileIdArray, numAncestors, numDescendents, numRelatives) {
    let limit = BioChecker.GET_PEOPLE_MAX_RESPONSE;
    let start = 0;
    let gotAllPeople = false;
    let counter = 0;
    while (!gotAllPeople && !this.timeToQuit()) {
      await this.checkPeople(profileIdArray, numAncestors, numDescendents, numRelatives, 0, limit, start);
      if (!this.testResults.results.maxProfilesReached) {  // max reached in getPeople response
        if (this.peopleCount < limit) {
          gotAllPeople = true;
        } else {
          start += limit;
          counter++;
          if (counter > BioChecker.GET_PEOPLE_MAX_PAGES) {
            this.testResults.results.maxProfilesReached = true;
          }
        }
      }
    }
  }

  /*
   * Check a collection of people.
   * Wait for all to complete and report.
   * @param profileIdArray {Array} an array of profile Id to check
   * @param ancestorGen {Number} number of ancestor generations
   * @param descendantGen {Number} number of descendant generations
   * @param numRelatives {Number} number of connections (nuclear)
   * @param minGen {Number} minGen for nuclear
   * @param limit {Number} max number to return
   * @param start {Number} start search
   */
  async checkPeople(profileIdArray, ancestorGen, descendantGen, numRelatives, minGen, limit, start) {
    let isIpad = false;
    if (navigator.userAgent.indexOf('iPad') > 0) {
      isIpad = true;
    }
    let gotAllPeople = false;

    let maxApiProfiles = BioChecker.MAX_API_PROFILES;
    if ((ancestorGen + descendantGen + numRelatives) == 0) {
      maxApiProfiles = BioChecker.LARGE_MAX_API_PROFILES;
      if (profileIdArray.length <= BioChecker.LARGE_MAX_API_PROFILES) {
        maxApiProfiles = BioChecker.MEDIUM_MAX_API_PROFILES;  // for the impatient
      }
    }
    let profileIds = [];
    for (let i = 0; i < profileIdArray.length; i++) {
      profileIds.push(profileIdArray[i]);
    }
    if (profileIds.length > 0) {
      // We have a list of profiles to examine
      // Do these in chunks to the WikiTree API server
      let startIndex = 0;
// TODO this is just to test to force API limits on the apps server
// for testing ONLY
//maxApiProfiles = 1;
      let endIndex = maxApiProfiles;
      while ((startIndex <= profileIds.length) && !this.timeToQuit()) {
        if (endIndex > profileIds.length) {
          endIndex = profileIds.length
        }
        let profileIdGroup = profileIds.slice(startIndex, endIndex);
        let profileId = profileIdGroup.join();
        let msg = "";
        if (this.testResults.results.totalProfileCount > 0) {
          msg = "Examined " + this.testResults.results.totalProfileCount + " profiles. ";
        }
        msg += "Examining ";
        if (profileIdGroup.length > 1) {
          msg = msg + profileIdGroup.length;
        } else {
          msg = msg + 'up to ' + limit;
        }
        if ((start > 0) || (startIndex > 0)) {
          msg = msg + ' more';
        }
        msg = msg + ' profiles';
        this.testResults.setProgressMessage(msg);
        let formData = new FormData();
        formData.append('action', 'getPeople');
        formData.append('keys', profileId);
        let requestFields = BioChecker.BASIC_PROFILE_REQUEST_FIELDS;
        formData.append('fields', requestFields);
        formData.append('resolveRedirect', 1);
        formData.append('appId', BioChecker.MY_ID);
        if (ancestorGen > 0) {
          formData.append('ancestors', ancestorGen);
        }
        if (descendantGen > 0) {
          formData.append('descendants', descendantGen);
        }
        if (numRelatives > 0) {
          formData.append('nuclear', numRelatives);
        }
        if (minGen > 0) {
          formData.append('minGeneration', minGen);
        }
        if (limit > 0) {
          formData.append('limit', limit);
        }
        if (start > 0) {
          formData.append('start', start);
        }
        let options = {
          method: "POST",
          credentials: "include",
          signal: this.userArgs.abortController.signal,

          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(formData),
        };

        this.setDetailedProgress();
        this.pendingRequestCount++;
        try {
          this.testResults.countRequest();  // instrumentation
          let startTime = new Date();                    // timing instrumentation
          const fetchResponse = await fetch(BioChecker.WIKI_TREE_URI, options);
          if (!fetchResponse.ok) {
            this.errorCleanup("Error from getPeople " + fetchResponse.status);
          } else {
            let theJson = await fetchResponse.json();
            let endTime = new Date();
            let timeDiff = endTime.getTime() - startTime.getTime();
            this.totalFetchTime = this.totalFetchTime + timeDiff;
            this.testResults.setTotalFetchTime(this.totalFetchTime);
            let responseObj = theJson[0];
            let responseStatus = responseObj.status;
            if ((responseStatus != 0)) {
              if (responseStatus.startsWith('Limit exceeded')) {
                this.testResults.results.apiLimitReached = true;
              }
              if (responseStatus.startsWith('Maximum number of profiles')) {
                this.testResults.results.maxProfilesReached = true;
              }
            } else {
              let personArray = Object.values(responseObj.people);
              this.peopleCount = personArray.length;
              if (personArray.length >= limit) {
                gotAllPeople = true;  
              }
//console.log('peopleCount ' + this.peopleCount);              
              // for some reason with logging on this avoids TypeError:Load Failed on the iPad
              // but trying a 10 ms wait did not avoid the error
              if (isIpad) { 
                console.log('getPeople returned array of length ' + personArray.length);
              }

              let personNum = 0;
              // Don't count private profiles (id < 0)
              while ((personNum < personArray.length) && !this.timeToQuit()) {
                let profileObj = personArray[personNum];
                if (profileObj.Id < 0) {
                  this.testResults.addUncheckedDueToPrivacy();
                } else {
                  // check for a silently ignored max where nuclear is > 1 but
                  // results returned are the single profile that was requested which we already have
                  //if ((personArray.length == 1) && (numRelatives > 0) && 
                  if ((personArray.length == 1) &&
                    (this.thePeopleManager.hasPerson(profileObj.Id))) {
                    gotAllPeople = true;
                  } else {
                    // check for duplicate nuclear you already have
                    if (!this.alreadyHaveRelatives.has(profileObj.Id)) {
                      let thePerson = new BioCheckPerson();
                      let canUseThis = thePerson.canUse(profileObj, this.getOpenOnly(),
                        this.getOrphanOnly(),
                        this.getIgnorePre1500(), this.getUserId());
                      if (!canUseThis) {
                        this.testResults.countProfile(0, thePerson.isUncheckedDueToPrivacy(),
                          thePerson.isUncheckedDueToDate());
                      } else {
                        if (!this.thePeopleManager.hasPerson(thePerson.getProfileId()) && !this.timeToQuit()) {
                          this.testResults.countProfile(1, thePerson.isUncheckedDueToPrivacy(),
                            thePerson.isUncheckedDueToDate());
                          this.saveAncestorParents(profileObj);
                          if (this.pendingRequestCount > BioChecker.MAX_PENDING_PEOPLE_REQUESTS) {
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
                      thePerson = null; // allow GC
                    }
                  }
                }
                personNum++;
              }
              theJson = null; // allow GC
              responseObj = null;
              personArray = null;
            }
          }
        } catch (error) {
          if (error.name != 'AbortError') {
            this.errorCleanup("Error from getPeople " + error);
          }
        }
        startIndex = startIndex + maxApiProfiles;
        endIndex = endIndex + maxApiProfiles;
      }
    }

    let promiseArray = await this.promiseCollection;
    let allPromises = Promise.all(promiseArray);
    await allPromises;
    this.promiseCollection = new Array();
    promiseArray = await this.promiseCollection;
  }

  /* 
   * Cleanup on caught error
   */
  errorCleanup(errorMessage) {
    console.log(errorMessage);
    this.testResults.setErrorMessage(errorMessage);
    this.testResults.resetStateOnError();
    this.testResults.setProgressMessage("Error getting profiles " + errorMessage);
    this.encounteredError = true; // escape loop
  }

  /*
   * Save parents for an ancestor
   * Needed to check more than limit number of ancestors
   * @param {Object} profileObj the profile
   */
  saveAncestorParents(profileObj) {
    let id = 0;
    if (profileObj.Mother != null) {
      id = profileObj.Mother;
      if (id != 0) {
        this.ancestorParents.add(id);
      }
    }
    if (profileObj.Father != null) {
      id = profileObj.Father;
      if (id != 0) {
        this.ancestorParents.add(id);
      }
    }
  }
}
