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
/**
 * Contains data from testing that needs to ripple up from the test logic
 * for display in the GUI.
 *
 * So the initial content must ripple down from the GUI then content changes
 * to ripple back to the userface
 */
import { BioCheckPerson } from "./BioCheckPerson.js";
export class BioTestResults {
  /*
   * What the GUI expects in the result rows
   */
  SOURCED = "Sourced";
  MARKED = "Marked";
  POSSIBLY_UNSOURCED = "?";
  REF = "ref tag";
  SPAN = "span";

  // the results
  /*
   * results are tied into the GUI via Vue
   * specifically, the checkStatus and checkResults are defined in the App
   * The checkStatus contains messages and state management
   * The checkResults contain arrays of row data that are populated
   * with row data items. These are tied to the GUI via a Vue template
   * that will populate the results data with row data items as rows
   * are added to the results.
   */
  results = {
    checkStatus: null,
    checkResults: null,
    // totalProfileCount is good for number of profiles considered
    totalProfileCount: 0, // requested via API or WT+ query
    requestedProfileCount: 0, // ?? maybe bogus
    uncheckedDueToPrivacyCount: 0, // privacy does not allow checking
    uncheckedDueToDateCount: 0, // date does not allow checking (pre1500)
    checkedProfileCount: 0, // made it through privacy and redirect
    styleIssuesProfileCnt: 0,
    unsourcedProfileCnt: 0,
    unmarkedProfileCnt: 0,
    reportCount: 0, // added to results rows
    //sourcesReport: false,
    //profileReviewReport: false,
    reportStatsOnly: false,
    startTime: null,
    rowData: [], // a row in the results
    sourcesRowData: [], // a row of sources in the results
    profilesRowData: [], // a row of profiles in the results
    totalServerRequests: 0,     // logging and diagnostics
    totalPromiseWaits: 0,  // number of times awaiting all promises
    errorMessage: "",     // errorMessage for reporting
    maxProfilesReached: false, // got max number of profiles
    apiLimitReached: false,  // hit the max API limit
    totalValidateTime: 0,
    totalFetchTime: 0,
  };

  constructor() {}

  /*
   * set args for stuff from gui
   * @param {String} checkStatus the result status
   * @param {String} checkResults the results
   */
  setArgs(checkStatus, checkResults) {
    this.results.checkStatus = checkStatus;
    this.results.checkResults = checkResults;
    this.results.checkStatus.stateMessage = "";
    this.results.checkStatus.progressMessage = "";
    this.errorMessage = "";
    this.startTime = new Date();
  }

  /**
   * Set count of number of profiles requested.
   * This can include by query, or returned via watchlist,
   * ancestors, or relatives.
   * @param {Number} cnt number of profiles to add to total
   */
  addToTotalProfileCount(cnt) {
    this.results.totalProfileCount += cnt;
  }

  /**
   * Count profile.
   * This can include by query, or returned via watchlist,
   * ancestors, or relatives
   * @param {Number} cnt number of profiles to add to total
   * @param {Boolean} dueToPrivacy true if not checked because of privacy
   * @param {Boolean} dueToDate true if not checked because of date
   */
  countProfile(cnt, dueToPrivacy, dueToDate) {
    if (cnt > 0) {
      this.results.totalProfileCount += cnt;
    }
    if (dueToPrivacy) {
      this.results.uncheckedDueToPrivacyCount++;
    }
    if (dueToDate) {
      this.results.uncheckedDueToDateCount++;
    }
  }

  /**
   * Add to number of unchecked profiles due to privacy.
   * Typically just used by countProfile but also for random
   */
  addUncheckedDueToPrivacy() {
    this.results.uncheckedDueToPrivacyCount++;
  }
  /**
   * Set whatIsHappening
   * @param {String} current progress message
   */
  setProgressMessage(message) {
    this.results.checkStatus.progressMessage = message;
  }

  /**
   * Get count of reported rows
   * @returns {Number} count of reported rows
   */
  getReportCount() {
    return this.results.reportCount;
  }

 /**
  * Set detailed progress (hover text)
  * @param {String} number of profiles requested
  */
  // TODO this is not working correctly, counts are off with API changes
  setProgressMessageDetails(requestedProfileCount) {
   let message =
     "Wait... Requested " + requestedProfileCount +
     " profiles. Examined " + this.results.checkedProfileCount +
     " profiles. Reported " + this.results.reportCount +
     " profiles";
   // this.results.checkStatus.progressMessageTitle = message;
  }

  /*
   * Set state message - more detailed than progress
   * @param {String} message to set
   */
  setStateMessage(message) {
    this.results.checkStatus.stateMessage = message;
  }

  /**
   * Set error message for reporting
   * @param {String} message to set
   */
  setErrorMessage(message) {
    this.errorMessage = message;
  }

  /**
   * Has the user requested cancel?
   * @returns {Boolean} true if there is a cancel pending
   */
  isCancelPending() {
    return this.results.checkStatus.cancelPending;
  }

  /**
   * Set total validate time for reporting
   * @param {Integer} time to report
   */
  setTotalValidateTime(t) {
    this.results.totalValidateTime = t;
  }
  /**
   * Set total fetch time for reporting
   * @param {Integer} time to report
   */
  setTotalFetchTime(t) {
    this.results.totalFetchTime = t;
  }

  /**
   * Add a profile to the results
   * @param {Biography} biography with results of parsing and validating profile
   * @param {BioCheckPerson} person to report
   * @param {Boolean} reportAllProfiles true to report all profiles
   * @param {Boolean} reportNonManaged true to report profiles not managed by user
   * @param {Boolean} reportStyleDetails true to report style details
   * @param {String} userId for testing nonManaged profiles
   */
  addProfile(biography, thePerson,
             reportAllProfiles, reportNonManaged, reportStyleDetails, reportStatsOnly, userId) {

    this.results.reportStatsOnly = reportStatsOnly;
    let profileStatus = this.SOURCED;
    this.results.checkedProfileCount++;

    /*
     * The manager profile is only needed if it has style issues and we are reporting style.
     * A sourced profile is needed only if we are reporting style.
     * An empty profile is considered marked unsourced and has a line count of 0.
     * An unsourced marked profile is needed only if we are reporting marked unsourced.
     * (for now always report marked, but might want this in future)
     * An unsourced unmarked profile is always needed.
     *
     * And for reportNonManaged ONLY those profiles not managed by the user should be reported,
     * even if they have other reasons to report or if report all profiles is selected
     */
    let profileShouldBeReported = false;
    if (reportNonManaged) {
      if (userId != thePerson.getManagerId()) {
        profileShouldBeReported = true;
      }
    } else {
      if (reportAllProfiles) {
        profileShouldBeReported = true;
      }
      if (biography.isEmpty()) {
        profileShouldBeReported = true;
      }
      if (biography.isMarkedUnsourced()) {
        this.results.unsourcedProfileCnt++;
        profileStatus = this.MARKED;
        profileShouldBeReported = true;
      } else {
        if (!biography.hasSources()) {
          this.results.unmarkedProfileCnt++;
          profileStatus = this.POSSIBLY_UNSOURCED;
          profileShouldBeReported = true;
        }
      }
      if (biography.isUndated()) {
        profileShouldBeReported = true;
      } 
      if (biography.hasSearchString()) {
        profileShouldBeReported = true;
      }
      if (biography.hasStyleIssues()) {
        // let user turn off detailed style messages
        // but not the section level messages
        if (reportStyleDetails) {
          profileShouldBeReported = true;
          this.results.styleIssuesProfileCnt++;
        } else {
          if (biography.getSectionMessages().length > 0) {
            profileShouldBeReported = true;
            this.results.styleIssuesProfileCnt++;
          }
        }
      }
    }
    if (profileShouldBeReported) {
      this.results.reportCount++;
      this.reportProfile(biography, thePerson, profileStatus);
    }
  }

  /*
   * Report profile
   * includes all data. Table display and export will filter out as needed
   */
  reportProfile(biography, thePerson, profileStatus) {
    let rowDataItem = {  // spaces are needed for correct export
      profileId: 0,
      wikiTreeId: " ",
      personName: " ",
      requiredSections: " ",
      styleDetails: " ",
      searchPhrase: " ",
      bioLineCnt: " ",
      numSources: " ",
      inlineRefCnt: " ",
      sourceLineCnt: " ",
      wikiTreeLink: " ",
      wikiTreeHyperLink: "",
      sourceCount: "-1",
      sourceLine: " ",
      reviewerId: " ",
      reviewStatus: " ",
      reviewComments: "                                  ",
      profileStatus: " ",
      hasStyleIssues: " ",
      profilePrivacy: " ",
      profileIsOrphan: " ",
      birthDate: " ",
      deathDate: " ",
      birthDateDate: null,
      deathDateDate: null,
    };
    // Add everything to the results
    // It will be filtered by the keys associated with the different 
    // report types and also on the CSV export
    rowDataItem.profileStatus = profileStatus;
    rowDataItem.profileId = thePerson.getProfileId();
    rowDataItem.wikiTreeId = thePerson.getWikiTreeId();
    rowDataItem.wikiTreeLink = thePerson.getWikiTreeLink();
    rowDataItem.wikiTreeHyperLink = this.getHyperLink(thePerson.getWikiTreeLink(), thePerson.getWikiTreeId());
    rowDataItem.personName = thePerson.getReportName();
    if (biography.getTotalBioLines() > 0) {
      rowDataItem.bioLineCnt = biography.getTotalBioLines();
    }
    if (biography.getInlineRefCount() > 0) {
      rowDataItem.inlineRefCnt = biography.getInlineRefCount();
    }
    if (biography.hasSearchString()) {
      rowDataItem.searchPhrase = "Found";
    }
    if (biography.getPossibleSourcesLineCount() > 0) {
      rowDataItem.sourceLineCnt = biography.getPossibleSourcesLineCount();
    }
    if (biography.getValidSources().length > 0) {
      rowDataItem.numSources = biography.getValidSources().length;
    }
    // Get the list of issues to report and put as an item in the result
    let messages = biography.getSectionMessages(); 
    if (messages.length > 0) {
      rowDataItem.requiredSections = messages.join('\n');
    }
    messages = biography.getStyleMessages();
    if (messages.length > 0) {
      rowDataItem.styleDetails = messages.join('\n');
    }
    rowDataItem.reviewerId = " ";
    rowDataItem.reviewStatus = " ";
    rowDataItem.reviewComments = " ";
    if (biography.hasStyleIssues()) {
      rowDataItem.hasStyleIssues = "X";
    }
    rowDataItem.profilePrivacy = thePerson.getPrivacyString();
    if (thePerson.isOrphan()) {
      rowDataItem.profileIsOrphan = "X";
    }
    rowDataItem.birthDate = thePerson.getReportDate(true);
    rowDataItem.deathDate = thePerson.getReportDate(false);
    let birthDateDate = thePerson.getBirthDate();
    let deathDateDate = thePerson.getDeathDate();
    // if date null or invalid, make it today for sorting
    if (birthDateDate == null || birthDateDate == 'Invalid Date') {
      birthDateDate = new Date();
    }
    if (deathDateDate == null || deathDateDate == 'Invalid Date') {
      deathDateDate = new Date();
    }
    rowDataItem.birthDateDate = birthDateDate;
    rowDataItem.deathDateDate = deathDateDate;

    // Add the data to the results to appear in the table
    this.results.checkResults.resultsRowData.push(rowDataItem);

    // report sources needs a line per source per profile, not just per profile
    this.reportSources(biography, thePerson);

  }

  /*
   * Report sources for the profile
   * @param {Biography} biography contains the results of checking
   * @param {BioCheckPerson} person to report
   */
  reportSources(biography, thePerson) {
    if (biography.getInvalidSources().length === 0 && biography.getValidSources().length === 0) {
      this.reportSourceRow(thePerson, -1, "");
    } else {
      for (let i = 0; i < biography.getInvalidSources().length; i++) {
        this.reportSourceRow(thePerson, 0, biography.getInvalidSources()[i]);
      }
      for (let i = 0; i < biography.getValidSources().length; i++) {
        this.reportSourceRow(thePerson, i + 1, biography.getValidSources()[i]);
      }
    }
  }

  /*
   * Report one source row
   * @param {BioCheckPerson} person to report
   * @param {Number} sourceNum the source number
   * @param {String} sourceContent the source content
   */
  reportSourceRow(thePerson, sourceNum, sourceContent) {
    let rowDataItem = {
      profileId: 0,
      wikiTreeId: " ",
      wikiTreeHyperLink: " ",
      personName: " ",
      sourceCount: "-1",
      sourceLine: " ",
      wikiTreeLink: " ",
    };
    rowDataItem.profileId = thePerson.getProfileId();
    rowDataItem.wikiTreeId = thePerson.getWikiTreeId();
    rowDataItem.wikiTreeLink = thePerson.getWikiTreeLink();
    rowDataItem.wikiTreeHyperLink = this.getHyperLink(thePerson.getWikiTreeLink(), thePerson.getWikiTreeId());
    rowDataItem.personName = thePerson.getReportName();
    rowDataItem.sourceCount = sourceNum;
    rowDataItem.sourceLine = sourceContent;
    this.results.checkResults.sourcesRowData.push(rowDataItem);
  }

  /**
   * Get Hyperlink
   * @param {String} theUrl the URL
   * @param {String} displayTest display text for URL
   * @returns {String} the hyperlink text
   */
  getHyperLink(theUrl, displayText) {
    let doubleQuote = '""';
    let hyperlink =
      "=HYPERLINK(" + doubleQuote + theUrl + doubleQuote + "," + doubleQuote + displayText + doubleQuote + ")";
    return hyperlink;
  }

  /**
   * Report summary statistics
   * @param {Number} duplicateProfileCount ignored profiles for logging metrics
   */
  reportStatistics(duplicateProfileCount) {
    // by popular request, don't sort 

    let msg = "Checked " + this.results.checkedProfileCount +
      " profiles: Found " + this.results.reportCount +
      " profiles with " + this.results.styleIssuesProfileCnt +
      " style issues; " + this.results.unsourcedProfileCnt +
      " marked unsourced; " + this.results.unmarkedProfileCnt +
      " possibly unsourced not marked";
    this.setProgressMessage(msg);
    msg = "Check Completed. ";
    if (this.results.apiLimitReached) {
      msg = "Server is overloaded. Results may be incomplete. Try again later. ";
    }
    if (this.results.maxProfilesReached) {
      msg = "Reached maximum number of profiles. Results may be incomplete. ";
    }
    if (this.results.checkStatus.cancelPending) {
      msg = "Canceled. Results may be incomplete. ";
    }
    msg += "Examined " + this.results.totalProfileCount + " unique profiles.";
    let otherCnt = this.results.uncheckedDueToPrivacyCount;
    otherCnt += this.results.uncheckedDueToDateCount;
    if (otherCnt > 0) {
      msg += " Privacy, date, or other reasons did not allow checking for " + otherCnt + " profiles.";
    }

    if (this.errorMessage.length > 0) {
      msg += this.errorMessage;
    }
    this.setStateMessage(msg);
    this.results.checkStatus.checkCompleted = true;
    this.results.checkStatus.progressMessageTitle = "";
    this.results.checkStatus.cancelPending = false;
    this.results.checkStatus.cancelDisabled = true;
    this.results.checkStatus.checkDisabled = false;
    if (!this.results.reportStatsOnly) {
      this.results.checkStatus.exportDisabled = false;
    }
    console.log('Total server requests ' + this.results.totalServerRequests);
    console.log('Total promise waits ' + this.results.totalPromiseWaits);
    console.log('Duplicate profiles ignored ' + duplicateProfileCount);
    this.getElapsedTime();
  }

  /**
   * Count a request to server. Instrumentation and diagnostics
   */
  countRequest() {
    this.results.totalServerRequests++;
  }
  /**
   * Count await all promises and delay. Instrumentation and diagnostics
   */
  countPromiseWait() {
    this.results.totalPromiseWaits++;
  }

  /**
   * Get elapsed time and report to console
   */
  getElapsedTime() {
    let endTime = new Date();
    let timeDiff = endTime.getTime() - this.startTime.getTime();
    timeDiff = timeDiff / 1000;
    console.log("Elapsed time (seconds): " + timeDiff);
    // TODO uncomment below for more detailed instrumentation
    // console.log('Total validate time ' + this.results.totalValidateTime / 1000);
    // console.log('Total fetch time ' + this.results.totalFetchTime / 1000);
  }

  /**
   * Reset state on error
   */
  resetStateOnError() {
    this.results.checkStatus.cancelPending = false;
    this.results.checkStatus.cancelDisabled = true;
    this.results.checkStatus.checkDisabled = false;
    this.results.checkStatus.exportDisabled = true;
  }
}
