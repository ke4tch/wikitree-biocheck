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
 * Check biographies obtained via a WT+ query
 * @extends BioChecker
 */
export class BioCheckQueryResults extends BioChecker {
  static WIKI_TREE_PLUS_URI = "https://wikitree.sdms.si/function/WTWebProfileSearch/Profiles.json";

  /**
   * Constructor
   * @param {BioTestResults} theTestResults container for results 
   * @param {Object} userArgs what to do pushed from the Vue
   */
  constructor(theTestResults, theUserArgs) {
    super(theTestResults, theUserArgs);
  }

  /**
   * Check profiles found via a WikiTree+ Query
   */
  async check() {
    try {
      let url =
        BioCheckQueryResults.WIKI_TREE_PLUS_URI +
        "?Query=" +
        this.getQueryArg() +
        "&format=JSON&maxProfiles=" +
        this.getMaxQuery();
      if (this.getOpenOnly()) {
        this.url = +"&Privacy=Public";
      }
      this.testResults.setStateMessage("Please wait, searching via WikiTree+ ...");
      this.testResults.setProgressMessage("Examining profiles");
      let maxToCheck = this.getSearchMax();
      /*** TESTING 
      if (maxToCheck > BioChecker.MAX_TO_CHECK) {
        // let's not kill the api server
        this.testResults.setStateMessage("Check limited to a max of " + BioChecker.MAX_TO_CHECK);
        maxToCheck = BioChecker.MAX_TO_CHECK;
      }
      ***/
      const fetchResponse = await fetch(url);
      if (!fetchResponse.ok) {
        this.testResults.resetStateOnError();
        console.log("Error from WikiTree+ Query " + fetchResponse.status);
      } else {
        const theJson = await fetchResponse.json();
        let queryResponse = theJson.response;
        this.testResults.countProfile(queryResponse.found, false, false);

        // Pick out just from start to max but no more than found
        let endIndex = queryResponse.found;
        if (maxToCheck > 0) {
          endIndex = maxToCheck + this.getSearchStart();
          if (endIndex > queryResponse.found) {
            endIndex = queryResponse.found;
          }
        }
        let i = this.getSearchStart();
        let cnt = endIndex - i;
        this.testResults.setStateMessage(
          "Examining " + cnt + " of " + queryResponse.found + " profiles found via search"
        );
        while (i < endIndex && !this.timeToQuit()) {
          let profileId = queryResponse.profiles[i];
          if (!this.thePeopleManager.hasPerson(profileId)) {
            url =
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
                  let canUseThis = thePerson.build(
                    profileObj,
                    this.getOpenOnly(),
                    this.getIgnorePre1500(),
                    this.getUserId(),
                    profileId
                  );
                  if (!canUseThis) {
                    this.testResults.countProfile(
                      0,
                      thePerson.isUncheckedDueToPrivacy(),
                      thePerson.isUncheckedDueToDate()
                    );
                  } else {
                    if (profileId != thePerson.getProfileId()) {
                      this.testResults.addRedirectedProfile();
                    }
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
              console.log("Error from getPerson " + error + " profileId " + profileId);
              this.testResults.setProgressMessage("Error getting profile " + profileId + " " + error);
            }
          }
          i++;
        }
        // Wait for all to complete then check relatives and report
        let promiseArray = await this.promiseCollection;
        let allPromises = Promise.all(promiseArray);
        await allPromises;
        this.promiseCollection = new Array();
        promiseArray = await this.promiseCollection;
        if (this.needToCheckRelatives()) {
          this.checkUnsourcedRelatives();
        } else {
          this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount());
          //console.log("totalValidateTime (milliseconds) " + BioChecker.totalValidateTime);
        }
      }
    } catch (error) {
      this.testResults.resetStateOnError();
      this.testResults.setProgressMessage("Error from WikiTree+ query " + this.getQueryArg() + " " + error);
    }
  }
}
