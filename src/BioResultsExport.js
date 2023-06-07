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
 * Export BioResults as CSV
 */
export class BioResultsExport {
  // TODO any other char besides # that makes it barf?

  constructor() {
    console.log("BioResultsExport");
  }

  /**
   * export results rows as CSV
   * @param {Object} userArgs input user args
   * @param {Array} resultsRowData row data to export
   */
  exportResultsRowCsv(userArgs, resultsRowData) {
    console.log("exportResultsRowCsv");
    let filename = this.#buildFilename(userArgs);
    let csvData = "data:text/csv;charset=utf-8,";
    let headerRow = resultsRowData[0];
    let headerData = this.#getResultsRowHeaderData(headerRow);
    csvData += headerData;
    csvData += "\n";
    // surround with " to handle entries with a ,
    for (let i = 0; i < resultsRowData.length; i++) {
      let resultRow = resultsRowData[i];
      let rda = [];
      for (let key in resultRow) {
        let val = '"' + resultRow[key] + '"';
        val = val.replace(/#/g, "");
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
    //                  document.body.appendChild(link);
    link.click();
    //            document.body.removeChild(link);
  }

  /**
   * export sources rows as CSV
   * @param {Object} userArgs input user args
   * @param {Array} sourcesRowData row data to export
   */
  exportSourcesRowCsv(userArgs, sourcesRowData) {
    let filename = this.#buildFilename(userArgs);
    let csvData = "data:text/csv;charset=utf-8,";
    let headerRow = sourcesRowData[0];
    let headerData = this.#getSourcesRowHeaderData(headerRow);
    csvData += headerData;
    csvData += "\n";
    // surround with " to handle entries with a ,
    for (let i = 0; i < sourcesRowData.length; i++) {
      let sourcesRow = sourcesRowData[i];
      let rda = [];
      for (let key in sourcesRow) {
        //unicode 201C and 201D are left and right double quotes
        let val = sourcesRow[key].toString();
        val = val.replace(/\u201C/g, '"');
        val = val.replace(/\u201D/g, '"');
        val = val.replace(/\t/g, " ");
        if (key != "wikiTreeHyperLink") {
          val = val.replace(/"/g, '""');
          val = val.replace(/#/g, "");
        }
        if (val.search(/("|,|\n)/g) >= 0) {
          val = '"' + val + '"';
        }
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
    //                  document.body.appendChild(link);
    link.click();
    //            document.body.removeChild(link);
  }

  /**
   * export review rows as CSV
   * @param {Object} userArgs input user args
   * @param {Array} profilesRowData row data to export
   */
  exportReviewRowCsv(userArgs, profilesRowData) {
    let filename = this.#buildFilename(userArgs);
    let csvData = "data:text/csv;charset=utf-8,";
    let headerRow = profilesRowData[0];
    let headerData = this.#getReviewRowHeaderData(headerRow);
    csvData += headerData;
    csvData += "\n";
    // surround with " to handle entries with a ,
    for (let i = 0; i < profilesRowData.length; i++) {
      let resultRow = profilesRowData[i];
      let rda = [];
      for (let key in resultRow) {
        if (key != "wikiTreeLink") {
          let val = '"' + resultRow[key] + '"';
          val = val.replace(/#/g, "");
          rda.push(val);
        }
      }
      csvData += rda.join(",");
      csvData += "\n";
    }
    const data = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", data);
    link.setAttribute("target", "_blank");
    link.setAttribute("download", filename);
    //                  document.body.appendChild(link);
    link.click();
    //            document.body.removeChild(link);
  }

  /*
   * Build filename to reflect what was used for report
   * @param {Object} userArgs input user args
   */
  #buildFilename(userArgs) {
    let filename = "bioCheck";
    if (userArgs.selectedCheckType === "checkByQuery") {
      filename = userArgs.queryArg;
    } else {
      filename = userArgs.inputWikiTreeId;
      if (userArgs.selectedCheckType === "checkWatchlist") {
        filename += "_Watchlist";
      } else {
        if (userArgs.numAncestorGen > 0) {
          filename += "_" + userArgs.numAncestorGen + "AncestorGenerations";
        }
        if (userArgs.numDescendantGen > 0) {
          filename += "_" + userArgs.numDescendantGen + "DescendantGenerations";
        }
      }
    }
    filename += ".csv";
    if (userArgs.numRelatives > 0) {
      filename += "_Relatives_" + userArgs.numRelatives;
    }
    filename = filename.replace(/\s+/g, "_");
    return filename;
  }

  /*
   * headers for default report
   */
  #getResultsRowHeaderData(firstRow) {
    let headerText = {
      profileId: "Profile Id",
      wikiTreeId: "WikiTree Id",
      personName: "Name",
      unsourcedStatus: "Sourced?",
      requiredSections: "Required Sections",
      styleDetails: "Style Issues",
      searchPhrase: "Search",
      bioLineCnt: "Bio Lines",
      inlineRefCnt: "Inline ref",
      sourceLineCnt: "Source Line Count",
      wikiTreeHyperLink: "Link",
    };
    let headings = [];
    for (let prop in firstRow) {
      headings.push(headerText[prop]);
    }
    let headerData = headings.join(",");
    return headerData;
  }

  /*
   * get headers for sources report
   */
  #getSourcesRowHeaderData(firstRow) {
    let headerText = {
      profileId: "Profile Id",
      wikiTreeId: "WikiTree Id",
      wikiTreeHyperLink: "Link",
      personName: "Name",
      sourceCount: "Count",
      sourceLine: "Source",
      wikiTreeLink: "URL",
    };
    let headings = [];
    for (let prop in firstRow) {
      headings.push(headerText[prop]);
    }
    let headerData = headings.join(",");
    return headerData;
  }

  /**
   * get headers for review report
   */
  #getReviewRowHeaderData(firstRow) {
    let headerText = {
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
    let headings = [];
    for (let prop in firstRow) {
      headings.push(headerText[prop]);
    }
    let headerData = headings.join(",");
    return headerData;
  }
}
