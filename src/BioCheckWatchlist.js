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
/*
 * Check biographies for profiles on Watchlist
 */
import { Person } from "./Person.js"
import { BioChecker } from "./BioChecker.js"

export class BioCheckWatchlist extends BioChecker {

  static WATCHLIST_REQUEST_FIELDS = "&getPerson=1&getSpace=0";
  static WATCHLIST_MAX_LIMIT = 200;

  /**
   * Constructor 
   * @param theTestResults container for results
   * @param userArgs what to do
   */
  constructor(theTestResults, theUserArgs) {
    super(theTestResults, theUserArgs);
  }

  /**
   * Check profiles on watchlist
   * @param startSearch where to start searching in query results
   */
  async check() {
    /*
     * To check watchlist, iterate all profiles in watchlist but....
     * Need to make first request to get watchlistCount
     * Check watchlist starting at user supplied searchStart for user supplied searchMax
     * But, chunk requests no greater than some max limit updating an interim start/max
     * quit when total number checked = watchlistCount or
     *           total number checked = user supplied searchMax
     *           timeToQuit (results reportCount > maxReport or cancelPending)
     * otherwise a lot like getAncestors
     */
    this.testResults.setStateMessage("Checking watchlist");
    let maxProfileCount = this.getMaxQuery();
    if (maxProfileCount > BioChecker.MAX_TO_CHECK) {
      // let's not kill the api server
      this.testResults.setStateMessage("Checking watchlist; limited to a max of " + BioChecker.MAX_TO_CHECK);
      maxProfileCount = BioChecker.MAX_TO_CHECK;     // later make it max of this or watchlistCount
    }
    let limit = this.getSearchMax();
    if (limit > this.WATCHLIST_MAX_LIMIT) {
      limit = this.WATCHLIST_MAX_LIMIT;
    }
    if (limit > maxProfileCount) {
      limit = maxProfileCount;
    }
    let start = this.getSearchStart();
    let totalProfileCount = 0;
    let watchlistCount = 0;
    const urlbase = BioChecker.WIKI_TREE_URI + "?action=getWatchlist" + "&key="
                    + this.getInputWikiTreeId()
                    + "&fields=" + BioChecker.BASIC_PROFILE_REQUEST_FIELDS +
                    this.WATCHLIST_REQUEST_FIELDS + BioChecker.REDIRECT_KEY;

    // start with a request for one profile to get the number of profiles on the watchlist
    let url = urlbase + "&offset=0&limit=1";
    this.pendingRequestCount++;
    const fetchResponse = await fetch(url, {
        credentials: "include",
    });
    if (!fetchResponse.ok) {
      console.log("Error from getWatchlist " + fetchResponse.status);
      this.testResults.resetStateOnError();
    } else {
      const theJson = await (fetchResponse.json());
      let responseObj = theJson[0];
      let responseStatus = responseObj.status;
      if (responseStatus != 0) {
        console.log("responseStatus " + responseStatus);
      } else {
        watchlistCount = responseObj.watchlistCount;
        if (!watchlistCount) {
          this.testResults.setStateMessage("Could not get watchlist. Make sure you are logged in. Reload the page to log in.");
          this.testResults.resetStateOnError();
        } else {
          if (maxProfileCount > watchlistCount) {
            maxProfileCount = responseObj.watchlistCount;
          }
          if (this.getSearchStart() >= watchlistCount) {
            this.testResults.setStateMessage("Check starting at " + this.getSearchStart() 
                 + " must be less than the " + watchlistCount + " profiles on your watchlist");
            this.testResults.resetStateOnError();
          } else {
            this.testResults.addToTotalProfileCount(maxProfileCount - this.getSearchStart());
            this.testResults.setStateMessage("Checking watchlist with " + watchlistCount + " profiles.");
            this.testResults.setProgressMessage("Gathering profiles on watchlist...");
            while ((start < maxProfileCount) && (totalProfileCount < watchlistCount) 
                   && (totalProfileCount < this.getSearchMax()) && (!this.timeToQuit())) {
              // process profiles up to limit at a time
              if ((totalProfileCount + limit) > maxProfileCount) {
                limit = maxProfileCount - start;
                console.log("reset limit to " + limit);
              }
              let url = urlbase + "&offset=" + start + "&limit=" + limit;
              this.pendingRequestCount++;
              const fetchResponse = await fetch(url, {
                credentials: "include",
              });
              if (!fetchResponse.ok) {
                console.log("Error from getWatchlist " + fetchResponse.status);
                this.testResults.resetStateOnError();
              } else {
                const theJson = await (fetchResponse.json());
                let responseObj = theJson[0];
                let responseStatus = responseObj.status;
                if (responseStatus != 0) {
                  console.log("responseStatus " + responseStatus);
                } else {
                  let watchlistArray = responseObj.watchlist;
                  this.testResults.setStateMessage("Checking watchlist with " + watchlistCount 
                           + " profiles. Checking at number "
                           + start + "...");
                  let len = watchlistArray.length;
                  let i = 0;
                  while ((i < len)) {
                    // iterate returned profiles
                    let profileObj = watchlistArray[i];
                    let thePerson = new Person();
                    let canUseThis = thePerson.build(profileObj, this.getOpenOnly(), 
                                                     this.getIgnorePre1500(),
                                                     this.getUserId(), 0);
                    if (thePerson.person.uncheckedDueToPrivacy) {
                      this.testResults.addUncheckedDueToPrivacy();
                    }
                    if (thePerson.person.uncheckedDueToDate) {
                      this.testResults.addUncheckedDueToDate();
                    }
                    if ((canUseThis) && (!this.thePeopleManager.hasPerson(thePerson.person.profileId))
                        && (!this.timeToQuit())) {
                      this.setDetailedProgress();
                      if (this.needToGetBio(thePerson)) {
                        let promise = this.checkPerson(thePerson);
                        if (!this.timeToQuit()) {
                          this.promiseCollection.push(promise);
                        }
                      }
                      if (this.pendingRequestCount > BioChecker.MAX_PENDING_REQUESTS) {
                        await this.sleep(BioChecker.SYNC_DELAY_MS);
                        let promiseArray = await this.promiseCollection;
                        let allPromises = Promise.all(promiseArray);
                        await allPromises;
                        this.promiseCollection = new Array();
                        this.pendingRequestCount = 0;
                      }
                    }
                    i++;
                    start++;
                    totalProfileCount++;
                  }
                }
              }
            }
            // Wait for all to complete then check relatives and report
            let promiseArray = await this.promiseCollection;
            let allPromises = Promise.all(promiseArray);
            await allPromises;
            this.promiseCollection = new Array();
            if (this.needToCheckRelatives()) {
              this.checkUnsourcedRelatives();
            } else {
              this.testResults.reportStatistics();
            }
          }
        }
      }
    }
  }

}
