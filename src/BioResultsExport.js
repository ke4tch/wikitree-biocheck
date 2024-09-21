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

/**
 * Export BioResults as CSV
 */
export class BioResultsExport {
  // TODO any other char besides # that makes it barf?
  // yea definately the " and maybe [ and ] perhaps more

  constructor() {
  }

  /**
   * export results rows as CSV
   * @param {Object} userArgs input user args
   * @param {Array} resultsRowData row data to export
   */
  exportResultsRowCsv(userArgs, resultsRowData) {
    let filename = this.#buildFilename(userArgs);
    let csvData = "data:text/csv;charset=utf-8,";

    // Get the report columns
    let reportColumns = this.#getReportColumns(userArgs.selectedReportType);
    let headerData = this.#getResultsHeaderRow(reportColumns);
    csvData += headerData;
    csvData += "\n";
    // Add each row to result
    // surround with " to handle entries with a ,
    for (let i = 0; i < resultsRowData.length; i++) {
      let resultRow = resultsRowData[i];
      let rda = [];
      for (let key in reportColumns) {
        let val = resultRow[key].toString();
        if (key != "wikiTreeHyperLink") {
          val = val.replace(/#/g, "");
          val = val.replace(/\u005B/g, " ");  // [
          val = val.replace(/\u005D/g, " ");  // ]
          val = val.replace(/\u201C/g, '');
          val = val.replace(/\u201D/g, '');
          val = val.replace(/\u0022/g, "");  // "
        }
        if (userArgs.selectedReportType == "sourcesReport") {
          /* TODO this is what you had for sources report you might need it
          val = val.replace(/\u201C/g, '"');   // same but only not in hyperlink
          val = val.replace(/\u201D/g, '"');   // same but only not in hyperlink
          val = val.replace(/\t/g, " ");
          if (key != "wikiTreeHyperLink") {
            val = val.replace(/"/g, '""');     // different
            val = val.replace(/#/g, "");different
          }
          if (val.search(/("|,|\n)/g) >= 0) {
            val = '"' + val + '"';
          }
          if (key == 'personName')  {
            val = '"' + val + '"';
          }
          */
        }
        val = '"' + val + '"';
        rda.push(val);
      }
      csvData += rda.join(",");
      csvData += "\n";
    }
    const data = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", data);
    link.setAttribute("target", "_blank");
    link.setAttribute("download", filename);
    link.click();
  }

  /*
   * Build filename to reflect what was used for report
   * @param {Object} userArgs input user args
   */
  #buildFilename(userArgs) {
    let filename = "bioCheck_";
    if (userArgs.selectedCheckType === "checkByQuery") {
      filename += userArgs.queryArg;
    } else {
      if (userArgs.selectedCheckType === 'checkRandom') {
        filename += "Random";
      } else {
        filename = userArgs.inputWikiTreeId;
        if (userArgs.selectedCheckType === "checkWatchlist") {
          filename += "_Watchlist";
        } else {
          if (userArgs.selectedCheckType === "checkChallenge") {
            if (filename.length > 0) {
              filename += "_" + userArgs.challengeName + "_" + userArgs.challengeDate;
            } else {
              filename = "Challenge_" + userArgs.challengeName + "_" + userArgs.challengeDate;
            }
          } else {
            if (userArgs.numAncestorGen > 0) {
              filename += "_" + userArgs.numAncestorGen + "AncestorGenerations";
            }
            if (userArgs.numDescendantGen > 0) {
              filename += "_" + userArgs.numDescendantGen + "DescendantGenerations";
            }
          }
        }
      }
    }
    if (userArgs.numRelatives > 0) {
      filename += "_Relatives_" + userArgs.numRelatives;
    }
    filename = filename.replace(/\s+/g, "_");
    filename += ".csv";
    return filename;
  }

  /*
   * Get comma delimited list of column titles
   */
  #getResultsHeaderRow(reportColumns) {
    let headings = [];
    for (let key in reportColumns) {
      headings.push('"' + reportColumns[key] + '"');
    }
    let headerData = headings.join(",");
    return headerData;
  }

  /*
   * Get the key and text value for the report type
   */
  #getReportColumns(selectedReportType) {

    let detailedReportColumns = {
      profileId: "Profile Id",
      wikiTreeId: "WikiTree Id",
      personName: "Name",
      profileStatus: "Sourced?",
      requiredSections: "Required Sections",
      styleDetails: "Style Issues",
      searchPhrase: "Search?",
      bioLineCnt: "Bio Lines",
      numSources: "Number Valid Sources",
      inlineRefCnt: "Inline ref",
      sourceLineCnt: "Source Line Count",
      wikiTreeLink: "URL",
      wikiTreeHyperLink: "Link",
    };
    let summaryReportColumns = {
      wikiTreeId: "WikiTree Id",
      wikiTreeHyperLink: "Link",
      personName: "Name",
      reviewerId: "Reviewer Id",
      reviewStatus: "Review Status",
      reviewComments: "Review Comments",
      profileStatus: "Sourced?",
      hasStyleIssues: "Style?",
      profilePrivacy: "Privacy",
      profileIsOrphan: "Orphan",
      birthDate: "Birth Date",
      deathDate: "Death Date",
    };
    let sourcesReportColumns = {
      profileId: "Profile Id",
      wikiTreeId: "WikiTree Id",
      wikiTreeHyperLink: "Link",
      personName: "Name",
      sourceCount: "Count",
      sourceLine: "Source",
      wikiTreeLink: "URL",
    };
    // Just get the columns for the desired report
    let reportColumns = detailedReportColumns;
    if (selectedReportType == "summaryReport") {
        reportColumns = summaryReportColumns;
    } else {
      if (selectedReportType == "sourcesReport") {
        reportColumns = sourcesReportColumns;
      }
    }
    return reportColumns;
  }
}
