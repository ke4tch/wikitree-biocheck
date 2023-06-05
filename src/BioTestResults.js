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
export class BioTestResults {
  /*
   * What the GUI expects in the result rows
   */
  SOURCED = "Sourced";
  MARKED = "Marked";
  POSSIBLY_UNSOURCED = "?";
  MISSING = "Missing";
  HEADING = "Heading";
  COMMENT = "Comment";
  AUTO_GENERATED = "Auto generated";
  REF = "ref tag";
  SPAN = "span";
  MULTIPLE = "Multiple";
  NO_LINES_FOLLOW = "Empty";
  REF_FOLLOWING = "ref Following";
  BEFORE_SOURCES = "Before Sources";
  EXTRA_EQUALS = "Extra =";

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
    redirectedProfileCount: 0, // was a redirect (only for random test)
    styleIssuesProfileCnt: 0,
    unsourcedProfileCnt: 0,
    unmarkedProfileCnt: 0,
    reportCount: 0, // added to results rows
    sourcesReport: false,
    profileReviewReport: false,
    reportStatsOnly: false,
    startTime: null,
    rowData: [], // a row in the results
    sourcesRowData: [], // a row of sources in the results
    profilesRowData: [], // a row of profiles in the results
    totalServerRequests: 0,     // logging and diagnostics
    totalPromiseWaits: 0,  // number of times awaiting all promises
    errorMessage: "",     // errorMessage for reporting
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

  /*
   * Add to number of redirected profiles (random check only)
   */
  addRedirectedProfile() {
    this.results.redirectedProfileCount++;
  }

  /**
   * Set whatIsHappening
   * @param {String} current progress message
   */
  setProgressMessage(message) {
    this.results.checkStatus.progressMessage = message;
  }

  /**
   * Set detailed progress (hover text)
   * @param {String} number of profiles requested
   */
  setProgressMessageDetails(requestedProfileCount) {
    let message =
      "Wait... Requested " +
      requestedProfileCount +
      " profiles. Examined " +
      this.results.checkedProfileCount +
      " profiles. Reported " +
      this.results.reportCount +
      " profiles";
    this.results.checkStatus.progressMessageTitle = message;
  }

  /**
   * Get count of reported rows
   * @returns {Number} count of reported rows
   */
  getReportCount() {
    return this.results.reportCount;
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
   * Add a profile to the results
   * @param {Biography} biography with results of parsing and validating profile
   * @param {String} profileId to report
   * @param {String} wikiTreeId to report
   * @param {String} wikiTreeLink to report
   * @param {String} reportName name to report
   * @param {String} managerId for the person
   * @param {String} privacyString to report
   * @param {String} birthDate to report
   * @param {String} deathDate to report
   * @param {Boolean} reportAllProfiles true to report all profiles
   * @param {Boolean} reportNonManaged true to report profiles not managed by user
   * @param {Boolean} reportStyleDetails true to report style details
   * @param {Boolean} sourcesReport true to report sources for profile
   * @param {Boolean} profileReviewReport true to generate profile review report
   * @param {String} userId for testing nonManaged profiles
   * @param {Date} birthDateDate for sorting
   * @param {Date} deathDateDate for sorting
   */
  addProfile(
    biography,
    profileId,
    wikiTreeId,
    wikiTreeLink,
    reportName,
    managerId,
    privacyString,
    birthDate,
    deathDate,
    reportAllProfiles,
    reportNonManaged,
    reportStyleDetails,
    sourcesReport,
    profileReviewReport,
    reportStatsOnly,
    userId,
    birthDateDate,
    deathDateDate
  ) {
    this.results.sourcesReport = sourcesReport;
    this.results.profileReviewReport = profileReviewReport;
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
     */
    let profileShouldBeReported = false;
    if (reportAllProfiles) {
      profileShouldBeReported = true;
    }
    if ((reportNonManaged) && (userId != managerId)) {
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
    // TODO bug bug but when profile is sourced with no style issues
    // is getting reported?
    // don't see it today.

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

    if (profileShouldBeReported) {
      this.results.reportCount++;
      if (!reportStatsOnly) {
        if (sourcesReport) {
          this.reportSources(biography, profileId, wikiTreeId, wikiTreeLink, reportName, reportAllProfiles);
        } else {
          if (profileReviewReport) {
            this.reportReviewProfile(biography, wikiTreeId, wikiTreeLink, reportName, privacyString, managerId,
              birthDate, deathDate, profileStatus, birthDateDate, deathDateDate);
          } else {
            this.reportUnsourcedStyle(biography, profileId, wikiTreeId, wikiTreeLink, reportName, profileStatus);
          }
        }
      }
    }
  }

  /*
   * Report unsourced and style for profile (the default)
   * @param {Biography} biography contains the results of checking
   * @param {String} profileId to report
   * @param {String} wikiTreeId to report
   * @param {String} wikiTreeLink to report
   * @param {String} reportName name to report
   * @param {String} profileStatus the unsourced status
   */
  reportUnsourcedStyle(biography, profileId, wikiTreeId, wikiTreeLink, reportName, profileStatus) {
    let rowDataItem = {
      profileId: 0,
      wikiTreeId: "",
      personName: "",
      unsourcedStatus: "No", // Sourced, Marked, Maybe
      requiredSections: "",
      styleDetails: "",
      bioLineCnt: "",
      inlineRefCnt: "",
      sourceLineCnt: "",
    };

    rowDataItem.unsourcedStatus = profileStatus;
    rowDataItem.profileId = profileId;
    rowDataItem.wikiTreeId = wikiTreeId;
    // HYPERLINK format should work in Excel, LibreOffice and Google Sheets
    rowDataItem.wikiTreeLink = wikiTreeLink;
    rowDataItem.wikiTreeHyperLink = this.getHyperLink(wikiTreeLink, wikiTreeId);
    rowDataItem.personName = reportName;
    if (biography.getTotalBioLines() > 0) {
      rowDataItem.bioLineCnt = biography.getTotalBioLines();
    }
    if (biography.getInlineRefCount() > 0) {
      rowDataItem.inlineRefCnt = biography.getInlineRefCount();
    }
    if (biography.getPossibleSourcesLineCount() > 0) {
      rowDataItem.sourceLineCnt = biography.getPossibleSourcesLineCount();
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

    // And add the item to the row data
    this.results.checkResults.resultsRowData.push(rowDataItem);
  }

  /*
   * Report sources for the profile
   * @param {Biography} biography contains the results of checking
   * @param {String} profileId to report
   * @param {String} wikiTreeId to report
   * @param {String} wikiTreeLink to report
   * @param {String} reportName name to report
   * @param {Boolean} reportAllSources true to report all sources
   */
  reportSources(biography, profileId, wikiTreeId, wikiTreeLink, reportName, reportAllSources) {
    if (biography.getInvalidSources().length === 0 && biography.getValidSources().length === 0) {
      this.reportSourceRow(profileId, wikiTreeId, wikiTreeLink, reportName, -1, "");
    } else {
      for (let i = 0; i < biography.getInvalidSources().length; i++) {
        this.reportSourceRow(profileId, wikiTreeId, wikiTreeLink, reportName, 0, biography.getInvalidSources()[i]);
      }
      if (reportAllSources) {
        for (let i = 0; i < biography.getValidSources().length; i++) {
          this.reportSourceRow( profileId, wikiTreeId, wikiTreeLink, reportName, i + 1, biography.getValidSources()[i]);
        }
      }
    }
  }

  /*
   * Report one source row
   * @param {String} profileId to report
   * @param {String} wikiTreeId to report
   * @param {String} wikiTreeLink to report
   * @param {String} reportName name to report
   * @param {Number} sourceNum the source number
   * @param {String} sourceContent the source content
   */
  reportSourceRow(profileId, wikiTreeId, wikiTreeLink, reportName, sourceNum, sourceContent) {
    let rowDataItem = {
      profileId: 0,
      wikiTreeId: "",
      wikiTreeHyperLink: "",
      personName: "",
      sourceCount: "-1",
      sourceLine: "",
      wikiTreeLink: "",
    };
    rowDataItem.profileId = profileId;
    rowDataItem.wikiTreeId = wikiTreeId;
    rowDataItem.wikiTreeLink = wikiTreeLink;
    rowDataItem.wikiTreeHyperLink = this.getHyperLink(wikiTreeLink, wikiTreeId);
    rowDataItem.personName = reportName;
    rowDataItem.sourceCount = sourceNum;
    rowDataItem.sourceLine = sourceContent;
    this.results.checkResults.sourcesRowData.push(rowDataItem);
  }

  /*
   * Report profile for review
   * @param {Biography} biography contains the results of checking
   * @param {String} wikiTreeId to report
   * @param {String} wikiTreeLink to report
   * @param {String} reportName name to report
   * @param {String} privacyString to report
   * @param {String} managerId for the person
   * @param {String} birthDate to report
   * @param {String} deathDate to report
   * @param {String} profileStatus the unsourced status
   * @param {Date} birthDateDate for sorting
   * @param {Date} deathDateDate for sorting
   */
  reportReviewProfile(biography, wikiTreeId, wikiTreeLink, reportName, privacyString, managerId, birthDate, deathDate, 
                      profileStatus, birthDateDate, deathDateDate
  ) {
    let rowDataItem = {
      wikiTreeId: "",
      wikiTreeHyperLink: "",
      personName: "",
      reviewerId: "",
      reviewStatus: "",
      reviewComments: "                                  ",
      profileStatus: "",
      hasStyleIssues: "",
      profilePrivacy: "",
      profileIsOrphan: "",
      birthDate: "",
      deathDate: "",
      wikiTreeLink: "",
      birthDateDate: null,
      deathDateDate: null
    };
    rowDataItem.wikiTreeId = wikiTreeId;
    rowDataItem.wikiTreeLink = wikiTreeLink;
    rowDataItem.wikiTreeHyperLink = this.getHyperLink(wikiTreeLink, wikiTreeId);
    rowDataItem.personName = reportName;
    rowDataItem.reviewerId = " ";
    rowDataItem.reviewStatus = " ";
    rowDataItem.reviewComments = " ";
    rowDataItem.profileStatus = profileStatus;
    if (biography.hasStyleIssues()) {
      rowDataItem.hasStyleIssues = "X";
    }
    rowDataItem.profilePrivacy = privacyString;
    if (managerId === 0) {
      rowDataItem.profileIsOrphan = "X";
    }
    rowDataItem.birthDate = birthDate;
    rowDataItem.deathDate = deathDate;
    // if date null or invalid, make it today for sorting
    if (birthDateDate == null || birthDateDate == 'Invalid Date') {
      birthDateDate = new Date();
    }
    if (deathDateDate == null || deathDateDate == 'Invalid Date') {
      deathDateDate = new Date();
    }
    rowDataItem.birthDateDate = birthDateDate;
    rowDataItem.deathDateDate = deathDateDate;
    this.results.checkResults.profilesRowData.push(rowDataItem);
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
   * @param maxProfilesReached {Boolean} true if max number of profiles exceeded
   */
  reportStatistics(duplicateProfileCount, maxProfilesReached) {
    this.setProgressMessage("Sorting results....");
    if (this.results.sourcesReport) {
      this.results.checkResults.sourcesRowData.sort(function (a, b) {
        var nameA = a.wikiTreeId.toLowerCase(),
          nameB = b.wikiTreeId.toLowerCase();
        if (nameA < nameB)
          //sort string ascending
          return -1;
        if (nameA > nameB) return 1;
        return 0; //default return value (no sorting)
      });
    } else {
      this.results.checkResults.resultsRowData.sort(function (a, b) {
        var nameA = a.wikiTreeId.toLowerCase(),
          nameB = b.wikiTreeId.toLowerCase();
        if (nameA < nameB)
          //sort string ascending
          return -1;
        if (nameA > nameB) return 1;
        return 0; //default return value (no sorting)
      });
    }

    // Reporting just to console for random check
    console.log("Redirected profile count " + this.results.redirectedProfileCount);

    let msg = "Checked " + this.results.checkedProfileCount +
      " profiles: Found " + this.results.reportCount +
      " profiles with " + this.results.styleIssuesProfileCnt +
      " style issues; " + this.results.unsourcedProfileCnt +
      " marked unsourced; " + this.results.unmarkedProfileCnt +
      " possibly unsourced not marked";
    if (this.results.checkStatus.cancelPending) {
      msg = "Canceled. " + msg;
    }
    this.setProgressMessage(msg);
    msg = "Check completed. Examined " + this.results.totalProfileCount + " unique profiles.";
    let otherCnt = this.results.uncheckedDueToPrivacyCount;
    otherCnt += this.results.uncheckedDueToDateCount;
    if (otherCnt > 0) {
      msg += " Privacy, date, or other reasons did not allow checking for " + otherCnt + " profiles.";
    }
    if (maxProfilesReached) {
      msg += " Reached maximum number of profiles. ";
    }
    if (this.errorMessage.length > 0) {
      msg += this.errorMessage;
    }

    this.setStateMessage(msg);
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
