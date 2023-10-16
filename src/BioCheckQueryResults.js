/*
The MIT License (MIT)

Copyright (c) 2023 Kathryn J Knight

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


  /**
   * Constructor
   * @param {BioTestResults} theTestResults container for results 
   * @param {Object} userArgs what to do pushed from the Vue
   */
  constructor(theTestResults, theUserArgs) {
    super(theTestResults, theUserArgs);
  }

/*
for the future to be able to get Challenge tracker profiles comparable to 
https://plus.wikitree.com/function/WTTrackerReview/profiles.json?Challenge=SourcerersChallenge20231001&WikiTreeID=Couch-3906&format=json
https://plus.wikitree.com/function/WTTrackerReview/profiles.htm?Challenge=SourcerersChallenge20231001&WikiTreeID=McGee-1611

to do this, use a URL in the form
url = "https://plus.wikitree.com/function/WTTrackerReview/apiAppsBioCheck.json?appId=bioCheck&Challenge=SourcerersChallenge20231001&WikiTreeID=McGee-1611&format=json";
"https://plus.wikitree.com/function/WTTrackerReview/apiAppsBioCheck.json?appId=bioCheck&Challenge=SourcerersChallenge20231001&WikiTreeID=Couch-3906&format=json&maxProfiles=200";

but don't do anything until you get with Ales and find out what the arguments should/could be and get him to add
maxProfiles to the request

you can use comparable/same request except that WTWebProfileSearch returns queryResponse.found and WTTrackerReview
returns queryResponse.uniqueProfiles
*/
  /**
   * Check profiles found via a WikiTree+ Query
   */
  async check() {
    try {
      let url = BioCheckQueryResults.WIKI_TREE_PLUS_URI +
        "?appId=bioCheck" +
        //"?Query=" +
        "&Query=" +
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
      let testChallengeResults = false;
      if (testChallengeResults) {
        url = "https://plus.wikitree.com/function/WTTrackerReview/apiAppsBioCheck.json?appId=bioCheck&Challenge=SourcerersChallenge20231001&WikiTreeID=McGee-1611&format=json";
        url =
        "https://plus.wikitree.com/function/WTTrackerReview/apiAppsBioCheck.json?appId=bioCheck&Challenge=SourceAThon2023&WikiTreeID=Brunson-1754&format=json";
      }
      const fetchResponse = await fetch(url);
      if (!fetchResponse.ok) {
        this.testResults.resetStateOnError();
        console.log("Error from WikiTree+ search " + fetchResponse.status);
      } else {
        const theJson = await fetchResponse.json();
        let queryResponse = theJson.response;
        let found = queryResponse.found;
        if (testChallengeResults) {
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
