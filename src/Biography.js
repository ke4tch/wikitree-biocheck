/*
Created By: Kay Knight (Sands-1865)
*/

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
 * Parse and validate a WikiTree biography.
 * Gather information about style and the parts needed to validate
 * along with information about the bio and methods to parse and validate
 */
export class Biography {
  #sourceRules = null; // rules for testing sources
  #bioLines = []; // lines in the biography
  #bioHeadingsFound = []; // biography headings found (multi lang)
  #sourcesHeadingsFound = []; // sources headings found (multi lang)
  #invalidSpanTargetList = []; // target of a span that are not valid
  #refStringList = []; // all the <ref> this </ref> lines
  #namedRefStringList = []; // all the <ref> with names
  #headings = [];    // collection of heading lines
  #wrongLevelHeadings = [];   // collection of wrong level 2 headings
  #researchNotesBoxes = [];   // what research notes boxes are there?
  #unexpectedLines = [];       // unexpected lines before bio heading
  #missingRnb = [];  // missing Research Note Boxes

  #bioInputString = ""; // input string may be modified by processing
  #biographyIndex = -1; // line with the biography heading 
  #acknowledgementsEndIndex = -1; // next heading or end of bio
  #sourcesIndex = -1; // first line of sources
  #referencesIndex = -1; // index into vector for <references tag
  #acknowledgementsIndex = -1; // first line of acknowledgements
  #researchNotesIndex = -1; // first line of researchNotes
  #researchNotesEndIndex = -1; // last line of research notes is next heading

  #notocIndex = -1;  // location of __NOTOC__ if any
  #firstCategoryIndex = -1;  // first category line
  #firstNonBlankLine = -1;  // first line not blank

  #isPre1700 = false; // is this a pre1700 profile
  #isPre1500 = false; // is this a pre1500 profile
  #tooOldToRemember = false; // is this profile to old to remember
  #treatAsPre1700 = false; // treat all profiles as pre1700
  #bioSearchString = '';  // string to search for in bio

  // Hold results of parsing and validating a WikiTree biography
  #stats = {
      bioIsEmpty: false,
      bioHasCategories: false,
      bioIsMarkedUnsourced: false,
      bioIsUndated: false,
      totalBioLines: 0,
      inlineReferencesCount: 0, // number of <ref>
      possibleSourcesLineCount: 0, // number of lines that might contain sources
    };
  #style = {
      bioHasNonCategoryTextBeforeBiographyHeading: false,
      bioHasStyleIssues: false,
      hasEndlessComment: false,
      bioIsMissingBiographyHeading: false,
      bioHeadingWithNoLinesFollowing: false,
      bioHasMultipleBioHeadings: false,
      bioHasRefWithoutEnd: false,
      bioHasSpanWithoutEndingSpan: false,
      bioIsMissingSourcesHeading: false,
      sourcesHeadingHasExtraEqual: false,
      bioHasMultipleSourceHeadings: false,
      misplacedLineCount: 0, // between Sources and <references />
      bioIsMissingReferencesTag: false,
      bioHasMultipleReferencesTags: false,
      bioHasRefAfterReferences: false,
      acknowledgementsHeadingHasExtraEqual: false,
      bioHasAcknowledgementsBeforeSources: false,
      bioHasUnknownSectionHeadings: false,
      bioCategoryNotAtStart: false,
      bioMissingResearchNotesBox: false,
      bioMightHaveEmail: false,
      bioHasSearchString: false,
  };
  #sources = {
      sourcesFound: false,
      // Invalid sources that were found - each an array
      // might not need/want these, depends on reporting
      invalidSource: [],
      //invalidStandAloneSource: [],
      //invalidPartialSource: [],
      //invalidStartPartialSource: [],
      //invalidSpanTargetSource: [],
      validSource: [],
  };
  #messages = {
    sectionMessages: [],
    styleMessages: [],
  };

  static #START_OF_COMMENT = "<!--";
  static #END_OF_COMMENT = "-->";
  static #START_OF_BR = "<br";
  static #REF_START = "<ref>";
  static #REF_END = "</ref>";
  static #END_BRACKET = ">";
  static #REF_START_NAMED = "<ref name";
  static #REF_END_NAMED = "/>";
  static #HEADING_START = "==";
  static #CATEGORY_SYNTAX = "[[";
  static #CATEGORY_START = "[[category";
  static #REFERENCES_TAG = "<references";
  static #UNSOURCED = "unsourced";
  static #UNSOURCED_TAG = "{{unsourced";
  static #UNSOURCED_TAG2 = "{{ unsourced";
  static #SPAN_TARGET_START = "<span id=";
  static #SPAN_TARGET_END = "</span>";
  static #SPAN_REFERENCE_START = "[[#";
  static #SPAN_REFERENCE_END = "]]";
  static #SOURCE_START = "source:";
  static #SEE_ALSO = "see also";
  static #TEMPLATE_START = "{{";
  static #TEMPLATE_END = "}}";
  static #NOTOC = "__notoc__";
  static #TOC = "__toc__";
  static #MIN_SOURCE_LEN = 15; // minimum length for valid source

  /**
   * Constructor
   * @param sourceRules {SourceRules} source rules for validating sources
   */
  constructor(theSourceRules) {
    this.#sourceRules = theSourceRules;
  }

  /**
   * Parse contents of the bio.
   * Side effects - set statistics and style
   * @param {String} inStr bio string as returned by API in Wiki format for the profile
   * @param {Boolean} isPre1500 true if profile is treated as Pre1500
   * @param {Boolean} isPre1700 true if profile is treated as Pre1700
   * @param {Boolean} mustBeOpen true if profile is treated as too old to remember
   * @param {Boolean} bioUndated true if profile has no dates
   * @param {Boolean} search string to report any profile containing the string
   */
  parse(inStr, isPre1500, isPre1700, mustBeOpen, bioUndated, bioSearchString) {
    this.#isPre1500 = isPre1500;
    this.#isPre1700 = isPre1700;
    this.#tooOldToRemember = mustBeOpen;
    this.#stats.bioIsUndated = bioUndated;
    this.#bioSearchString = bioSearchString;

    this.#bioInputString = inStr;
    // Check for empty bio
    if (this.#bioInputString.length === 0) {
      this.#stats.bioIsEmpty = true;
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Biography is empty');
      return;
    }
    // check for endless comment
    this.#bioInputString = this.#swallowComments(this.#bioInputString);
    if (this.#style.hasEndlessComment) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Comment with no ending');
      return;
    }
    // assume no style issues
    this.#style.bioHasStyleIssues = false;

    // swallow any <br>
    this.#bioInputString = this.#swallowBr(this.#bioInputString);

    let haveResearchNotesBox = false;
    let haveNavBox = false;
    let haveProjectBox = false;
    let haveBiography = false;

    // build a vector of each line in the bio then iterate
    this.#getLines(this.#bioInputString);
    let lineCount = this.#bioLines.length;
    let currentIndex = 0;
    
    // when you find a template {{ it might encompass multiple lines
    // so you want to combine them until you find the line with the }}
    // and you also want the line after the {{ and up to the first | or the }} to test
    while (currentIndex < lineCount) {
      let line = this.#bioLines[currentIndex].toLowerCase().trim();
      let linesToSkip = 0;
      if (line.length > 0) {         // something here?
        if (this.#firstNonBlankLine < 0) {
          this.#firstNonBlankLine = currentIndex;
        }
        if (line.indexOf(Biography.#REFERENCES_TAG) >= 0) {
          this.#referencesIndex = currentIndex;
        }
        if (line.startsWith(Biography.#HEADING_START)) {
          this.#evaluateHeadingLine(line, currentIndex, this.#bioLines[currentIndex]);
          if (this.#biographyIndex >= 0) {
            haveBiography = true;
          }
        } 
        if (this.#checkForEmail(line)) {
          this.#style.bioMightHaveEmail = true;
        }
        if (this.#bioSearchString.length > 0) {
          if (line.includes(this.#bioSearchString.toLowerCase())) {
            this.#style.bioHasSearchString = true;
          }
        }
        // Check for stuff before the biography
        if (line.startsWith(Biography.#CATEGORY_SYNTAX)) {
          line = line.replace("[[ ", "[[");
        }
        if (line.startsWith(Biography.#CATEGORY_START)) {
          // out of order if RNB, Project Box, Nav Box or Biography heading preceeds
          if (haveResearchNotesBox || haveNavBox || haveProjectBox || haveBiography) {
            this.#style.bioCategoryNotAtStart = true;
          }
          this.#stats.bioHasCategories = true;
          if (this.#firstCategoryIndex < 0) {
            this.#firstCategoryIndex = currentIndex;
          }
          if (line.includes(Biography.#UNSOURCED)) {
            this.#stats.bioIsMarkedUnsourced = true;
          }
        } else {
          let partialLine = '';
          let partialMixedCaseLine = '';
          if (line.startsWith(Biography.#TEMPLATE_START)) {
            // handle case of template on multiple lines
            let j = line.indexOf(Biography.#TEMPLATE_END);
            let combinedLine = line;
            let nextIndex = currentIndex + 1;
            let foundEnd = true;
            if (j < 0) {
              foundEnd = false;
            }
            while (!foundEnd && nextIndex < lineCount) {
              if (nextIndex < lineCount) {
                combinedLine = combinedLine + this.#bioLines[nextIndex].toLowerCase().trim();
                nextIndex++;
                linesToSkip++;
              }
              if (combinedLine.indexOf(Biography.#TEMPLATE_END) >= 0) {
                foundEnd = true;
              }
            }
            line = combinedLine;
            if (line.startsWith(Biography.#TEMPLATE_START)) {
              let j = line.indexOf(Biography.#TEMPLATE_END);
              if (j < 3) {
                j = 2;
              }
              let k = line.indexOf('|');
              if (k > 0) {
                j = k;
              }
              partialLine = line.substring(2, j).trim().toLowerCase();
              partialMixedCaseLine = this.#bioLines[currentIndex].substring(2, j).trim();
            }
            if (this.#sourceRules.isResearchNotesBox(partialLine)) {
              if (haveProjectBox || haveBiography) {
                let msg = 'Research Note Box: ' + partialMixedCaseLine + ' should be before ';
                if (haveProjectBox) {
                  msg += 'Project ';
                } else {
                  if (haveBiography) {
                    msg += 'Biography ';
                  }
                }
                this.#messages.styleMessages.push(msg);
                this.#style.bioHasStyleIssues = true;
              }
              // TODO see Lejeune-586 maybe elminate nav box
              // on the other hand this looks awful, deal with it later
              // maybe propose some standard

              // out of order if Project Box or Nav Box or Biography preceeds
              haveResearchNotesBox = true;
              this.#researchNotesBoxes.push(partialLine);

              let stat = this.#sourceRules.getResearchNotesBoxStatus(partialLine);
              if ((stat.length > 0) && (stat != 'approved')) {
                let msg = 'Research Note Box: ' + partialMixedCaseLine + ' is ' + stat + ' status';
                this.#messages.styleMessages.push(msg);
                this.#style.bioHasStyleIssues = true;
              }
            } else {

              if (this.#sourceRules.isProjectBox(partialLine)) {
                haveProjectBox = true;
                if (haveBiography) {
                  let msg = 'Project: ' + partialMixedCaseLine + ' should be before Biography';
                  this.#messages.styleMessages.push(msg);
                  this.#style.bioHasStyleIssues = true;
                }
              } else {
                if (this.#sourceRules.isNavBox(partialLine)) {
                  haveNavBox = true;
                  if (haveBiography) {
                    let msg = 'Navigation box: ' + partialMixedCaseLine + ' should be before Biography';
                    this.#messages.styleMessages.push(msg);
                    this.#style.bioHasStyleIssues = true;
                  }
                } else {
                  if (this.#sourceRules.isSticker(partialLine)) {
                    if (!haveBiography) {
                      let msg = 'Sticker: ' + partialMixedCaseLine + ' should be after Biography';
                      this.#messages.styleMessages.push(msg);
                      this.#style.bioHasStyleIssues = true;
                    }
                  }  // end sticker
                } // end nav box
              } // end project box 
            } // end research note box
          } else {
            // not a template
            // something other than category or template or NOTOC before biography heading ?
            if (!haveBiography) {
              if ((line.includes(Biography.#NOTOC)) || (line.includes(Biography.#TOC))) {  // this is okay
                this.#notocIndex = currentIndex;
              } else {
                let str = this.#bioLines[currentIndex];
                let i = str.length;
                if (i > 40) {
                  str = str.substring(0, 40);
                  str += "...";
                }
                // TODO well it looks like anything other than a separator is allowed
                // but there may be font or headings or whatever so...
                // report with caveat, you can take it out later
                //let tmpString = str.replace("-", " ");
                //tmpString = tmpString.trim();
                //if (tmpString.length > 0) {
                  this.#unexpectedLines.push(str);
                //}
              }
            }
          }
        }
      }
      // need to skip lines if you combined lines
      currentIndex = currentIndex + 1 + linesToSkip;
    }
    // acknowlegements may go to end of bio
    if (this.#acknowledgementsEndIndex < 0) {
      this.#acknowledgementsEndIndex = lineCount;
    }
    if (this.#wrongLevelHeadings.length > 0) {
      this.#style.bioHasUnknownSectionHeadings = true;
    }
    if (this.#firstNonBlankLine < 0) {
      this.#firstNonBlankLine = 0;
    }
    let whereWeExpectCategory = this.#firstNonBlankLine;
    if (this.#notocIndex >= 0) {
      whereWeExpectCategory = this.#notocIndex + 1;
    }
    if ((this.#firstCategoryIndex >= 0) && (this.#firstCategoryIndex != whereWeExpectCategory)) {
      this.#style.bioCategoryNotAtStart = true;
    }
    // Check for any section with RNB text where the RNB is missing
    this.#findMissingRnb();

    let line = this.#bioInputString.toLowerCase();
    if (line.includes(Biography.#UNSOURCED_TAG) || line.includes(Biography.#UNSOURCED_TAG2)) {
      this.#stats.bioIsMarkedUnsourced = true;
    }

    // Get the string that might contain <ref>xxx</ref> pairs
    let bioLineString = this.#getBioLineString();
    this.#findRef(bioLineString);
    this.#findNamedRef(bioLineString);

    this.#setBioStatisticsAndStyle();

    // Lose bio lines not considered to contain sources before testing sources
    this.#removeResearchNotes();
    this.#removeAcknowledgements();

    return;
  }

  /**
   * Validate contents of bio
   * @returns {Boolean} true if probably valid sources and no style issues, else false
   */
  validate() {
    let isValid = false;
    // Don't bother for empty bio, one already marked unsourced, or the manager's own profile
    if (
      !this.#stats.bioIsEmpty &&
      !this.#stats.bioIsMarkedUnsourced &&
      !this.#stats.bioIsUndated
    ) {
      // Look for a partial string that makes it valid
      isValid = this.#sourceRules.containsValidPartialSource(this.#bioInputString.toLowerCase());

      /*
       * First validate strings after references. This will build a side effect of
       * a list of invalid span tags.
       * Next validate strings between Sources and <references />. This will update/build
       * a side effect list of invalid span tags.
       * Finally validate the references, looking at invalid span tags if needed.
       *
       * Strings after references and within named and unnamed ref tags are
       * validated to add those to the list of valid/invalid sources
       */
      if (!isValid) {
        isValid = this.#validateReferenceStrings(true);
        if (this.#validateRefStrings(this.#refStringList)) {
          if (!isValid) {
            isValid = true;
          }
        }
        if (this.#validateRefStrings(this.#namedRefStringList)) {
          if (!isValid) {
            isValid = true;
          }
        }
        if (!isValid) {
          this.#sources.sourcesFound = false;
          isValid = false;
        }
      }
    }
    if (isValid) {
      this.#sources.sourcesFound = true;
    }
    return isValid;
  }

  /**
   * Validate contents Sources for adding a new profile
   * @param {String} sourcesStr string containing sources
   * @param {Boolean} isPre1500 true if profile is treated as Pre1500
   * @param {Boolean} isPre1700 true if profile is treated as Pre1700
   * @param {Boolean} mustBeOpen true if profile is treated as too old to remember
   * @returns {Boolean} true if probably valid sources, else false
   */
  validateSourcesStr(sourcesStr, isPre1500, isPre1700, mustBeOpen) {
    // build bioLines from the input sources string then validate
    this.#getLines(sourcesStr);
    this.#isPre1500 = isPre1500;
    this.#isPre1700 = isPre1700;
    this.#tooOldToRemember = mustBeOpen;
    let isValid = this.#validateReferenceStrings(false);
    if (isValid) {
      this.#sources.sourcesFound = true;
    }
    return isValid;
  }

  /* *********************************************************************
   * ******************* getters for results *****************************
   * *********************************************************************
   */
  // getters for stats results
  /**
   * is bio empty
   * @returns {Boolean} true if bio empty
   */
  isEmpty() {
    return this.#stats.bioIsEmpty;
  }
  /**
   * does bio have categories
   * @returns {Boolean} true if bio has categories
   */
  hasCategories() {
    return this.#stats.bioHasCategories;
  }
  /**
   * does bio have Unsourced template or category
   * @returns {Boolean} true if bio unsourced
   */
  isMarkedUnsourced() {
    return this.#stats.bioIsMarkedUnsourced;
  }
  /**
   * is bio undated
   * @returns {Boolean} true if bio has neither birth nor death date
   */
  isUndated() {
    return this.#stats.bioIsUndated;
  }
  /**
   * get total number of lines in bio
   * @returns {Number} total number of bio lines
   */
  getTotalBioLines() {
    return this.#stats.totalBioLines;
  }
  /**
   * get number of inline ref
   * @returns {Number} number of inline ref
   */
  getInlineRefCount() {
    return this.#stats.inlineReferencesCount;
  }
  /**
   * get number of lines that might contain sources
   * @returns {Number} number of lines that might contain sources
   */
  getPossibleSourcesLineCount() {
    return this.#stats.possibleSourcesLineCount;
  }
  // getters for style results
  /**
   * does bio have non category text before biography heading
   * @returns {Boolean} true if bio has non category text before bio heading
   */
  hasNonCategoryTextBeforeBiographyHeading() {
    return this.#style.bioHasNonCategoryTextBeforeBiographyHeading;
  }
  /**
   * does bio have section or subsection heading that matches a Research Note Box
   * but lack the Research Note Box
   * @returns {Boolean} true if bio missing Research Note
   */
  hasMissingResearchNotesBox() {
    return this.#style.bioMissingResearchNotesBox;
  }
  /**
   * does bio have style issues
   * @returns {Boolean} true if bio has style issues
   */
  hasStyleIssues() {
    return this.#style.bioHasStyleIssues;

  }
  /**
   * does bio have endless comment
   * @returns {Boolean} true if bio has endless comment
   */
  hasEndlessComment() {
    return this.#style.hasEndlessComment;
  }
  /**
   * is bio missing biography heading
   * @returns {Boolean} true if bio is missing biography heading
   */
  isMissingBiographyHeading() {
    return this.#style.bioIsMissingBiographyHeading;
  }
  /**
   * does bio have biography heading with no lines following
   * @returns {Boolean} true if bio has biography heading with no lines following
   */
  hasHeadingWithNoLinesFollowing() {
    return this.#style.bioHeadingWithNoLinesFollowing;
  }
  /**
   * does bio have multiple biography headings
   * @returns {Boolean} true if bio has multiple biography headings
   */
  hasMultipleBioHeadings() {
    return this.#style.bioHasMultipleBioHeadings;
  }
  /**
   * does bio have ref with ending ref
   * @returns {Boolean} true if bio haref with ending refs 
   */
  hasRefWithoutEnd() {
    return this.#style.bioHasRefWithoutEnd;
  }
  /**
   * does bio have span without ending span
   * @returns {Boolean} true if bio has span without ending span
   */
  hasSpanWithoutEndingSpan() {
    return this.#style.bioHasSpanWithoutEndingSpan;
  }
  /**
   * is bio missing sources heading
   * @returns {Boolean} true if bio is missing sources heading
   */
  isMissingSourcesHeading() {
    return this.#style.bioIsMissingSourcesHeading;
  }
  /**
   * does bio have sources heading with extra =
   * @returns {Boolean} true if bio has sources heading with extra =
   */
  sourcesHeadingHasExtraEqual() {
    return this.#style.sourcesHeadingHasExtraEqual;
  }
  /**
   * does bio have multiple sources headings
   * @returns {Boolean} true if bio has multiple sources headings
   */
  hasMultipleSourceHeadings() {
    return this.#style.bioHasMultipleSourceHeadings;
  }
  /**
   * how many lines are between Sources and references
   * @returns {Number} number of lines between sources and references
   */
  getMisplacedLineCount() {
    return this.#style.misplacedLineCount;
  }
  /**
   * is bio missing the references tag
   * @returns {Boolean} true if is missing the references tag
   */
  isMissingReferencesTag() {
    return this.#style.bioIsMissingReferencesTag;
  }
  /**
   * does bio have multiple references tags
   * @returns {Boolean} true if bio has multiple references tags
   */
  hasMultipleReferencesTags() {
    return this.#style.bioHasMultipleReferencesTags;
  }
  /**
   * does bio have ref after references
   * @returns {Boolean} true if bio has ref after references
   */
  hasRefAfterReferences() {
    return this.#style.bioHasRefAfterReferences;
  }
  /**
   * does bio have acknowledgements heading with extra =
   * @returns {Boolean} true if bio has acknowledgements heading with extra =
   */
  acknowledgementsHeadingHasExtraEqual() {
    return this.#style.acknowledgementsHeadingHasExtraEqual;
  }
  /**
   * does bio have acknowledgements before sources
   * @returns {Boolean} true if bio has acknowledgements before sources
   */
  hasAcknowledgementsBeforeSources() {
    return this.#style.bioHasAcknowledgementsBeforeSources;
  }
  /** 
   * does bio have unknown section headings
   * @returns {Boolean} true if bio has unknown section headings
   */
  hasUnknownSection() {
    return this.#style.bioHasUnknownSectionHeadings;
  }
  /** 
   * Return messages for reporting
   * @returns sectionMessages[]
   */
  getSectionMessages() {
    return this.#messages.sectionMessages;
  }
  /** 
   * Return messages for reporting
   * @returns styleMessages[]
   */
  getStyleMessages() {
    return this.#messages.styleMessages;
  }
  /**
   * does bio have search string
   * @returns {Boolean} true if bio has someting before categories
   */
  hasSearchString() {
    return this.#style.bioHasSearchString;
  }

  /**
   * Return headings
   * @returns {Array} containing header context objects
   */
  getHeadings() {
    return this.#headings;
  }

  // getters for sources results
  /**
   * does bio appear to have sources
   * @returns {Boolean} true if bio appears to have sources
   */
  hasSources() {
    return this.#sources.sourcesFound;
  }
  /**
   * get invalid sources found for profile
   * @returns {Array} array of String of invalid source lines
   */
  getInvalidSources() {
    return this.#sources.invalidSource;
  }
  /**
   * get valid sources found for profile
   * @returns {Array} array of String of valid source lines
   */
  getValidSources() {
    return this.#sources.validSource;
  }

  /* *********************************************************************
   * ******************* PRIVATE METHODS *********************************
   * ******************* used by Parser **********************************
   * *********************************************************************
   */

  /*
   * Swallow comments
   * side effect set style if endless comment found
   * @param {String} inStr
   * @returns {String} string with comments removed
   */
  #swallowComments(inStr) {
    let outStr = "";
    /*
     * Find start of comment
     * Put everything before start in output string
     * Find end of comment, skip past the ending and start looking there
     */
    let pos = 0; // starting position of the comment
    let endPos = 0; // end position of the comment
    let len = inStr.length; // length of input string
    pos = inStr.indexOf(Biography.#START_OF_COMMENT);
    if (pos < 0) {
      outStr = inStr; // no comments
    }
    while (pos < len && pos >= 0) {
      // get everything to start of comment unless comment is first line in bio
      if (pos > 0) {
        outStr = outStr + inStr.substring(endPos, pos - 1);
      }
      // Find end of comment
      endPos = inStr.indexOf(Biography.#END_OF_COMMENT, pos);
      if (endPos > 0) {
        pos = endPos + 3; // skip the --> and move starting position there
        if (pos <= len) {
          pos = inStr.indexOf(Biography.#START_OF_COMMENT, pos); // find next comment
          if (pos < 1) {
            outStr += inStr.substring(endPos + 3);
          }
        }
      } else {
        this.#style.hasEndlessComment = true;
        pos = inStr.length + 1; // its an endless comment, just bail
      }
    }
    return outStr;
  }
  /*
   * Swallow BR
   * could be in the form <br> or <br/> or <br />
   * @param {String} inStr
   * @returns {String} string with br removed
   */
  #swallowBr(inStr) {
    let outStr = "";
    let pos = 0;
    let endPos = 0;
    let len = inStr.length;
    pos = inStr.indexOf(Biography.#START_OF_BR);
    if (pos < 0) {
      outStr = inStr; // no br
    }
    while (pos < len && pos >= 0) {
      if (pos > 0) {
        outStr = outStr + inStr.substring(endPos, pos);
      }
      endPos = inStr.indexOf(Biography.#END_BRACKET, pos);
      if (endPos > 0) {
        pos = endPos + 1; // skip the /> and move starting position there
        if (pos <= len) {
          pos = inStr.indexOf(Biography.#START_OF_BR, pos); // find next comment
          if (pos < 1) {
            outStr += inStr.substring(endPos + 1);
          }
        }
      }
    }
    return outStr;
  }

  /*
   * Build an array of each line in the bio
   * lines are delimited by a newline
   * empty lines or those with only whitespace are eliminated
   * @param {String} inStr bio string stripped of comments
   */
  #getLines(inStr) {
    let splitString = inStr.split("\n");
    let line = "";
    let tmpString = "";
    let len = splitString.length;
    for (let i = 0; i < len; i++) {
      line = splitString[i];
      // line is nothing but ---- ignore it by replacing with spaces then
      // trimming
      tmpString = line.replace("-", " ");
      tmpString = tmpString.trim();
      // Do NOT ingore empty lines here. Need to check sources
      // Sanity check if the line with <references /> also has text following on same line
      if (tmpString.indexOf(Biography.#REFERENCES_TAG) >= 0) {
        let endOfReferencesTag = tmpString.indexOf(Biography.#END_BRACKET);
        if (endOfReferencesTag + 1 < tmpString.length) {
          // Oopsie. Add a line for references and another for the line
          // and report a style issue?
          let anotherLine = tmpString.substring(0, endOfReferencesTag + 1);
          this.#bioLines.push(anotherLine);
          line = tmpString.substring(endOfReferencesTag + 2);
          if (!line.length === 0) {
            this.#bioLines.push(tmpString);
          }
        } else {
          this.#bioLines.push(tmpString);
        }
      } else {
        this.#bioLines.push(line);
      }
    }
    return;
  }

  /*
   * Process heading line to find Biography, Sources, Acknowledgements
   * set index to each section
   * Methods are used to find sections so that rules can specify
   * alternate languages
   * @param {String} inStr starting with ==
   * @param {Number} currentIndex into master list of strings
   * @param {String} mixedCaseLine input line in mixed case
   */
  #evaluateHeadingLine(inStr, currentIndex, mixedCaseLine) {
    let headingText = "";
    let mixedHeadingText = "";
    let headingStartPos = 0;
    let headingLevel = 0;
    /*
     * the bioLineString should start with the larger of the start of the line
     * after the biography heading or 0
     * it should end with the smallest of the length of the bio string or
     * the first heading found after the biography heading
     */
    let len = inStr.length;
    while (headingStartPos < len && headingLevel < 4) {
      if (inStr.charAt(headingStartPos) === "=") {
        headingStartPos++;
        headingLevel++; // number of =
      } else {
        // lose any leading ' for bold or italics
        let i = headingLevel;
        while (i < len && inStr.charAt(i) === "'") {
          i++;
        }
        headingStartPos = len + 1; // break out of loop

        // then lose anything after the next =
        headingText = inStr.substring(i).trim();
        mixedHeadingText = mixedCaseLine.substring(i).trim();
        let j = headingText.indexOf("=");
        if (j < 0) {
          j = headingText.length;
        }
        headingText = headingText.substring(0, j).trim();
        mixedHeadingText = mixedHeadingText.substring(0, j).trim();
      }
    }
    let headingContent = {  // content of a heading line
        headingLevel: -1,
        headingText: "",
    };
    headingContent.headingLevel = headingLevel;
    headingContent.headingText = mixedHeadingText;
    this.#headings.push(headingContent);       // save for reporting

    // Save index for this heading
    if (this.#isBiographyHeading(headingText)) {
      if (this.#biographyIndex < 0) {
        this.#biographyIndex = currentIndex;
      } else {
        if (this.#researchNotesIndex > 0) {
          this.#researchNotesEndIndex = currentIndex - 1;
        }
      }
    } else {
      if (this.#sourceRules.isResearchNotesHeading(headingText)) {
        this.#researchNotesIndex = currentIndex;
      } else {
        if (this.#isSourcesHeading(headingText)) {
          if (headingLevel > 2) {
            this.#style.sourcesHeadingHasExtraEqual = true;
          }
          if (this.#sourcesIndex < 0) {
            this.#sourcesIndex = currentIndex;
            if (this.#researchNotesIndex > 0) {
              this.#researchNotesEndIndex = currentIndex - 1;
            }
            if (this.#acknowledgementsIndex > 0) {
              this.#acknowledgementsEndIndex = currentIndex - 1;
            }
          }
        } else {
          if (this.#sourceRules.isAckHeading(headingText)) {
            if (headingLevel > 2) {
              this.#style.acknowledgementsHeadingHasExtraEqual = true;
            }
            if (this.#sourcesIndex < 0) {
              this.#style.bioHasAcknowledgementsBeforeSources = true;
            }
            this.#acknowledgementsIndex = currentIndex;
            if (this.#researchNotesIndex > 0 && this.#researchNotesEndIndex < 0) {
              this.#researchNotesEndIndex = currentIndex - 1;
            }
          } else {
            if (headingLevel === 2) {
              this.#wrongLevelHeadings.push(headingContent.headingText);       // save for reporting
            }
          } // endif Acknowledgements
        } // endif Sources
      } // endif Research Notes
    } // endif Biography
    return;
  }

  /*
   * Get string from bio to be searched for any inline <ref
   * the bioLineString should start with the beginning of the biography
   * or the line after the Biography heading whichever is last
   * it should end with the smallest of the length of the bio string or
   * the first heading found after the biography heading
   */
  #getBioLineString() {
    let bioLinesString = "";
    let startIndex = 0;
    // Jump to the start of == Biography
    if (this.#biographyIndex > 0) {
      startIndex = this.#biographyIndex;
    }
    // assume it ends at end of bio then pick smallest
    // of Research Notes, Sources, references, acknowledgements
    // which is also after the start of the biography
    let endIndex = this.#bioLines.length;
    if (this.#researchNotesIndex > 0 && this.#researchNotesIndex > startIndex) {
      endIndex = this.#researchNotesIndex;
    }
    if (this.#sourcesIndex > 0 && this.#sourcesIndex < endIndex) {
      endIndex = this.#sourcesIndex;
    }
    if (this.#referencesIndex > 0 && this.#referencesIndex < endIndex) {
      endIndex = this.#referencesIndex;
    }
    if (this.#acknowledgementsIndex > 0 && this.#acknowledgementsIndex < endIndex) {
      endIndex = this.#acknowledgementsIndex;
    }

    if (this.#biographyIndex === endIndex) {
      this.#style.bioHeadingWithNoLinesFollowing = true;
    } else {
      if (endIndex >= 0) {
        while (startIndex < endIndex) {
          bioLinesString += this.#bioLines[startIndex];
          startIndex++;
        }
      }
    }
    return bioLinesString;
  }

  /*
   * Find <ref> </ref> pairs that don't have a name
   * adds contents of ref to refStringList
   * @param {String} bioLineString string to look in for pairs
   */
  #findRef(bioLineString) {
    let startOfRef = bioLineString.indexOf(Biography.#REF_START);
    let endOfRef = bioLineString.indexOf(Biography.#REF_END, startOfRef);
    while (startOfRef >= 0 && !this.#style.bioHasRefWithoutEnd) {
      if (endOfRef < 0) {
        // Oopsie, starting <ref> without an ending >
        this.#style.bioHasRefWithoutEnd = true;
      } else {
        // Now we should have the whole ref lose the <ref> and move past it
        if (startOfRef + 5 < endOfRef) {
          startOfRef = startOfRef + 5;
        }
        let line = bioLineString.substring(startOfRef, endOfRef);
        this.#refStringList.push(line);
        endOfRef++;
        if (endOfRef < bioLineString.length) {
          startOfRef = bioLineString.indexOf(Biography.#REF_START, endOfRef);
          if (startOfRef > 0) {
            endOfRef = bioLineString.indexOf(Biography.#REF_END, startOfRef);
          }
        }
      }
    }
    return;
  }

  /*
   * Find named ref
   * which are pairs in the form <ref name= ></ref>
   * or in the form <ref name=xxxx />
   * adds contents of ref to namedRefStringList
   * @param {String} bioLineString string to look in for pairs
   */
  #findNamedRef(bioLineString) {
    let endOfRefNamed = -1;
    let endOfRef = -1;
    let end = -1;
    let bioLength = bioLineString.length;
    let startOfRef = bioLineString.indexOf(Biography.#REF_START_NAMED);
    while (startOfRef >= 0) {
      endOfRef = bioLineString.indexOf(Biography.#REF_END, startOfRef);
      endOfRefNamed = bioLineString.indexOf(Biography.#REF_END_NAMED, startOfRef);
      if (endOfRef < 0) {
        endOfRef = bioLength;
      }
      if (endOfRefNamed < 0) {
        endOfRefNamed = bioLength;
      }
      // lose the <ref> portion and use first ending found
      if (startOfRef + 5 < endOfRef) {
        startOfRef = startOfRef + 5;
      }
      end = endOfRef;
      if (endOfRef > endOfRefNamed) {
        end = endOfRefNamed;
      }
      // save just the part of the line after the name
      let line = bioLineString.substring(startOfRef, end);
      let refStart = line.indexOf(Biography.#END_BRACKET);
      if (refStart > 0) {
        refStart++;
        this.#namedRefStringList.push(line.substring(refStart));
      }

      // move past the ref
      end++;
      endOfRef++;
      if (end <= bioLength) {
        startOfRef = bioLineString.indexOf(Biography.#REF_START_NAMED, end);
      } else {
        if (end > bioLength) {
          startOfRef = -1; // we are done
        }
      }
    }
  }

  /*
   * Gather bio statistics and style issues
   * only examines items not considered in the parsing
   * Basic checks for the headings and content expected in the biography
   * Update results style
   * Build the report content
   */
  #setBioStatisticsAndStyle() {

    this.#stats.totalBioLines = this.#bioLines.length;

    if (this.#stats.bioIsMarkedUnsourced) {
      this.#messages.sectionMessages.push('Profile is marked unsourced');
    }
    if (this.#stats.bioIsUndated) {
      this.#messages.sectionMessages.push('Profile has no dates');
      this.#style.bioHasStyleIssues = true;
    }
    if (this.#style.bioCategoryNotAtStart) {
      this.#messages.styleMessages.push('Category not at start of biography');
      this.#style.bioHasStyleIssues = true;
    }
    if (this.#biographyIndex < 0) {
      this.#style.bioHasStyleIssues = true;
      this.#style.bioIsMissingBiographyHeading = true;
      this.#messages.sectionMessages.push('Missing Biography heading');
    } else {
      if (this.#unexpectedLines.length > 0) {
        this.#style.bioHasStyleIssues = true;
        this.#style.bioHasNonCategoryTextBeforeBiographyHeading = true; 
        let i = 0;
        while (i < this.#unexpectedLines.length) {
          this.#messages.styleMessages.push('Unexpected line before Biography ' + this.#unexpectedLines[i]);
          i++
          if (i > 5) {
            i = this.#unexpectedLines.length + 1;
            this.#messages.styleMessages.push('Unexpected line ... more lines follow ...');
          }
        }
      }
    }
    if (this.#sourcesIndex < 0) {
      this.#style.bioHasStyleIssues = true;
      this.#style.bioIsMissingSourcesHeading = true;
      this.#messages.sectionMessages.push('Missing Sources heading');
    }
    if (this.#referencesIndex < 0) {
      this.#style.bioHasStyleIssues = true;
      this.#style.bioIsMissingReferencesTag = true;
      this.#messages.sectionMessages.push('Missing <references /> tag');
    }
    if (this.#style.bioHasMultipleReferencesTags) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Multiple <references /> tag');
    }
    if (this.#style.misplacedLineCount < 0) {
      this.#style.misplacedLineCount = 0;
    }
    if (this.#style.misplacedLineCount > 0) {
      this.#style.bioHasStyleIssues = true;
      let msg = this.#style.misplacedLineCount + ' line';
      if (this.#style.misplacedLineCount > 1) {
        msg += 's';
      }
      msg += ' between Sources and <references />';
      this.#messages.sectionMessages.push(msg);
    }
    this.#stats.inlineReferencesCount = this.#refStringList.length + this.#namedRefStringList.length;

    this.#stats.possibleSourcesLineCount = this.#acknowledgementsIndex - 1;
    if (this.#stats.possibleSourcesLineCount < 0) {
      this.#stats.possibleSourcesLineCount = this.#bioLines.length;
    }
    this.#stats.possibleSourcesLineCount =
      this.#stats.possibleSourcesLineCount - this.#referencesIndex + 1 +
      this.#style.misplacedLineCount;

    if (this.#style.hasRefWithoutEnd) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessgages.push('Inline <ref> tag with no ending </ref> tag');
    }
    if (this.#style.bioHasRefAfterReferences) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Inline <ref> tag after <references >');
    }
    if (this.#style.bioHasSpanWithoutEndingSpan) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Span with no ending span');
    }
    if (this.#style.bioHasMultipleBioHeadings) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Multiple Biography headings');
    }
    if (this.#style.bioHeadingWithNoLinesFollowing) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Empty Biography section');
    }
    if (this.#style.bioHasMultipleSourceHeadings) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Multiple Sources headings');
    }
    if (this.#style.sourcesHeadingHasExtraEqual) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Sources subsection instead of section');
    }
    if (this.#style.bioHasUnknownSectionHeadings) {
      this.#style.bioHasStyleIssues = true;
      for (let i=0; i < this.#wrongLevelHeadings.length; i++) {
        this.#messages.styleMessages.push('Wrong level heading == ' + this.#wrongLevelHeadings[i] + ' ==');
      }
    }
    if (this.#style.acknowledgementsHeadingHasExtraEqual) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Acknowledgements subsection instead of section');
    }
    if (this.#style.bioHasAcknowledgementsBeforeSources) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Acknowledgements before Sources');
    }
    if (this.#style.bioMissingResearchNotesBox) {
      this.#style.bioHasStyleIssues = true;
      for (let i=0; i < this.#missingRnb.length; i++) {
        this.#messages.styleMessages.push('Missing Research Note box for: ' + this.#missingRnb[i]);
      }
    }
    if (this.#style.bioMightHaveEmail) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push('Biography may contain email address');
    }
  }

  /*
   * Determine if Biography heading
   * Uses rules to check for multiple languages
   * Adds bio headings to array of bio headings found
   * @param {String} line to test
   * @returns {Boolean} true if biography heading else false
   */
  #isBiographyHeading(line) {
    let isBioHeading = this.#sourceRules.isBiographyHeading(line);
    if (isBioHeading) {
      if (this.#bioHeadingsFound.includes(line)) {
        this.#style.bioHasMultipleBioHeadings = true;
      } else {
        this.#bioHeadingsFound.push(line);
      }
    }
    return isBioHeading;
  }

  /*
   * Determine if Sources heading
   * Uses rules to check for multiple languages
   * Adds sources headings to array of sources headings found
   * @param {String} line to test
   * @returns {Boolean} true if sources heading else false
   */
  #isSourcesHeading(line) {
    let isSourcesHeading = this.#sourceRules.isSourcesHeading(line);
    if (isSourcesHeading) {
      if (this.#sourcesHeadingsFound.includes(line)) {
        this.#style.bioHasMultipleSourceHeadings = true;
      } else {
        this.#sourcesHeadingsFound.push(line);
      }
    }
    return isSourcesHeading;
  }

  /*
   * Remove Research Notes from bio lines
   * Remove lines between start of Research Notes
   * and end of Research Notes
   * Any content of Research Notes is not considered
   * as a source
   * Research Notes end when a Biography heading is found
   * or at the first Sources or Acknowledgements heading
   */
  #removeResearchNotes() {
    let i = this.#researchNotesIndex;
    let endIndex = this.#researchNotesEndIndex;
    if (endIndex < 0) {
      endIndex = this.#bioLines.length;
    }
    if (i > 0) {
      while (i <= endIndex) {
        this.#bioLines[i] = "";
        i++;
      }
    }
  }

  /*
   * Remove acknowledgements from bio lines
   * Remove lines between start of Acknowledgements
   * and end of Acknowledgements
   * Any content of Acknowledgements is not considered
   * as a source
   * Acknowledgements end when a heading is found
   * or at the end of the biography
   */
  #removeAcknowledgements() {
    let i = this.#acknowledgementsIndex;
    let endIndex = this.#acknowledgementsEndIndex;
    if (endIndex < 0) {
      endIndex = this.#bioLines.length;
    }
    if (i > 0) {
      while (i <= endIndex) {
        this.#bioLines[i] = "";
        i++;
      }
    }
  }

  /*
   * Find headings that are the name of a research notes box
   * where there is no research notes box with that name
   */
  #findMissingRnb() {
    for (let i=0; i<this.#headings.length; i++) {
      let str = this.#headings[i].headingText.toLowerCase().trim();
      if (this.#sourceRules.isResearchNotesBox(str)) {
        //if (!this.#sourceRules.lineStartsWithListEntry(str, this.#researchNotesBoxes)) {
        if (!this.#researchNotesBoxes.includes(str)) {
           this.#missingRnb.push(this.#headings[i].headingText);
           this.#style.bioMissingResearchNotesBox = true;;
        }
      }
    }
  }

  /*
   * Check a line to see if it might include an email addr
   */
  #checkForEmail(line) {

    // the line must contain the @ symbol
    // then any of the parts of the line split on a space could be email
    // then if the part matches the normal email regular expression
    // WITH the addition of spaces that people might put in to avoid email checking

    let looksLikeEmail = false;
    let regex = /^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/;
    let sep = line.indexOf('@');
    if (sep >= 0) {
      if (line.match(regex)) {
        looksLikeEmail = true;
      } else {
        let lineParts = line.split(' ');
        for (let i=0; i < lineParts.length; i++) {
          if (lineParts[i].match(regex)) {
            looksLikeEmail = true;
          }
        }
      }
      if (!looksLikeEmail) {
        // have they put in spaces to avoid the checks?
        // build a new string to check
        // start from the last space before the @
        // then remove all spaces
        let firstPart = line.substring(0, sep).trim();
        let newString = firstPart;
        let i = firstPart.lastIndexOf(' ');
        if (i > 0) {
          newString = firstPart.substring(i);
        }
        newString += line.substring(sep);
        let testString = newString.replace(/ /g, "")
        if (testString.match(regex)) {
          looksLikeEmail = true;
        }
      }
    }
    return looksLikeEmail;
  }

  /* *********************************************************************
   * ******************* PRIVATE METHODS *********************************
   * ******************* used by Validator *******************************
   * *********************************************************************
   */

  /*
   * Examine a single line to see if it is a valid source
   * Adds line to array of valid or invalid sources
   * @param {String} mixedCaseLine line to test (and report)
   * @returns {Boolean} true if valid else false
   */
  #isValidSource(mixedCaseLine) {
    let isValid = false; // assume guilty

    // just ignore starting *
    if (mixedCaseLine.startsWith("*")) {
      mixedCaseLine = mixedCaseLine.substring(1);
    }
    mixedCaseLine = mixedCaseLine.trim();

    // perform tests on lower case line
    let line = mixedCaseLine.toLowerCase().trim();

    // ignore starting source:
    if (line.length > 0 && line.startsWith(Biography.#SOURCE_START)) {
      line = line.substring(7);
      line = line.trim();
    }
    // ignore trailing .
    if (line.endsWith(".")) {
      line = line.slice(0, -1);
      line = line.trim();
    }
    // It takes a minimum number of characters to be valid
    if (line.length >= Biography.#MIN_SOURCE_LEN) {
      if (!this.#isInvalidStandAloneSource(line)) {
        line = line.trim();
        // FindAGrave citations may have partial strings that
        // would otherwise show up as invalid
        if (this.#isFindAGraveCitation(line)) {
          isValid = true;
        } else {
          // Does line contain a phrase on the invalid partial source list?
          if (this.#onAnyPartialSourceList(line)) {
            isValid = false;
          } else {
            // Check for line that starts with something on the invalid start partial list
            if (this.#sourceRules.isInvalidStartPartialSource(line)) {
              isValid = false;
            } else {
              // TODO can you refactor so this uses a plugin architecture?

              // Some other things to check
              if (!this.#isJustCensus(line)) {
                if (!this.#invalidFamilyTree(line)) {
                  if (!this.#isJustRepository(line)) {
                    if (!this.#isJustGedcomCrud(line)) {
                      // TODO add more logic to eliminate sources as valid
                      // TODO is the manager's name a valid source (this is hard)
                      // TODO add logic to check for just the name followed by grave
                      isValid = true;
                    }
                  }
                }
              }
            } // endif starts with invalid phrase
          } // endif contains a phrase on invalid partial source list
        } // endif a findagrave citation
      } // endif on the list of invalid sources
    } // endif too short when stripped of whitespace

    // Save line for reporting
    if (isValid) {
      this.#sources.validSource.push(mixedCaseLine);
    } else {
      this.#sources.invalidSource.push(mixedCaseLine);
    }
    return isValid;
  }

  /*
   * Determine if valid standalone source
   * @param {String} line input source string
   * @returns {Boolean} true if on the standalone list of invalid sources
   */
  #isInvalidStandAloneSource(line) {
    let isInvalidStandAlone = this.#sourceRules.isInvalidSource(line);
    if (!isInvalidStandAlone && this.#tooOldToRemember) {
      isInvalidStandAlone = this.#sourceRules.isInvalidSourceTooOld(line);

      if ((this.#isPre1700 || this.#treatAsPre1700) && !isInvalidStandAlone) {
        isInvalidStandAlone = this.#sourceRules.isInvalidSourcePre1700(line);
      }
      if (this.#isPre1500 && !isInvalidStandAlone) {
        // TODO add more pre1500 validation
      }
    }
    return isInvalidStandAlone;
  }

  /*
   * Determine if found on partial source list
   * @param {String} line input source string
   * @returns {Boolean} true if on a list of invalid partial sources else false
   */
  #onAnyPartialSourceList(line) {
    let foundInvalidPartialSource = this.#sourceRules.isInvalidPartialSource(line);
    if (this.#tooOldToRemember && !foundInvalidPartialSource) {
      foundInvalidPartialSource = this.#sourceRules.isInvalidPartialSourceTooOld(line);
      if ((this.#isPre1700 || this.#treatAsPre1700) && !foundInvalidPartialSource) {
        foundInvalidPartialSource = this.#sourceRules.isInvalidPartialSourcePre1700(line);
      }
    }
    return foundInvalidPartialSource;
  }

  /*
   * Validate content in <ref> tags
   * invalidSpanTargetList is used if line contains a span reference
   * @param {Array} refStrings array of string found within ref tag
   * @returns {Boolean} true if at least one is valid else false
   */
  #validateRefStrings(refStrings) {
    let isValid = false; // guilty until proven innnocent
    let line = "";
    let i = 0;
    while (i < refStrings.length) {
      line = refStrings[i];
      if (line.length > 0) {
        // Check span target if ref contains a span reference
        let startPos = line.indexOf(Biography.#SPAN_REFERENCE_START);
        if (startPos >= 0) {
          startPos = startPos + 3;
          let endPos = line.indexOf("|");
          if (endPos < 0) {
            endPos = line.indexOf(Biography.#SPAN_REFERENCE_END);
          }
          if (endPos > 0 && startPos < endPos) {
            let spanId = line.substring(startPos, endPos);
            if (!this.#invalidSpanTargetList.includes(spanId)) {
              isValid = true;
            }
          }
        } else {
          if (this.#isValidSource(line)) {
            if (!isValid) {
              // first one found?
              isValid = true;
            }
          }
        }
      }
      i++;
    }
    return isValid;
  }

  /*
   * Validate all the strings after the == Sources heading
   * but before Acknowledgements or the end of the biography
   * @param {Boolean} isFullBio true if checking full bio else just a
   * string of sources
   * @returns {Boolean} true if at lease one valid else false
   */
  #validateReferenceStrings(isFullBio) {
    let isValid = false;
    let index = 0;
    if (isFullBio) {
      // start at the first of Sources or <references /> if neither, nothing to do
      // assume it is so messed up nothing to process
      index = this.#sourcesIndex + 1;
      if (index <= 0) {
        index = this.#referencesIndex + 1;
      }
      if (index <= 0) {
        index = this.#bioLines.length;
      }
    }
    let lastIndex = this.#bioLines.length;
    let line = "";
    let nextIndex = index + 1;
    while (index < lastIndex) {
      let mixedCaseLine = this.#bioLines[index];
      line = mixedCaseLine.toLowerCase();
      // if line nothing but --- ignore it
      let tmpString = line.replaceAll("-", " ");
      tmpString = tmpString.trim();
      if (tmpString.length <= 0) {
        line = tmpString;
      }
      nextIndex = index + 1;
      // Skip the <references line and any heading line or empty line
      // or the See Also line
      if (
        !line.startsWith(Biography.#REFERENCES_TAG) &&
        !line.startsWith(Biography.#HEADING_START) &&
        !line.includes(Biography.#SEE_ALSO) &&
        line.length > 0
      ) {
        // Now gather all lines from this line until an empty line
        // or a line that starts with * to test as the source
        let combinedLine = mixedCaseLine;
        let foundEndOfSource = false;
        while (!foundEndOfSource && nextIndex < lastIndex) {
          if (nextIndex < lastIndex) {
            // check next line
            let nextLine = this.#bioLines[nextIndex];
            if (nextLine.length === 0) {
              foundEndOfSource = true;
            } else {
              if (
                nextLine.startsWith("*") ||
                nextLine.startsWith("--") ||
                nextLine.startsWith("#") ||
                nextLine.startsWith(Biography.#REFERENCES_TAG) ||
                nextLine.startsWith(Biography.#HEADING_START)
              ) {
                foundEndOfSource = true;
              } else {
                combinedLine = combinedLine + " " + nextLine;
                nextIndex++;
              }
            }
          }
        }
        mixedCaseLine = combinedLine;
        // At this point, the line should not contain an inline <ref
        // Unless all the ref are between Sources and references
        if (line.indexOf("<ref") >= 0 && index > this.#referencesIndex) {
          this.#style.bioHasRefAfterReferences = true;
        }
        // Only count misplaced line if there is a references tag
        if (index < this.#referencesIndex && this.#referencesIndex > 0) {
          this.#style.misplacedLineCount++;
        }
        let spanTargetStartPos = mixedCaseLine.indexOf(Biography.#SPAN_TARGET_START);
        if (spanTargetStartPos < 0) {
          if (this.#isValidSource(mixedCaseLine)) {
            if (!isValid) {
              isValid = true; // first one found
            }
          }
        } else {
          if (this.#isValidSpanTarget(mixedCaseLine)) {
            if (!isValid) {
              isValid = true; // first one found
            }
          }
        }
      }
      index = nextIndex;
    }
    return isValid;
  }

  /*
   * Validate string that is a span target
   * Side effect: add to invalidSpanTargetList for invalid target
   * @param {String} line line to be evaluated
   * @param {Number} startPos starting position in line
   * @returns {Boolean} true if valid else false
   */
  #isValidSpanTarget(mixedCaseLine) {
    let isValid = false;
    let spanTargetStartPos = mixedCaseLine.indexOf(Biography.#SPAN_TARGET_START);
    let beforeSpan = mixedCaseLine.substring(0, spanTargetStartPos - 1);

    // extract target id found here <span id='ID'>
    let pos = mixedCaseLine.indexOf("=");
    pos++; // skip the =
    pos++; // skip the '
    let endPos = mixedCaseLine.indexOf("'", pos);
    let spanId = mixedCaseLine.substring(pos, endPos);

    // Process the line starting after the end of the span target
    // but it might have source or repository before the <span>
    pos = mixedCaseLine.indexOf(Biography.#SPAN_TARGET_END);
    if (pos > 0) {
      pos = pos + Biography.#SPAN_TARGET_END.length;
    } else {
      this.#style.bioHasSpanWithoutEndingSpan = true;
      pos = mixedCaseLine.length;
    }
    if (pos < mixedCaseLine.length) {
      // something after ending span
      mixedCaseLine = beforeSpan + " " + mixedCaseLine.substring(pos).trim();
      isValid = this.#isValidSource(mixedCaseLine);
    }
    if (!isValid) {
      this.#invalidSpanTargetList.push(spanId);
    }
    return isValid;
  }

  /*
   * Check for a line that is just
   * some collection of numbers and digits then census
   * @param {String} line to check
   * @returns {Boolean} true if just a census line else false
   */
  #isJustCensus(line) {
    let isCensus = false;
    line = line.replace(/[^a-z ]/g, "");
    line = line.trim();
    if (this.#sourceRules.isCensus(line)) {
      isCensus = true;
    } else {
      // get the census string portion of the line
      let theStr = this.#sourceRules.hasCensusString(line);
      if (theStr.length > 0) {
        // lose census, at, on and everything not an alpha char
        line = line.replace(theStr, "");
        line = line.replace(/at/g, "");
        line = line.replace(/on/g, "");
        line = line.replace(/[^a-z]/g, "");
        line = line.trim();
        if (line.length === 0) {
          isCensus = true;
        } else {
          // lose things like ancestry, familysearch by themselves
          if (this.#sourceRules.isInvalidSource(line)) {
            isCensus = true;
          }
        }
      }
    }
    if (isCensus) {
      return true;
    } else {
      return false;
    }
  }
  /*
   * Check for a line that contains both findagrave and created by
   * created by is an invalid partial source string UNLESS part of a findagrave
   * citation
   * @param {String} line to test
   * @returns {Boolean} true if line contains both findagrave and created by
   */
  #isFindAGraveCitation(line) {
    if (line.indexOf("findagrave") >= 0 && line.indexOf("created by") >= 0) {
      return true;
    } else {
      return false;
    }
  }

  /*
   * Check for Ancestry Family Trees without a tree id
   * or a tree id less than 4 characters, such as 0
   * @param {String} line to test
   * @returns {Boolean} true if Ancestry tree seems to have an id
   */
  #invalidFamilyTree(line) {
    let isInvalidFamilyTree = false;
    let startPos = line.indexOf("ancestry family tree");
    if (startPos < 0) {
      startPos = line.indexOf("public member tree");
      if (startPos < 0) {
        startPos = line.indexOf("ancestry member family tree");
      }
      if (startPos < 0) {
        startPos = line.indexOf("{{ancestry tree");
      }
    }
    if (startPos >= 0) {
      line = line.substring(startPos);
      let hasId = false;
      let matches = line.match(/(\d+)/g);
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          if (matches[i].length > 4) {
            hasId = true;
          }
        }
      }
      if (!hasId) {
        isInvalidFamilyTree = true;
      }
    }
    return isInvalidFamilyTree;
  }

  /*
   * Check for just a repository
   * @param {String} line to test
   * @returns {Boolean} true if this is just a repository line
   */
  #isJustRepository(line) {
    let isRepository = false;
    if (line.includes("repository")) {
      let repositoryStrings = [
        "ancestry",
        "com",
        "name",
        "address",
        "http",
        "www",
        "the church of jesus christ of latter-day saints",
        "note",
        "family history library",
        "n west temple street",
        "salt lake city",
        "utah",
        "usa",
        "360 west 4800 north",
        "provo",
        "ut",
        "city",
        "country",
        "not given",
        "e-mail",
        "phone number",
        "internet",
        "cont",
        "unknown",
      ];
      for (let i = 0; i < repositoryStrings.length; i++) {
        let str = repositoryStrings[i];
        line = line.replaceAll(str, "");
      }
      line = line.replace(/r-/g, "");
      line = line.replace(/#r/g, "");
      line = line.replace(/[^a-z]/g, "");
      line = line.trim();
      if (line.length > 0) {
        if (line === "repository") {
          isRepository = true;
        }
      }
    }
    return isRepository;
  }

  /*
   * check for GEDCOM crud see Suggestion 853
   * in most cases this is in the Bio not sources,
   * so you don't see it
   * @param {String} line line to test
   * @returns {Boolean} true if line contains GEDCOM crud and nothing else
   */
  #isJustGedcomCrud(line) {
    let isGedcomCrud = false;
    let crudStrings = [
      "user id",
      "data changed",
      "lds endowment",
      "lds baptism",
      "record file number",
      "submitter",
      "object",
      "color",
      "upd",
      "ppexclude",
    ];
    if (line.startsWith(":")) {
      line = line.substring(1);
    }
    line = line.trim();
    let i = 0;
    while (i < crudStrings.length && !isGedcomCrud) {
      if (line.startsWith(crudStrings[i])) {
        isGedcomCrud = true;
      }
      i++;
    }
    return isGedcomCrud;
  }
}
