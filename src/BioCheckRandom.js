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

    // max captured as of 14 Aug 2023
    const MAX_RANDOM = 39715080;
    this.verbose = false;

    let minRand = this.getMinRandom();
    let maxRand = this.getMaxRandom();

    // Note that a space page will return Invalid page id when getPerson called
    // with the ID

    let min = minRand;
    this.testResults.setStateMessage("Please wait, checking random profiles...");
    let maxToCheck = this.getSearchMaxRandom();
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
    try {
      console.log("random check starting at " + minRand + " for up to " + maxRand + " xxxxxxxxxxxxxxxxxxxxxxxxxxx");

      let profileIdArray = [];
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
          profileIdArray.push(profileId);
        }
        i++;
      }
      await this.pageThroughPeople(profileIdArray, 0, 0, 0);
      this.testResults.reportStatistics(this.thePeopleManager.getDuplicateProfileCount(), 
                 this.reachedMaxProfiles);

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
