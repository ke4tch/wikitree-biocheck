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
 * Send inputs from gui onto the checker and ripple results back
 * in the bio test results
 */
import { BioTestResults } from "./BioTestResults.js";

import { BioCheckProfile } from "./BioCheckProfile.js";
import { BioCheckQueryResults } from "./BioCheckQueryResults.js";
import { BioCheckWatchlist } from "./BioCheckWatchlist.js";
import { BioCheckRandom } from "./BioCheckRandom.js";

export class BioCheck {
  constructor() {}

  /**
   * check bio
   * @param userArgs user args pushed from GUI
   * @param checkStatus - the progress returned to GUI
   * @param checkResults - the results returned to GUI
   */
  check(userArgs, checkStatus, checkResults) {
    // link the gui stuff into the results
    let testResults = new BioTestResults();
    testResults.setArgs(checkStatus, checkResults);

    if (userArgs.selectedCheckType === "checkByQuery") {
      let checker = new BioCheckQueryResults(testResults, userArgs);
      checker.check();
    } else {
      if (userArgs.selectedCheckType === "checkByProfile") {
        let checker = new BioCheckProfile(testResults, userArgs);
        checker.check();
      } else {
        if (userArgs.selectedCheckType === "checkWatchlist") {
          let checker = new BioCheckWatchlist(testResults, userArgs);
          checker.check();
        } else {
          let checker = new BioCheckRandom(testResults, userArgs);
          checker.check();
        }
      }
    }
  }
}
