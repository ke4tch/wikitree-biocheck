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
 * Check biographies obtained via a WT+ query
 * @extends BioChecker
 */
export class BioCheckQueryResults extends BioChecker {
  static WIKI_TREE_PLUS_URI = "https://plus.wikitree.com/function/WTWebProfileSearch/apiAppsBioCheck.json";
  static WIKI_TREE_PLUS_TRACKER_URI = "https://plus.wikitree.com/function/WTTrackerReview/apiAppsBioCheck.json";

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
      let url = BioCheckQueryResults.WIKI_TREE_PLUS_URI +
        "?Query=" +
        this.getQueryArg() +
        "&format=JSON&maxProfiles=" +
        this.getMaxQuery();
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
      let checkChallengeResults = false;
      if (this.userArgs.selectedCheckType === "checkChallenge") {
        checkChallengeResults = true;
      }
      if (checkChallengeResults) {
        url = BioCheckQueryResults.WIKI_TREE_PLUS_TRACKER_URI +
          "?Challenge=" + this.userArgs.challengeName + this.userArgs.challengeDate +
          "&WikiTreeID=" + this.userArgs.inputWikiTreeId +
          "&format=json";
      }
      const fetchResponse = await fetch(url);
      if (!fetchResponse.ok) {
        this.testResults.resetStateOnError();
        console.log("Error from WikiTree+ search " + fetchResponse.status);
      } else {
        const theJson = await fetchResponse.json();
        let queryResponse = theJson.response;
        let found = queryResponse.found;
        if (checkChallengeResults) {
          found = queryResponse.uniqueProfiles
        }
        if (found > 0) {
          // Pick out just from start to max but no more than found
          let endIndex = found;
          if (maxToCheck > 0) {
            endIndex = maxToCheck + this.getSearchStart();
            if (endIndex > found) {
              endIndex = found;
            }
          }
          let i = this.getSearchStart();
          let cnt = endIndex - i;
          this.testResults.setStateMessage("Examining " + cnt + " of " + found + 
                                         " profiles found via WikiTree+ search");
          await this.checkPeople(queryResponse.profiles.slice(this.getSearchStart(), endIndex), 0, 0, 0, 0, 1000, 0);
          this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount()); 
        } else {
          this.testResults.resetStateOnError();
          this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount());
        }
      }
    } catch (error) {
      this.testResults.resetStateOnError();
      this.testResults.setProgressMessage("Error from WikiTree+ search " + this.getQueryArg() + " " + error);
    }
  }
}
