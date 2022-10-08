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
 * Contains data from testing that needs to ripple up from the test logic
 * for display in the GUI
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
  results = {
    checkStatus: null,
    checkResults: null,
    // totalProfileCount is good for number of profiles considered
    totalProfileCount: 0,          // requested via API or WT+ query
    requestedProfileCount: 0,     // ?? maybe bogus
    uncheckedDueToPrivacyCount: 0, // privacy does not allow checking
    uncheckedDueToDateCount: 0,   // date does not allow checking (pre1500)
    checkedProfileCount: 0,       // made it through privacy and redirect
    redirectedProfileCount: 0,    // was a redirect (only for random test)
    styleIssuesProfileCnt: 0,
    unsourcedProfileCnt: 0,
    unmarkedProfileCnt: 0,
    reportCount: 0,                // added to results rows
    sourcesReport: false,
    profileReviewReport: false,
    reportStatsOnly: false,
    startTime: null,
    rowData: ([]),                 // a row in the results
    sourcesRowData: ([]),          // a row of sources in the results
    profilesRowData: ([]),         // a row of profiles in the results
  }

  constructor() {
  }

  /*
   * set args for stuff from gui
   * @param checkStatus the result status
   * @param checkResults the results
   */
  setArgs(checkStatus, checkResults) {
    this.results.checkStatus = checkStatus;
    this.results.checkResults = checkResults;
    this.results.checkStatus.stateMessage = "";
    this.results.checkStatus.progressMessage = "";
    this.startTime = new Date();
  }

  /**
   * Set count of number of profiles requested
   * This can include by query, or returned via watchlist,
   * ancestors, or relatives
   */
  addToTotalProfileCount(cnt) {
    this.results.totalProfileCount += cnt;
  }

  /**
   * Add to number of unchecked profiles due to privacy
   */
  addUncheckedDueToPrivacy() {
    this.results.uncheckedDueToPrivacyCount++;
  }
  /**
   * Add to number of unchecked profiles due to date
   */
  addUncheckedDueToDate() {
    this.results.uncheckedDueToDateCount++;
  }

  /*
   * Add to number of redirected profiles (random check only)
   */
  addRedirectedProfile() {
    this.results.redirectedProfileCount++;
  }

  /**
   * Set whatIsHappening
   * @param current progress message
   */
  setProgressMessage(message) {
    this.results.checkStatus.progressMessage = message;
  }

  /**
   * Set detailed progress (hover text)
   * @param number of profiles requested
   */
  setProgressMessageDetails(requestedProfileCount) {
    let message = "Wait... Requested " + requestedProfileCount + " profiles. Examined "
      + this.results.checkedProfileCount + " profiles. Reported "
      + this.results.reportCount + " profiles";
    this.results.checkStatus.progressMessageTitle = message;
  }

  /**
   * Get count of reported rows
   */
  getReportCount() {
    return this.results.reportCount;
  }

  /*
   * Set state message - more detailed than progress
   */
  setStateMessage(message) {
    this.results.checkStatus.stateMessage = message;
  }

  /**
   * Has the user requested cancel?
   */
  isCancelPending() {
    return this.results.checkStatus.cancelPending;
  }

  /**
   * Add a profile to the results
   * @param bioResults results of parsing and validating profile
   * @param thePerson the person
   * @param reportAllProfiles true to report all profiles
   * @param reportNonManaged true to report profiles not managed by user
   * @param sourcesReport true to report sources for profile
   * @param profileReviewReport true to generate profile review report
   * @param userId for testing nonManaged profiles
   */
  addProfile(bioResults, thePerson, 
             reportAllProfiles, reportNonManaged, sourcesReport,
             profileReviewReport, reportStatsOnly, userId) {

    let rowDataItem = {
      profileId: 0,
      wikiTreeId: "",
      personName: "",
      unsourcedStatus: "No",               // Sourced, Marked, Maybe
      isEmpty: "",
      misplacedLineCnt: "",
      missingEnd: "",                      // Comment, references, Span
      bioHeading: "",                      // Missing, Mulitple, No Lines Follow
      sourcesHeading: "",                  // Missing, Multiple, Extra =
      referencesTag: "",                   // Missing, Multiple, ref following
      acknowledgements: "",                // Before Sources, Extra =
      bioLineCnt : "",
      inlineRefCnt : "",
      sourceLineCnt : "",
    }
    this.results.sourcesReport = sourcesReport;
    this.results.profileReviewReport = profileReviewReport;
    this.results.reportStatsOnly = reportStatsOnly;
    let profileStatus = this.SOURCED; 
    this.results.checkedProfileCount++;
    let profileShouldBeReported = false;
    if (reportAllProfiles) {
      profileShouldBeReported = true;
    }
    if (reportNonManaged) {
      if (userId != thePerson.person.managerId) {
        profileShouldBeReported = true;
      }
    }

    /*
     * A profile with uncertain existance is not needed.
     * The manager profile is only needed if it has style issues and we are reporting style.
     * A sourced profile is needed only if we are reporting style.
     * An empty profile is considered marked unsourced and has a line count of 0.
     * An unsourced marked profile is needed only if we are reporting marked unsourced.
     * (for now always report marked, but might want this in future)
     * An unsourced unmarked profile is always needed.
     */
    if (bioResults.stats.bioIsUncertainExistance) {
      console.log("Profile " + thePerson.person.wikiTreeId + " is Uncertain Existance, not reported");
    } else {
      if (bioResults.style.bioHasStyleIssues) {
        this.results.styleIssuesProfileCnt++;
        profileShouldBeReported = true;
      }
      if (bioResults.stats.bioIsEmpty) {
        profileShouldBeReported = true;
      }
      if (bioResults.stats.bioIsMarkedUnsourced) {
        this.results.unsourcedProfileCnt++;
        profileStatus = this.MARKED;
        profileShouldBeReported = true;
      } else {
        if (!bioResults.sources.sourcesFound) {
          this.results.unmarkedProfileCnt++;
          profileStatus = this.POSSIBLY_UNSOURCED;
          profileShouldBeReported = true;
        } else {
          if (bioResults.stats.bioIsUndated) {
            profileShouldBeReported = true;
          }
        }
      }
    }

    if (profileShouldBeReported) {
      this.results.reportCount++;
      if (!reportStatsOnly) {
        if (sourcesReport) {
          this.reportSources(bioResults, thePerson);
        } else {
          if (profileReviewReport) {
            this.reportReviewProfile(bioResults, thePerson, profileStatus);
          } else {
            this.reportUnsourcedStyle(bioResults, thePerson, rowDataItem,
            profileStatus);
          }
        }
      }
    }
  }

  /*
   * Report unsourced and style for profile (the default)
   * @param bioResults the results of checking
   * @param thePerson who was checked
   * @param rowDataItem the item in the row to populated
   * @param profileStatus the unsourced status
   */
  reportUnsourcedStyle(bioResults, thePerson, rowDataItem, profileStatus) {

    rowDataItem.unsourcedStatus = profileStatus;
    rowDataItem.profileId = thePerson.person.profileId;
    rowDataItem.wikiTreeId = thePerson.person.wikiTreeId;
    // HYPERLINK format should work in Excel, LibreOffice and Google Sheets
    rowDataItem.wikiTreeLink = "https://www.wikitree.com/wiki/" + thePerson.person.wikiTreeId;
    rowDataItem.wikiTreeHyperLink = this.buildHyperLink(rowDataItem.wikiTreeLink, 
                                                            thePerson.person.wikiTreeId);
    rowDataItem.personName = thePerson.person.firstName + " " + thePerson.person.lastName;
    if (bioResults.stats.totalBioLines > 0) {
      rowDataItem.bioLineCnt = bioResults.stats.totalBioLines;
    }
    if (bioResults.stats.inlineReferencesCount > 0) {
      rowDataItem.inlineRefCnt = bioResults.stats.inlineReferencesCount;
    }
    if (bioResults.stats.possibleSourcesLineCount > 0) {
      rowDataItem.sourceLineCnt = bioResults.stats.possibleSourcesLineCount;
    }

    if (bioResults.style.misplacedLineCount > 0) {
      rowDataItem.misplacedLineCnt = bioResults.style.misplacedLineCount;
    }

    if (bioResults.stats.bioIsEmpty) {
      rowDataItem.isEmpty = "Yes";
    }

    // handle multiple style issues that compress into a single row data item
    let missingEnd = ([]);
    if (bioResults.style.hasEndlessComment) {
      missingEnd.push(this.COMMENT);
    }
    if (bioResults.style.bioHasRefWithoutEnd) {
      missingEnd.push(this.REF);
    }
    if (bioResults.style.bioHasSpanWithoutEndingSpan) {
      missingEnd.push(this.SPAN);
    }
    if (missingEnd.length > 0) {
      rowDataItem.missingEnd = missingEnd.join(", ");
    }
    let bioHeading = ([]);
    if (bioResults.style.bioIsMissingBiographyHeading) {
      bioHeading.push(this.MISSING);
    }
    if (bioResults.style.bioHasMultipleBioHeadings) {
      bioHeading.push(this.MULTIPLE);
    }
    if (bioResults.style.bioHeadingWithNoLinesFollowing) {
      bioHeading.push(this.NO_LINES_FOLLOW);
    }
    if (bioResults.style.bioIsAutoGenerated) {
      bioHeading.push(this.AUTO_GENERATED);
    }
    if (bioHeading.length > 0) {
      rowDataItem.bioHeading = bioHeading.join(", ");
    }
    let sourcesHeading = ([]);
    if (bioResults.style.bioIsMissingSourcesHeading) {
      sourcesHeading.push(this.MISSING);
    }
    if (bioResults.style.bioHasMultipleSourceHeadings) {
      sourcesHeading.push(this.MULTIPLE);
    }
    if (bioResults.style.sourcesHeadingHasExtraEqual) {
      sourcesHeading.push(this.EXTRA_EQUALS);
    }
    if (sourcesHeading.length > 0) {
      rowDataItem.sourcesHeading = sourcesHeading.join(", ");
    }
    let referencesTag = ([]);
    if (bioResults.style.bioIsMissingReferencesTag) {
      referencesTag.push(this.MISSING);
    }
    if (bioResults.style.bioHasMultipleReferencesTags) {
      referencesTag.push(this.MULTIPLE);
    }
    if (bioResults.style.bioHasRefAfterReferences) {
      referencesTag.push(this.REF_FOLLOWING);
    }
    if (referencesTag.length > 0) {
      rowDataItem.referencesTag = referencesTag.join(", ");
    }
    let acknowledgements = ([]);
    if (bioResults.style.acknowledgementsHeadingHasExtraEqual) {
      acknowledgements.push(this.EXTRA_EQUALS);
    }
    if (bioResults.style.bioHasAcknowledgementsBeforeSources) {
      acknowledgements.push(this.BEFORE_SOURCES);
    }
    if (acknowledgements.length > 0) {
      rowDataItem.acknowledgements = acknowledgements.join(", ");
    }

    // And add the item to the row data
    this.results.checkResults.resultsRowData.push(rowDataItem);
  }

  /* 
   * Report sources for the profile
   * @param bioResults the results of checking
   * @param thePerson who was checked
   */
  reportSources(bioResults, thePerson) {

    if ((bioResults.sources.invalidSource.length === 0) &&
      (bioResults.sources.validSource.length === 0)) {
        this.reportSourceRow(thePerson, -1, "");
    } else {
      for (let i = 0; i < bioResults.sources.invalidSource.length; i++) {
        this.reportSourceRow(thePerson, 0, bioResults.sources.invalidSource[i]);
      }
      for (let i = 0; i < bioResults.sources.validSource.length; i++) {
        this.reportSourceRow(thePerson, i+1, bioResults.sources.validSource[i]);
      }
    }
  }

  /*
   * Report one source row
   * @param thePerson who was checked
   * @param sourceNum the source number
   * @param sourceContent the source content
   */
  reportSourceRow(thePerson, sourceNum, sourceContent) {
    let rowDataItem = {
      profileId: 0,
      wikiTreeId: "",
      wikiTreeHyperLink: "",
      personName: "",
      sourceCount: "-1",
      sourceLine: "",
      wikiTreeLink: "",
    }
    rowDataItem.profileId = thePerson.person.profileId;
    rowDataItem.wikiTreeId = thePerson.person.wikiTreeId;
    rowDataItem.wikiTreeLink = "https://www.wikitree.com/wiki/" + thePerson.person.wikiTreeId;
    rowDataItem.wikiTreeHyperLink = this.buildHyperLink(rowDataItem.wikiTreeLink, 
                                                        thePerson.person.wikiTreeId);
    rowDataItem.personName = thePerson.person.firstName + " " + thePerson.person.lastName;
    rowDataItem.sourceCount = sourceNum;
    rowDataItem.sourceLine = sourceContent;
    this.results.checkResults.sourcesRowData.push(rowDataItem);
  }

  /**
   * Report profile for review
   * @param bioResults the results of checking
   * @param thePerson who was checked
   * @param profileStatus the unsourced status
   */
  reportReviewProfile(bioResults, thePerson, profileStatus) {
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
    }
    rowDataItem.wikiTreeId = thePerson.person.wikiTreeId;
    rowDataItem.wikiTreeLink = "https://www.wikitree.com/wiki/" + thePerson.person.wikiTreeId;
    rowDataItem.wikiTreeHyperLink = this.buildHyperLink(rowDataItem.wikiTreeLink, 
                                                        thePerson.personwikiTreeId);
    rowDataItem.personName = thePerson.person.firstName + " " + thePerson.person.lastName;
    rowDataItem.reviewerId = " ";
    rowDataItem.reviewStatus = " ";
    rowDataItem.reviewComments = " ";
    rowDataItem.profileStatus = profileStatus;
    if (bioResults.style.bioHasStyleIssues) {
      rowDataItem.hasStyleIssues = "X";
    }
    let privacyString = "";
    switch (thePerson.person.privacyLevel) {
      case 0:           // Not returned by API
        privacyString = "Unknown";
      break;
      case 10:           // Unlisted
        privacyString = "Black";
      break;
      case 20:           // Private
        privacyString = "Red";
      break;
      case 30:           // Private, Public Bio
        privacyString = "Orange";
      break;
      case 35:           // Private, Public Tree
        privacyString = "Light Orange";
      break;
      case 40:          // Private, Public Bio & Tree
        privacyString = "Yellow";
      break;
      case 50:         // Public
        privacyString = "Green";
      break;
      case 60:         // Open
        privacyString = " ";
      break;
    }
    rowDataItem.profilePrivacy = privacyString;
    if (thePerson.person.managerId === 0) {
      rowDataItem.profileIsOrphan = "X";
    }
    rowDataItem.birthDate = thePerson.getReportDate(true);
    rowDataItem.deathDate = thePerson.getReportDate(false);
    this.results.checkResults.profilesRowData.push(rowDataItem);
  }


  /**
   * Build Hyperlink
   * @param theUrl the URL
   * @param displayTest display text for URL
   * @return the hyperlink text
   */
  buildHyperLink(theUrl, displayText) {
    let doubleQuote = "\"\"";
    let hyperlink = "=HYPERLINK(" + doubleQuote + theUrl + doubleQuote + "," 
                                  + doubleQuote + displayText + doubleQuote + ")";
    return hyperlink;
  }


  /**
   * Report summary statistics 
   */
  reportStatistics() {

    this.setProgressMessage("Sorting results....");
    if (this.results.sourcesReport) {
      this.results.checkResults.sourcesRowData.sort(function (a, b) {
        var nameA = a.wikiTreeId.toLowerCase(), nameB = b.wikiTreeId.toLowerCase()
        if (nameA < nameB) //sort string ascending
          return -1
        if (nameA > nameB)
          return 1
        return 0 //default return value (no sorting)
      })
    } else {
      this.results.checkResults.resultsRowData.sort(function (a, b) {
        var nameA = a.wikiTreeId.toLowerCase(), nameB = b.wikiTreeId.toLowerCase()
        if (nameA < nameB) //sort string ascending
          return -1
        if (nameA > nameB)
          return 1
        return 0 //default return value (no sorting)
      })
    }

    // Reporting just to console for random check
    console.log("Redirected profile count " + this.results.redirectedProfileCount);

    let msg = "Checked " + this.results.checkedProfileCount 
      + " profiles: Found "
      + this.results.reportCount + " profiles with "
      + this.results.styleIssuesProfileCnt + " style issues; "
      + this.results.unsourcedProfileCnt + " marked unsourced; "
      + this.results.unmarkedProfileCnt + " possibly unsourced not marked";
    if (this.results.checkStatus.cancelPending) {
      msg = "Canceled. " + msg;
    }
    this.setProgressMessage(msg);
    msg = "Check completed. Examined unique " + this.results.totalProfileCount + " profiles.";
      this.results.uncheckedDueToPrivacyCount + " profiles";
      let otherCnt = this.results.uncheckedDueToPrivacyCount;
      otherCnt += this.results.uncheckedDueToDateCount;
      if (otherCnt> 0) {
        msg += " Privacy, date, or other reasons did not allow checking for " +
              otherCnt + " profiles";
      }
      /*if (this.results.uncheckedDueToPrivacyCount > 0) {
       msg += " Privacy or other reasons did not allow checking for " +
              this.results.uncheckedDueToPrivacyCount + 
              " profiles";
      }
              */
    this.setStateMessage(msg);
    this.results.checkStatus.progressMessageTitle = "";
    this.results.checkStatus.cancelPending = false;
    this.results.checkStatus.cancelDisabled = true;
    this.results.checkStatus.checkDisabled = false;
    if (!this.results.reportStatsOnly) {
      this.results.checkStatus.exportDisabled = false;
    }
    this.getElapsedTime();
  }

  /** 
   * Get elapsed time 
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
