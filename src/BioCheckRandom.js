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
 * Check biographies for a random set of profiles
 * @extends BioChecker
 */
export class BioCheckRandom extends BioChecker {
  /**
   * Constructor
   * @param {BioTestResults} theTestResults container for results 
   * @param {Object} userArgs what to do pushed from the Vue
   */
  constructor(theTestResults, theUserArgs) {
    super(theTestResults, theUserArgs);
  }

  /**
   * Check profiles found via random number generator
   */
  async check() {
    // TODO see what you can do with
    // https://www.wikitree.com/index.php?title=Special:NetworkFeed&showall=1&l=100&created=1
    // then getting the most recent and getting their id as the max rand

    // max captured as of 28 Oct 2022
    const MAX_RANDOM = 36331670;
    this.verbose = false;
    this.unnamedProfileCount = 0;
    this.invalidIdProfileCount = 0;
    this.noPersonCount = 0;
    this.randomProfilesChecked = 0;
    this.privacyCount = 0;

    let minRand = this.getMinRandom();
    let maxRand = this.getMaxRandom();

    // Note that a space page will return Invalid page id when getPerson called
    // with the ID

    let min = minRand;
    this.testResults.setStateMessage("Please wait, checking random profiles...");
    let maxToCheck = this.getSearchMax();
    if (maxToCheck > BioChecker.MAX_TO_CHECK) {
      // let's not kill the api server
      this.testResults.setStateMessage("Check limited to a max of " + BioChecker.MAX_TO_CHECK);
      maxToCheck = BioChecker.MAX_TO_CHECK;
    }
    if (min === "" || min === 0) {
      min = 1;
    }
    if (maxRand <= 0) {
      maxRand = MAX_RANDOM;
    }
    let i = 0;
    if (min >= maxRand) {
      this.testResults.setStateMessage("Random min " + min + " must be less than random max " + maxRand);
      this.testResults.resetStateOnError();
    }

    // possible redirect Root-1678 Bolling-1192
    /*
     * Redirects and space pages
     * Bolling-1192 was merged into Bolling-10
     * Bolling-1193 was 106110558 and Bolling-10 is 501092
     * getPerson for 501092 returns profile
     * getPerson for 106110558 returns invalid user
     *
     * Space:BioCheckHelp is id 31120671 and getPerson returns invalid user
     */
    else
      try {
        console.log("random check starting at " + minRand + " for up to " + maxRand + " xxxxxxxxxxxxxxxxxxxxxxxxxxx");
        while (i < maxToCheck && i <= maxRand && !this.timeToQuit()) {
          // get a profileId from random number generator
          let profileId = this.#getRandomNumber(min, maxRand);
          if (this.verbose) {
            console.log("check random " + i + " profileId " + profileId);
          }
          if (this.thePeopleManager.hasPerson(profileId)) {
            if (this.verbose) {
              console.log("   Profile " + profileId + " has already been checked");
            }
          } else {
            this.testResults.countProfile(1, false, false);
            const url =
              BioChecker.WIKI_TREE_URI +
              "?action=getPerson" +
              "&key=" +
              profileId +
              "&fields=" +
              BioChecker.BASIC_PROFILE_REQUEST_FIELDS +
              BioChecker.REDIRECT_KEY;
            this.setDetailedProgress();
            this.pendingRequestCount++;
            try {
              this.testResults.countRequest();  // instrumentation
              const fetchResponse = await fetch(url, {
                credentials: "include",
              });
              if (!fetchResponse.ok) {
                console.log("  Error from getPerson " + fetchResponse.status + " profileId " + profileId);
                this.invalidIdProfileCount++;
                this.testResults.addUncheckedDueToPrivacy();
              }
              let theJson = await fetchResponse.json();
              let responseObj = theJson[0];
              let responseStatus = responseObj.status;
              if (responseStatus != 0) {
                console.log("  API returned " + responseObj["status"] + " profileId " + profileId);
                this.invalidIdProfileCount++;
                this.testResults.addUncheckedDueToPrivacy();
              } else {
                if (responseObj.person == null) {
                  if (this.verbose) {
                    console.log("  Returned profile does not have person property");
                    this.noPersonCount++;
                    this.testResults.addUncheckedDueToPrivacy();
                  }
                } else {
                  let profileObj = responseObj.person;
                  let thePerson = new BioCheckPerson();
                  thePerson.setVerbose(true);
                  let canUseThis = thePerson.build(
                    profileObj,
                    this.getOpenOnly(),
                    this.getIgnorePre1500(),
                    this.getUserId(),
                    profileId
                  );
                  if (!thePerson.hasName()) {
                    this.unnamedProfileCount++;
                  }
                  if (!canUseThis) {
                    //console.log("Profile " + profileId + " privacy does not allow testing");
                    this.testResults.countProfile( 0, thePerson.isUncheckedDueToPrivacy(),
                      thePerson.isUncheckedDueToDate()
                    );
                    if (thePerson.isUncheckedDueToPrivacy()) {
                      this.privacyCount++;
                    }
                  } else {
                    if (!this.thePeopleManager.hasPerson(thePerson.getProfileId()) && !this.timeToQuit()) {
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
              console.log("  Error from getPerson " + error + " profileId " + profileId);
              this.testResults.setProgressMessage("Error getting profile " + profileId + " " + error);
            }
          }
          i++;
          this.randomProfilesChecked = i;
        }
        // Wait for all to complete then report
        let promiseArray = await this.promiseCollection;
        let allPromises = Promise.all(promiseArray);
        await allPromises;
        this.promiseCollection = new Array();

        // Report profiles returned invalid from API, ones with no name
        console.log("Random profiles checked " + this.randomProfilesChecked);
        console.log("   Profiles returned as invalid Id " + this.invalidIdProfileCount);
        console.log("   Profiles without a Name not tested " + this.unnamedProfileCount);
        console.log("   Profiles without a Person Property " + this.noPersonCount);
        let j = this.privacyCount - this.unnamedProfileCount;
        console.log("   Profiles that failed privacy test " + j);
        console.log("   Profiles that were duplicates " + this.thePeopleManager.getDuplicateProfileCount());
        this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount());
        //console.log("totalValidateTime (milliseconds) " + BioChecker.totalValidateTime);
      } catch (error) {
        console.log("Error " + error);
      }
  }

  /*
   * Get random number
   * @param {Number} min random number
   * @param {Number} max max random number
   * @return {Number} random generated between min and max
   */
  #getRandomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}
