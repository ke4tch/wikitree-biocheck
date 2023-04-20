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

  relativesIncrement = 400;
  requestedProfileCount = 0; // total number of profiles examined
  promiseCollection = []; // what we are waiting for
  pendingRequestCount = 0; // how many we are waiting for
  verbose = false; // control logging
  reachedMaxProfiles = false;  // true if we hit max profiles from checkPeople
  reportReachedMax = false;    // true to report that we reached max
  ancestorParents = new Set();
  alreadyHaveRelatives = new Set();
  encounteredError = false;

  userArgs = null;

  totalValidateTime = 0; // optionally report total ms for validation

  useGetPeopleAPI = true;

  static MAX_PENDING_REQUESTS = 80; // after this many wait for all responses from server
  static MAX_PENDING_PEOPLE_REQUESTS = 8; // after this many wait for all responses from server
  static SYNC_DELAY_MS = 80; // milliseconds to delay to sync with server
  static MAX_TO_CHECK = 10000;
  static WIKI_TREE_URI = "https://api.wikitree.com/api.php";
  // staging.wikitree.com 
  static BASIC_PROFILE_REQUEST_FIELDS =
    "Id,Name,IsLiving,Privacy,Manager,BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,FirstName,RealName,LastNameCurrent,LastNameAtBirth,Mother,Father,Bio";
  static REDIRECT_KEY = "&resolveRedirect=1";
  static MAX_API_PROFILES = 100;
  static MAX_RELATIVES = 10;
  static GET_PEOPLE_MAX_RESPONSE = 1000;

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
   * Get check auto generated argument
   * @returns {Boolean} true to report any profile with a biography containing
   * the string "auto-generated by a gedcom import"
   */
  getCheckAutoGenerated() {
    return this.userArgs.checkAutoGenerated;
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
   * Get sources report argument
   * @returns {Boolean} true to report sources
   */
  getSourcesReport() {
    return this.userArgs.sourcesReport;
  }
  /**
   * Get profile review report argument
   * @returns {Boolean} true to report profiles for review
   */
  getProfileReviewReport() {
    return this.userArgs.profileReviewReport;
  }
  /**
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
       this.testResults.isCancelPending()) {
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
   * Check relatives
   */
  async checkRelatives(anchorId) {
    let stateMessage = "Examining relatives";
    this.testResults.setStateMessage(stateMessage);
    this.testResults.setProgressMessage("Examining relatives");
    this.alreadyHaveRelatives.clear();
    let numUnsourced = 0;
    if (!this.timeToQuit() && this.getNumRelatives() > 0) {
      if (this.getCheckAllConnections()) {

        if (this.reachedMaxProfiles) {        // failed with getPeople
          numUnsourced = this.thePeopleManager.getProfileCount();
          if (numUnsourced === 0) {
            numUnsourced = 1;  // so need to check the anchor Id
          }
//          await this.checkAllRelatives(anchorId);
          await this.trySomethingElse(anchorId);
        }
      } else {
        numUnsourced = this.thePeopleManager.getUnmarkedProfileCount() +
          this.thePeopleManager.getMarkedProfileCount() +
          this.thePeopleManager.getStyleProfileCount();
        if (numUnsourced > 0) {
          await this.checkUnsourcedRelatives(numUnsourced);
        }
      }
    }
  }

  /*
   * Try something different
   */
  // So if getPeople fails with too many relatives
  // Remember where it failed and start going back one generation
  // until if succeeds. Then you have those, then start at the next
  // using start and minGen to pick up the rest.
  // Might work
  async trySomethingElse(anchorId) {
    let profilesToCheck = [];
//    profilesToCheck.push(anchorId);
    this.reachedMaxProfiles = false;
    let profileIdSet = new Set();
    let numGen = this.getNumRelatives();
    
//    if ((this.getNumAncestorGen() === 0) && (this.getNumDescendantGen() === 0)) {
      profilesToCheck.push(anchorId);
//    } else {
      /*
      this.thePeopleManager.getAllProfileIds().forEach((item) => profileIdSet.add(item));
      for (let profileId of profileIdSet) {
        if (!this.alreadyHaveRelatives.has(profileId)) {
          profilesToCheck.push(profileId);
          this.alreadyHaveRelatives.add(profileId);  // will have them next time
        }
      }
      */
 //   }

    /*
    let lastGen = numGen;
let thisGen = numGen - 1;
console.log('thisGen ' + thisGen);
      await this.checkPeople(profilesToCheck, 0, 0, thisGen, 0);
        if (this.reachedMaxProfiles) {        // failed with getPeople
console.log('back up another generation?');

        } else {
          thisGen++;
      await this.checkPeople(profilesToCheck, 0, 0, thisGen, thisGen);
        }
    */

    // okay it looks like this will work, now figure out the logic
    // back up one degree at a time until it succeeds
    let keepLooking = true;
    let start = 0;
    let limit = 1000;
    let nuclear = this.getNumRelatives() - 1;
    while (keepLooking && (nuclear > 0)) {
//      await this.checkPeople(profilesToCheck, 0, 0, nuclear, 0);
      await this.checkPeople(profilesToCheck, this.getNumAncestorGen(), this.getNumDescendantGen(), nuclear, 0, limit, start);
      if (this.reachedMaxProfiles) {        // failed with getPeople
        nuclear--;
      } else {
        keepLooking = false;
      }
    }
    // once it succeeds then go forward one degree at a time until
    // you reach the desired number or it fails again (in that case, bail)
    let currentGen = nuclear + 1;
    this.reachedMaxProfiles = false;
    while ((currentGen <= numGen) && (!this.reachedMaxProfiles)) {
//      await this.checkPeople(profilesToCheck, 0, 0, currentGen, currentGen-1);
      await this.checkPeople(profilesToCheck, this.getNumAncestorGen(), this.getNumDescendantGen(), currentGen,
      currentGen-1, limit, start);
console.log('reached max ' + this.reachedMaxProfiles);
      currentGen++;
    }

// and just a special test.
console.log('special test with 6, 5, 700, 600');
      await this.checkPeople(profilesToCheck, 0, 0, 6, 5, 700, 600);
console.log('reached max ' + this.reachedMaxProfiles);
console.log('special test with 7, 6, 800, 500');
      await this.checkPeople(profilesToCheck, 0, 0, 7, 6, 800, 500);
console.log('reached max ' + this.reachedMaxProfiles);
console.log('special test with 7, 6, 1000, 1000');
      await this.checkPeople(profilesToCheck, 0, 0, 7, 6, 1000, 1000);
console.log('special test with 7, 6, 1000, 2000');
      await this.checkPeople(profilesToCheck, 0, 0, 7, 6, 1000, 2000);
console.log('special test with 7, 6, 1000, 3000');
      await this.checkPeople(profilesToCheck, 0, 0, 7, 6, 1000, 3000);

    // so this seems to work but will just fail eventually. 
    // what if there are ancestor/descendant generations?
    // that case is certainly failing

  }

  /*
   * Check all relatives
   */
  async checkAllRelatives(anchorId) {

    // typically will only get here when we have reached the max number of profiles
    // so arbitrarily take the input numbers and ask for smaller chunks
    // You could have just one profile (the anchorId) or you might also have
    // ancestors and descendants.  But if you get here, you have reached max, so
    // you want to check all relatives for all profiles already tested, but will there
    // be any if it died at max, probably not. But have you done the getAncestors and descendants?
    // yes, the ancestors and descendants should be in the PeopleManager, as is the anchor id.

    // and if ancestors and descendants both 0, this should also fail

    // When ancestors and descendants and check all with too many it comes in with the 
    // people manager holding the collection of ancestors and descendants. 
    // In this case you want to take the people manager collection and check 1 nuclear
    // until you get to numRelatives, in each iteration ignoring ones previously tested.
    // But you do want the check to check each one in the collection.

    // When no ancestors or descendants and check all with too many, you want to 
    // start with the anchor Id and for each numRelatives check with minGeneration the
    // same as numRelatives. This will eventually fail. At that point, do you want to
    // try with the collection of profiles from the previous generation?

    // So the logic inside checkPeople will ignore an input profile Id if the 
    // people manager already has it. In this case, they should not be ignored.

    if (this.reachedMaxProfiles) {
      this.reportReachedMax = true;
    }
console.log('checkAllRelatives for anchorId ' + anchorId + ' with reachedMax ' + this.reachedMaxProfiles);
    if (this.thePeopleManager.getProfileId(anchorId)) {
      anchorId = this.thePeopleManager.getProfileId(anchorId);
    }
    this.reachedMaxProfiles = false;
    let profileIdSet = new Set();
    let profilesToCheck = [];
    let checkNum = 0;
    let profileGroup = [];              // just profiles from this check

console.log('checkAllRelatives numAncestorGen ' + this.getNumAncestorGen() + ' descendentGen ' +
this.getNumDescendantGen());
    if ((this.getNumAncestorGen() === 0) && (this.getNumDescendantGen() === 0)) {
      profilesToCheck.push(anchorId);
    } else {
      this.thePeopleManager.getAllProfileIds().forEach((item) => profileIdSet.add(item));
      for (let profileId of profileIdSet) {
        if (!this.alreadyHaveRelatives.has(profileId)) {
          profilesToCheck.push(profileId);
          this.alreadyHaveRelatives.add(profileId);  // will have them next time
        }
      }
    }
console.log('numRelatives ' + this.getNumRelatives);
    // So try to get a generation at a time from getPeople
    while (checkNum < this.getNumRelatives() && !this.timeToQuit() && !this.reachedMaxProfiles) {
      checkNum++;
      let minGen = checkNum;
      let stateMessage = "Examining relatives for generation " + checkNum;
      this.testResults.setStateMessage(stateMessage);
console.log('call checkPeople checkNum ' + checkNum + ' minGen ' + minGen);

      await this.checkPeople(profilesToCheck, 0, 0, checkNum, minGen, 1000, 0);
console.log('now reachedMax ' + this.reachedMaxProfiles + ' and checkNum ' + checkNum);
      if (!this.reachedMaxProfiles) {
        this.thePeopleManager.getAllProfileIds().forEach((item) => profileIdSet.add(item));
        profileGroup = [];  // start over
        for (let profileId of profileIdSet) {
          if (!this.alreadyHaveRelatives.has(profileId)) {
            this.alreadyHaveRelatives.add(profileId);  // will have them next time
            profileGroup.push(profileId);          // this group
          }
        }
      }
    }
    if (this.reachedMaxProfiles) {
      this.reportReachedMax = true;
      this.reachedMaxProfiles = false;  // fall through for additional checks
//      checkNum--;
      profilesToCheck = [...profileGroup];
console.log('fall thru for more checks');
    }
console.log('checkNum ' + checkNum);
    // TODO how do you deal with the above request for nuclear that does not
    // tell you when it has returned some but not all of the profiles?
    // and if you hit that max, should you continue?

    while (checkNum <= this.getNumRelatives() && !this.timeToQuit() && !this.reachedMaxProfiles) {
      let stateMessage = "Examining relatives for generation " + checkNum;
console.log('Examining relatives for generation ' + checkNum);
      this.testResults.setStateMessage(stateMessage);
      await this.checkPeople(profilesToCheck, 0, 0, 1, 0, 1000, 0);
      checkNum++;
      this.thePeopleManager.getAllProfileIds().forEach((item) => profileIdSet.add(item));
      profilesToCheck = [];
      for (let profileId of profileIdSet) {
        if (!this.alreadyHaveRelatives.has(profileId)) {
          profilesToCheck.push(profileId);
          this.alreadyHaveRelatives.add(profileId);  // will have them next time
        }
      }
    }
    if (this.reachedMaxProfiles) {
      this.reportReachedMax = true;
    }
  }

  /*
   * Check relatives for profiles that have source or style issues
   * Differs from check all in that it only checks profiles with source or style issues
   * and thus will need to add the newly found profiles to be checked on each iteration
   * and therefore only checks 1 nuclear at a time
   */
  async checkUnsourcedRelatives(numUnsourced) {

    // In this case you want to take the set of profiles from the people manager
    // that have source or style issues, and check them. 
    // This needs to iterate for numRelatives times. The first time it can just
    // use the profiles that are marked already. But on subsequent times, it should
    // only check profiles that had not been checked previously (already have relatives)

    // So the logic inside checkPeople will ignore an input profile Id if the 
    // people manager already has it. In this case, they should not be ignored.

    // Use a set of profiles so that profiles are only checked once
    // The people manager knows who has already been checked
    if (this.reachedMaxProfiles) {
      this.reportReachedMax = true;
    }
    let profileIdSet = new Set();
    this.alreadyHaveRelatives = new Set();
    let checkNum = 0;
    while (checkNum < this.getNumRelatives() && !this.timeToQuit() && !this.reachedMaxProfiles) {
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
      let stateMessage = "Examining relatives for " + profilesToCheck.length + " profiles";
      this.testResults.setStateMessage(stateMessage);
      await this.checkPeople(profilesToCheck, 0, 0, 1, 0);
      checkNum++;
    }
    if (this.reachedMaxProfiles) {
      this.reportReachedMax = true;
    }
  }

  /*
   * Determine if need to check bio
   * If the person does not have a bio, call the API to get it
   * and check it
   * @param thePerson person to be checked
   * @returns {Boolean} true if need to get and check bio
   */
  needToGetBio(thePerson) {
    let needToCheckBio = false;
    if (!this.thePeopleManager.hasPerson(thePerson.getProfileId())) {
      this.thePeopleManager.addPerson(
        thePerson.getProfileId(),
        thePerson.getWikiTreeId(),
        thePerson.getRequestedProfileId()
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
   * @param thePerson to be checked
   * @returns {Promise} a promise to resolve when person finished
   */
  async checkPerson(thePerson) {
    let url = BioChecker.WIKI_TREE_URI + "?action=getBio" + "&resolveRedirect=1&key=" + thePerson.getProfileId();
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
    this.testResults.setProgressMessage("Examining profile for " + thePerson.getWikiTreeId());

    //    let startTime = new Date();                    // timing instrumentation

    // get information about person dates
    let isPre1500 = thePerson.isPersonPre1500();
    let isPre1700 = thePerson.isPersonPre1700();
    let mustBeOpen = thePerson.mustBeOpen();
    let bioUndated = false;
    if (thePerson.isUndated() && thePerson.getPrivacy() > 0) {
      bioUndated = true;
    }

    let biography = new Biography(theSourceRules);
    biography.parse(bioString, isPre1500, isPre1700, mustBeOpen, bioUndated, this.getCheckAutoGenerated());
    biography.validate();

    //    let endTime = new Date();
    //    let timeDiff = endTime.getTime() - startTime.getTime();
    //    this.totalValidateTime = this.totalValidateTime + timeDiff;

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
      biography,
      thePerson.getProfileId(),
      thePerson.getWikiTreeId(),
      thePerson.getWikiTreeLink(),
      thePerson.getReportName(),
      thePerson.getManagerId(),
      thePerson.getPrivacyString(),
      thePerson.getReportDate(true),
      thePerson.getReportDate(false),
      this.getReportAllProfiles(),
      this.getReportNonManaged(),
      this.getSourcesReport(),
      this.getProfileReviewReport(),
      this.getReportStatsOnly(),
      this.getUserId()
    );

    // allow garbage collection
    biography = null;
    thePerson.clearBio();
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

    if (this.useGetPeopleAPI) {
      if (this.reachedMaxProfiles) {
        this.reportReachedMax = true;
      }
      this.reachedMaxProfiles = false;
      let profileIds = [];
      for (let i = 0; i < profileIdArray.length; i++) {
        profileIds.push(profileIdArray[i]);
      }

      if (profileIds.length > 0) {
        // We have a list of profiles to examine
        // Do these in chunks to the WikiTree API server
        let startIndex = 0;
        let endIndex = BioChecker.MAX_API_PROFILES;
        while ((startIndex <= profileIds.length) && !this.timeToQuit() && !this.reachedMaxProfiles) {
          if (endIndex > profileIds.length) {
            endIndex = profileIds.length
          }
          let profileIdGroup = profileIds.slice(startIndex, endIndex);
          let profileId = profileIdGroup.join();
          let formData = new FormData();
          formData.append('action', 'getPeople');
          formData.append('keys', profileId);
          let requestFields = BioChecker.BASIC_PROFILE_REQUEST_FIELDS;
          formData.append('fields', requestFields);
          formData.append('resolveRedirect', 1);
          formData.append('appId', 'bioCheck');
//formData.append('start', 0);
// and you may have to always go for nuclear in chunks since there 
// doesn't seem to be an error when you hit 1000
          // TODO add start
          // TODO add limit 
          // and see what these do
console.log('checkPeople ancestorGen ' + ancestorGen + ' descendantGen ' + descendantGen + ' numRelatives ' +
numRelatives + ' minGen ' + minGen + ' limit ' + limit + ' start ' + start);

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
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(formData),
          };

          this.setDetailedProgress();
          this.pendingRequestCount++;
          try {
            this.testResults.countRequest();  // instrumentation
            const fetchResponse = await fetch(BioChecker.WIKI_TREE_URI, options);
            if (!fetchResponse.ok) {
              this.errorCleanup("Error from getPeople " + fetchResponse.status);
            } else {
              let theJson = await fetchResponse.json();
              let responseObj = theJson[0];
              let responseStatus = responseObj.status;
console.log('responseStatus ' + responseStatus);
              let personArray = Object.values(responseObj.people);
console.log('getPeople returned array of length ' + personArray.length);
  //static GET_PEOPLE_MAX_RESPONSE = 1000;
if (personArray.length >= BioChecker.GET_PEOPLE_MAX_RESPONSE) {
                  this.reachedMaxProfiles = true;
}
              if ((responseStatus != 0) || (this.reachedMaxProfiles)) {
                if (responseStatus.startsWith('Maximum number of profiles')) {
                  console.log('Maximum number of profiles');
                  this.reachedMaxProfiles = true;
                }
              } else {
//                let personArray = Object.values(responseObj.people);
                // for some reason with logging on this avoids TypeError:Load Failed on the iPad
                // but trying a 10 ms wait did not avoid the error
//                if (isIpad) { 
                  console.log('getPeople returned array of length ' + personArray.length);
//                }

                let personNum = 0;
                // Don't count private profiles (id < 0)
                while ((personNum < personArray.length) && !this.timeToQuit() && !this.reachedMaxProfiles) {
                  let profileObj = personArray[personNum];
                  if (profileObj.Id < 0) {
                    this.testResults.addUncheckedDueToPrivacy();
                  } else {
                    // check for a silently ignored max where nuclear is > 1 but
                    // results returned are the single profile that was requested which we already have
                    //if ((personArray.length == 1) && (numRelatives > 0) && 
                    if ((personArray.length == 1) &&
                      (this.thePeopleManager.hasPerson(profileObj.Id))) {
                      this.reachedMaxProfiles = true;
                    } else {
                      // check for duplicate nuclear you already have
                      if (!this.alreadyHaveRelatives.has(profileObj.Id)) {
                        let thePerson = new BioCheckPerson();
                        let canUseThis = thePerson.build(profileObj, this.getOpenOnly(),
                          this.getIgnorePre1500(), this.getUserId(), profileId);
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
            this.errorCleanup("Error from getPeople " + error);
          }
          startIndex = startIndex + BioChecker.MAX_API_PROFILES;
          endIndex = endIndex + BioChecker.MAX_API_PROFILES;
        }
      }
    } else {
      await this.checkProfileCollection(profileIdArray, numRelatives);
    }

    // Wait for all to complete then check relatives and report
    // the ability to check relatives for a WikiTree+ query is not currently available in the GUI
    let promiseArray = await this.promiseCollection;
    let allPromises = Promise.all(promiseArray);
    await allPromises;
    this.promiseCollection = new Array();
    promiseArray = await this.promiseCollection;
    if (this.reachedMaxProfiles) {
      this.reportReachedMax = true;
    }
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
   * Check a collection of profiles.
   * used when getPeopleAPI not available
   * Wait for all to complete 
   * @param profileIdArray {Array} an array of profile Id to check
   * @param numRelatives {Number} number of connections (nuclear)
   */
  async checkProfileCollection(profileIdArray, numRelatives) {
    let relativesAlreadyChecked = new Set();
    let persons = [];
    let i = 0;
    while ((i < profileIdArray.length) && !this.timeToQuit()) {
      let profileId = profileIdArray[i];
      if (numRelatives > 0) {
        if (!this.alreadyHaveRelatives.has(profileId) && !this.timeToQuit()) {
          this.alreadyHaveRelatives.add(profileId);
          let promise = this.checkNuclearRelatives(profileId, persons, relativesAlreadyChecked);
          await promise;
          let msg = "Examining relatives for" + " degree number " + i + " for " + persons.length + " profiles";
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
        let promiseArray = await this.promiseCollection;
        let allPromises = Promise.all(promiseArray);
        await allPromises;
        this.promiseCollection = new Array();
      } else {
        // don't need to check relatives, just get check the single profile in this iteration
        if (!this.thePeopleManager.hasPerson(profileId)) {
          let url = BioChecker.WIKI_TREE_URI +
            "?action=getPerson" + "&key=" + profileId +
            "&fields=" + BioChecker.BASIC_PROFILE_REQUEST_FIELDS + BioChecker.REDIRECT_KEY;
          this.setDetailedProgress();
          this.pendingRequestCount++;
          try {
            this.testResults.countRequest();  // instrumentation
            const fetchResponse = await fetch(url, {
              credentials: "include",
            });
            if (!fetchResponse.ok) {
              console.log("Error from getPerson " + fetchResponse.status + " profileId " + profileId);
            }
            let theJson = await fetchResponse.json();
            let responseObj = theJson[0];
            let responseStatus = responseObj.status;
            if (responseStatus != 0) {
              console.log("status  is " + responseObj["status"] + " profileId " + profileId);
            } else {
              if (responseObj.person != null) {
                let profileObj = responseObj.person;
                let thePerson = new BioCheckPerson();
                let canUseThis = thePerson.build(profileObj, this.getOpenOnly(), this.getIgnorePre1500(), this.getUserId(), profileId
                );
                if (!canUseThis) {
                  this.testResults.countProfile(0, thePerson.isUncheckedDueToPrivacy(), thePerson.isUncheckedDueToDate());
                } else {
                  if (profileId != thePerson.getProfileId()) {
                    this.testResults.addRedirectedProfile();
                  }
                  if (!this.thePeopleManager.hasPerson(thePerson.getProfileId()) && !this.timeToQuit()) {
                    this.testResults.countProfile(1, thePerson.isUncheckedDueToPrivacy(),
                      thePerson.isUncheckedDueToDate());
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
              }
            }
          } catch (error) {
//            console.log("Error from getPerson " + error + " profileId " + profileId);
//            this.testResults.setProgressMessage("Error getting profile " + profileId + " " + error);
            this.errorCleanup("Error from getPerson " + error);
          }
        }
      }
      i++;
    }
    let promiseArray = await this.promiseCollection;
    let allPromises = Promise.all(promiseArray);
    await allPromises;
    this.promiseCollection = new Array();
    promiseArray = await this.promiseCollection;
  }

  /* xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx */

  /*
   * check relatives
   * @param {String} profileIds to test (can be a , delimited list)
   * @param {Array} persons to be tested
   * @returns {Promise} a promise to resolve when relatives found
   */
  async checkNuclearRelatives(profileId, persons, relativesAlreadyChecked) {
    try {
      const url =
        BioChecker.WIKI_TREE_URI +
        "?action=getRelatives&keys=" +
        profileId +
        "&getParents=true&getChildren=true&getSpouses=true&getSiblings=true" +
        "&fields=" +
        BioChecker.BASIC_PROFILE_REQUEST_FIELDS +
        BioChecker.REDIRECT_KEY;
      this.pendingRequestCount++;
      this.testResults.countRequest();  // instrumentation
      const fetchResponse = await fetch(url, {
        credentials: "include",
      });
      if (!fetchResponse.ok) {
        console.log("Error from getRelatives " + fetchResponse.status);
      }
      const theJson = await fetchResponse.json();
      let relatives = theJson[0].items;
      let personNum = 0;
      while (personNum < relatives.length && !this.timeToQuit()) {
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
//      console.log("Error from getRelatives for " + profileId + " " + error);
//      this.testResults.setProgressMessage("Error getting relatives " + error);
      this.errorCleanup("Error from getRelatives for " + profileId + " " + error);
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
   * @param {Array} personArray array of person objects
   * @param {Object} persons collection of Person to check
   * @param {Array} relativesAlreadyChecked
   */
  gatherFamilyMembers(personArray, persons, relativesAlreadyChecked) {
    for (let i = 0; i < personArray.length; i++) {
      let thePerson = new BioCheckPerson();
      let canUseThis = thePerson.build(
        personArray[i],
        this.getOpenOnly(),
        this.getIgnorePre1500(),
        this.getUserId(),
        0
      );
      if (
        !relativesAlreadyChecked.has(thePerson.getProfileId()) &&
        !this.thePeopleManager.hasPerson(thePerson.getProfileId())
      ) {
        this.testResults.countProfile(1, thePerson.isUncheckedDueToPrivacy(), thePerson.isUncheckedDueToDate());
        if (canUseThis) {
          persons.push(thePerson);
          relativesAlreadyChecked.add(thePerson.getProfileId());
        }
      }
    }
  }

  /* xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx */

  /*
   * Save parents for an ancestor
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
