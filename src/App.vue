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
/*
 * App.vue
*/
<template>
  <div id="app">
    <div id="HEADER" class ="SMALL">
        <a href="https://www.wikitree.com/">
        <img class="MIDDLE" src="https://www.wikitree.com/images/Wiki-family-tree.png" alt="WikiTree" title="WikiTree" width="360" height="32" border="0">
        </a>
    </div>
    <div class="flex-center">
      <h4>Bio Check Version 1.4.2</h4>
    </div>

    <div class="flex-grid">
      <div class="col">
        <div class="user-input">
          <div class="col">
            <span v-bind:title="promptMessage" >
                  How to find profiles:
            </span>
          </div>
          <div class="col">
            <select v-model="userArgs.selectedCheckType">
              <option value="checkByProfile" >Check profile</option>
              <option value="checkByQuery" >WikiTree+ search results</option>
              <option value="checkWatchlist" :disabled="isWatchlistDisabled">Check watchlist</option>
              <option value="checkRandom" >Check random profiles</option>
            </select>
          </div>
        </div>
        <template v-if="isCheckByProfile">
          <div class="user-input">
            <div class="col">
              <span v-bind:title="inputWikiTreeIdTip">
                <label for="userArgs.inputWikiTreeId" >Profile</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.trim="userArgs.inputWikiTreeId" 
               id="userArgs.inputWikiTreeId" :disabled="!isCheckByProfile"
               placeholder="Enter Profile Id to check">
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="numAncestorGenTip">
                <label for="userArgs.numAncestorGen">Ancestor generations </label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.numAncestorGen" 
                type="number" id="userArgs.numAncestorGen"
                :disabled="!isCheckByProfile"
                name="userArgs.numAncestorGen" min="0" max="20" value="5">
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="numDescendantGenTip">
                <label for="userArgs.numDescendantGen">Descendant generations </label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.numDescendantGen" 
                type="number" id="userArgs.numDescendantGen"
                :disabled="!isCheckByProfile"
                name="userArgs.numDescendantGen" min="0" max="5" value="2">
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="numRelativesTip">
                <label for="userArgs.numRelatives" >Number of degrees of connection to check</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.numRelatives" type="number"
                 id="userArgs.numRelatives" name="userArgs.numRelatives"
                 min="0" max="25" value="0">
            </div>
          </div>

          <div class="user-input">
            <div class="col">
              <span v-bind:title="connectionsTip">
                <label for="userArgs.checkAllConnections" >Check connections for all profiles</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model="userArgs.checkAllConnections" type="checkbox"
                     id="userArgs.checkAllConnections"
                     name="userArgs.checkAllConnections" >
            </div>
          </div>

        </template>
        <template v-if="isCheckByQuery">
          <div class="user-input">
            <div class="col">
              <span v-bind:title="queryArgTip">
                <label for="userArgs.queryArg" >Search text on WikiTree+</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.trim="userArgs.queryArg" id="userArgs.queryArg"
                   :disabled="disableQueryArg"
                   placeholder="Enter WikiTree+ Search/Text (same as you would enter for WikiTree+)">
            </div>
          </div>
        </template>
        <template v-if="isCheckByQuery">
          <div class="user-input">
            <div class="col">
              <span v-bind:title="maxQueryTip">
                <label for="userArgs.maxQuery" >Max search profiles</label> 
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.maxQuery" type="number"
               :disabled="isCheckByProfile"
               id="userArgs.maxQuery" name="userArgs.maxQuery" 
               min="0" value="5000" > 
             </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="searchStartTip">
                <label for="userArgs.searchStart" >Check starting at</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.searchStart" type="number"
               :disabled="isCheckByProfile"
               id="userArgs.searchStart" name="userArgs.searchStart" 
               min="0" value="0" >
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="searchMaxTip">
                <label for="userArgs.searchMax" >Max to check</label> 
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.searchMax" type="number" id="userArgs.searchMax" name="searchMax" 
               min="0" max="5000" value="5000" >
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="numRelativesTip">
                <label for="userArgs.numRelatives" >Number of degrees of connection to check</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.numRelatives" type="number"
               id="userArgs.numRelatives" name="userArgs.numRelatives" min="0"
               max="25" value="0">
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="connectionsTip">
                <label for="userArgs.checkAllConnections" >Check connections for all profiles</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model="userArgs.checkAllConnections" type="checkbox"
                     id="userArgs.checkAllConnections"
                     name="userArgs.checkAllConnections" >
            </div>
          </div>
          
        </template>
        <template v-if="isCheckWatchlist">
          <div class="user-input">
            <div class="col">
              <span v-bind:title="maxQueryTip">
                <label for="userArgs.maxQuery" >Max search profiles</label> 
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.maxQuery" type="number"
               :disabled="isCheckByProfile"
               id="userArgs.maxQuery" name="userArgs.maxQuery" 
               min="0" value="5000" > 
             </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="searchStartTip">
                <label for="userArgs.searchStart" >Check starting at</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.searchStart" type="number"
               :disabled="isCheckByProfile"
               id="userArgs.searchStart" name="userArgs.searchStart" 
               min="0" value="0" >
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="searchMaxTip">
                <label for="userArgs.searchMax" >Max to check</label> 
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.searchMax" type="number" id="userArgs.searchMax" name="searchMax" 
               min="0" max="5000" value="5000" >
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="numRelativesTip">
                <label for="userArgs.numRelatives" >Number of degrees of connection to check</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.numRelatives" type="number"
               id="userArgs.numRelatives" name="userArgs.numRelatives" min="0"
               max="25" value="0">
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="connectionsTip">
                <label for="userArgs.checkAllConnections" >Check connections for all profiles</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model="userArgs.checkAllConnections" type="checkbox"
                     id="userArgs.checkAllConnections"
                     name="userArgs.checkAllConnections" >
            </div>
          </div>
        </template>
        <template v-if="isCheckRandom">
          <div class="user-input">
            <div class="col">
              <span v-bind:title="searchStartTip">
                <label for="userArgs.searchStart" >Min random number</label>
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.searchStart" type="number"
               :disabled="isCheckByProfile"
               id="userArgs.searchStart" name="userArgs.searchStart" 
               min="0" value="0" >
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="maxQueryTip">
                <label for="userArgs.maxQuery" >Max random number</label> 
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.maxQuery" type="number"
               :disabled="isCheckByProfile"
               id="userArgs.maxQuery" name="userArgs.maxQuery" 
               min="0" value="5000" > 
            </div>
          </div>
          <div class="user-input">
            <div class="col">
              <span v-bind:title="searchMaxTip">
                <label for="userArgs.searchMax" >Max to check</label> 
              </span>
            </div>
            <div class="col">
              <input class="vmodel-input" v-model.number="userArgs.searchMax" type="number" id="userArgs.searchMax" name="searchMax" 
               min="0" max="5000" value="5000" >
            </div>
          </div>
        </template>
      </div>

      <div class="col">
        <div class="user-input">
          <label>
            {{loginMessage}}
          </label>
        </div>
        <div class="user-input">
          <div class="col">
            <span v-bind:title="reportStyleTip" >
              Profiles to report:
            </span>
          </div>
          <div class="col">
            <select v-model="userArgs.selectedReportType">
              <option disabled value="">Select profiles to report</option>
              <option value="reportSourcesStyle" >Unsourced and Style Issues</option>
              <option value="reportAll" >All profiles</option>
              <option value="reportNonManaged" :disabled="!watchlistSelected">Watchlist profiles not managed by you</option>
              <option value="sourcesReportStyle">Sources for Unsourced Profiles</option>
              <option value="sourcesReportAll">Sources for All Profiles</option>
              <option value="reportReviewProfiles">Profiles for Review</option>
              <option value="reportReviewProfilesAll">All Profiles for Review</option>
              <option value="reportStatsOnly">None (Statistics Only)</option>
            </select>
          </div>
        </div>
        <div class="user-input">
          <div class="col">
            <span v-bind:title="maxReportTip">
              <label for="userArgs.maxReport" >Max profiles to report</label>
            </span>
          </div>
          <div class="col">
            <input class="vmodel-input" v-model.number="userArgs.maxReport" type="number" id="userArgs.maxReport" name="maxReport" 
               min="0" max="5000" value="5000" >
          </div>
        </div>
        <div class="user-input">
          <div class="col">
            <span v-bind:title="openOnlyTip">
              <label for="userArgs.openOnly" >Check Open Profiles only</label>
            </span>
          </div>
          <div class="col">
            <input class="vmodel-input" v-model="userArgs.openOnly" type="checkbox" id="userArgs.openOnly"
               name="userArgs.openOnly" >
          </div>
        </div>
        <div class="user-input">
          <div class="col">
            <span v-bind:title="ignorePre1500Tip">
              <label for="userArgs.ignorePre1500" >Ignore Pre-1500 Profiles</label>
            </span>
          </div>
          <div class="col">
            <input class="vmodel-input" v-model="userArgs.ignorePre1500"
                 type="checkbox" id="userArgs.ignorePre1500" name="userArgs.ignorePre1500" >
          </div>
        </div>
        <div class="user-input">
          <div class="col">
            <span v-bind:title="reliableSourcesOnlyTip">
              <label for="userArgs.reliableSourcesOnly" >Reliable Sources Required</label>
            </span>
          </div>
          <div class="col">
            <input class="vmodel-input" v-model="userArgs.reliableSourcesOnly"
                 type="checkbox" id="userArgs.reliableSourcesOnly"
                 name="userArgs.reliableSourcesOnly" >
          </div>
        </div>
        <div class="user-input">
          <div class="col">
            <span v-bind:title="checkAutoGeneratedTip">
              <label for="userArgs.checkAutoGenerated" >GEDCOM generated bio</label>
            </span>
          </div>
          <div class="col">
            <input class="vmodel-input" v-model="userArgs.checkAutoGenerated"
                 type="checkbox" id="userArgs.checkAutoGenerated"
                 name="userArgs.checkAutoGenerated" >
          </div>
        </div>
      </div>
    </div>

    <div class="button-panel">
      <div class="left-button">
        <button v-on:click="checkProfiles"
              :disabled="checkStatus.checkDisabled">Check Profiles</button>
        <button v-on:click="cancelCheck" 
              :disabled="checkStatus.cancelDisabled">Cancel</button>
        <button v-on:click="exportCsv" 
              :disabled="isExportDisabled">Download CSV</button>
      </div>
      <div class="right-button">
        <button v-on:click="profileTools"
              :disabled="checkStatus.toolsDisabled">{{ toolsLabel }}</button>
        <button v-on:click="checkBioHelp">Help</button>
        <button v-on:click="wikiTreePlus">WikiTree+</button>
      </div>
    </div>

    <div class="feedback">
      <div class="feedback-state">
        {{ checkStatus.stateMessage }} 
      </div>
      <div class="feedback-progress">
        <span v-bind:title="checkStatus.progressMessageTitle">
          {{ checkStatus.progressMessage }}
        </span>
      </div>
    </div>

    <div class="tableContainer">
      <table class="resultsTable">
      <template v-if="isSourcesReport">
        <thead class="fixedHeader">
         <tr>
           <th class = "colWikiTreeId" id = "wikiTreeId" scope="col" @click="sortBy('wikiTreeId')" >Profile</th>
           <th class = "colPersonName" id = "personName" scope="col" @click="sortBy('personName')" >Name</th>
           <th class = "colSourceCount" id = "sourceCount" scope="col" @click="sortBy('sourceCount')" >Count</th>
           <th class = "colSourceLine" id = "sourceLine" scope="col" @click="sortBy('sourceLine')" >Source</th>
        </tr>
        </thead>
        <tbody class="scrollContent">
          <tr v-for="(item,index) in checkResults.sourcesRowData" :key="index">
            <td class = "colWikiTreeId">
                <a v-bind:href="item.wikiTreeLink" 
                target="_blank"> {{ item.wikiTreeId }} </a>
            </td>
            <td class = "colPersonName">{{ item.personName }} </td>
            <td class = "colSourceCount">{{ item.sourceCount }} </td>
            <td class = "colSourceLine">{{ item.sourceLine }} </td>
          </tr>
        </tbody>
      </template>
      <template v-else-if="isProfileReviewReport">
        <thead class="fixedHeader">
         <tr>
           <th class = "colWikiTreeId" id = "wikiTreeId" scope="col" @click="sortBy('wikiTreeId')" >Profile</th>
           <th class = "colPersonName" id = "personName" scope="col" @click="sortBy('personName')" >Name</th>
           <th class = "colUnsourcedStatus" id = "profileStatus" scope="col" @click="sortBy('profileStatus')" >Sourced?</th>
           <th class = "colStyleIssues" id = "hasStyleIssues" scope="col" @click="sortBy('hasStyleIssues')" >Style Issues?</th>
           <th class = "colProfilePrivacy" id = "profilePrivacy" scope="col" @click="sortBy('profilePrivacy')" >Privacy</th>
           <th class = "colOrphan" id = "profileIsOrphan" scope="col" @click="sortBy('profileIsOrphan')" >Orphan</th>
           <th class = "colBirthDate" id = "birthDate" scope="col" @click="sortBy('birthDate')" >Birth Date</th>
           <th class = "colDeathDate" id = "deathDate" scope="col" @click="sortBy('deathDate')" >Death Date</th>
        </tr>
        </thead>
        <tbody class="scrollContent">
          <tr v-for="(item,index) in checkResults.profilesRowData" :key="index">
            <td class = "colWikiTreeId">
                <a v-bind:href="item.wikiTreeLink" 
                target="_blank"> {{ item.wikiTreeId }} </a>
            </td>
            <td class = "colPersonName">{{ item.personName }} </td>
            <td class = "colUnsourcedStatus">{{ item.profileStatus }} </td>
            <td class = "colStyleIssues">{{ item.hasStyleIssues }} </td>
            <td class = "colProfilePrivacy">{{ item.profilePrivacy }} </td>
            <td class = "colOrphan">{{ item.profileIsOrphan }} </td>
            <td class = "colBirthDate">{{ item.birthDate }} </td>
            <td class = "colDeathDate">{{ item.deathDate }} </td>
          </tr>
        </tbody>
      </template>
      <template v-else-if="isDefaultReport">
        <thead class="fixedHeader">
         <tr>
           <th class = "colWikiTreeId" id = "wikiTreeId" scope="col" @click="sortBy('wikiTreeId')" >Profile</th>
           <th class = "colPersonName" id = "personName" scope="col" @click="sortBy('personName')" >Name</th>
           <th class = "colUnsourcedStatus" id = "unsourcedStatus" scope="col" @click="sortBy('unsourcedStatus')" >Sourced?</th>
           <th class = "colIsEmpty" id = "isEmpty" scope="col" @click="sortBy('isEmpty')" >Empty</th>
           <th class = "colMisplacedLineCnt" id = "misplacedLineCnt" scope="col" @click="sortBy('misplacedLineCnt')" >Misplaced Lines</th>
           <th class = "colMissingEnd" id = "missingEnd" scope="col" @click="sortBy('missingEnd')" >Missing end</th>
           <th class = "colBioHeading" id = "bioHeading" scope="col"
           @click="sortBy('bioHeading')" >Biography Heading</th>
           <th class = "colSourcesHeading" id = "sourcesHeading" scope="col" @click="sortBy('sourcesHeading')" >Sources Heading</th>
           <th class = "colReferencesTag" id = "referencesTag" scope="col" @click="sortBy('referencesTag')" >references tag</th>
           <th class = "colAcknowledgements" id = "acknowledgements" scope="col" @click="sortBy('acknowledgements')" >Ack...</th>
           <th class = "colInlineRefCnt" id = "inlineRefCnt" scope="col" @click="sortBy('inlineRefCnt')" >Inline ref Count</th>
        </tr>
        </thead>
        <tbody class="scrollContent">
          <tr v-for="(item,index) in checkResults.resultsRowData" :key="index">
            <td class = "colWikiTreeId">
                <a v-bind:href="item.wikiTreeLink" 
                target="_blank"> {{ item.wikiTreeId }} </a>
            </td>
            <td class = "colPersonName">{{ item.personName }} </td>
            <td class = "colUnsourcedStatus">{{ item.unsourcedStatus }} </td>
            <td class = "colIsEmpty">{{ item.isEmpty }} </td>
            <td class = "colMisplacedLineCnt">{{ item.misplacedLineCnt}} </td> 
            <td class = "colMissingEnd">{{ item.missingEnd }} </td>
            <td class = "colBioHeading">{{ item.bioHeading }} </td>
            <td class = "colSourcesHeading">{{ item.sourcesHeading }} </td>
            <td class = "colReferencesTag">{{ item.referencesTag }} </td>
            <td class = "colAcknowledgements">{{ item.acknowledgements }} </td>
            <td class = "colInlineRefCnt">{{ item.inlineRefCnt }} </td>
          </tr>
        </tbody>
      </template>
      <template v-else>
      </template>
      </table>
    </div>

      <div id="FOOTER">
        <a href="https://www.wikitree.com/" class="NOLINE"><b>WikiTree</b></a>
         &nbsp;~&nbsp; 
        <a href="https://www.wikitree.com/wiki/About_WikiTree" class="NOLINE">About</a>
         &nbsp;~&nbsp; 
        <a href="https://www.wikitree.com/blog/" class="NOLINE">Blog</a>
         &nbsp;~&nbsp; 
        <a href="https://www.wikitree.com/wiki/How_to_use_WikiTree" class="NOLINE">Help <img src="https://www.wikitree.com/images/icons/help.gif" border="0" width="11" height="11" alt="Help" title="Help"></a>
         &nbsp;~&nbsp; 
        <a href="https://www.wikitree.com/g2g/" class="NOLINE">G2G Q&amp;A Forum</a>
         &nbsp;~&nbsp; 
        <a href="https://www.wikitree.com/wiki/Special:SearchPerson" class="NOLINE">Search <img src="https://www.wikitree.com/images/icons/find-matches.gif" border="0" width="11" height="11" alt="Person Search" title="Person Search"></a>
        <p><a href="https://www.wikitree.com/index.php?title=Special:Userlogin" rel="nofollow" class="NOLINE">Login</a> | <a href="/index.php?title=Special:Userlogin&amp;type=signup" rel="nofollow" class="NOLINE">Register</a></p>
        <p align="center"><a href="https://www.wikitree.com/about/terms.html"><img class="MIDDLE" src="https://www.wikitree.com/images/terms.gif" border="0" width="797" height="64" alt="disclaimer - terms - copyright"></a></p>
      </div>
  </div>
</template>

<script>

import { BioCheck } from "./BioCheck.js"
import { BioResultsExport } from "./BioResultsExport.js"

export default {
  name: 'App',

  props: ["userContext"], 

    data: function() {
      return {

        promptMessage: "Select how to find profiles from the pulldown menu: Select Profile Id to find by profile OR select WikiTree+ search results to find by WikiTree+ search OR select Check watchlist to check profiles on your watchlist",
        inputWikiTreeIdTip: "If you have set How to Find Profiles as Profile Id, enter the Profile Id to use to find profiles to check (e.g., Doe-100",
        numAncestorGenTip: "If you have set How to Find Profiles as Profile Id, enter the number of generations of ancestors to check for the profile",
        numDescendantsGenTip: "If you have set How to Find Profiles as Profile Id, enter the number of generations of descendants to check for the profile",
        queryArgTip: "If you have set How to Find Profiles as WikiTree+ search results, enter the text to use in a WikiTree+ search to find profiles to check)",
        maxQueryTip: "Enter the maximum number profiles to return from the WikiTree+ search or your watchlist. Use this to limit the number of profiles returned to Bio Check",
        searchStartTip: "Enter the offset to start checking returned profiles.  Start at 0. See the Help for more details",
        searchMaxTip: "Enter maximum number of profiles to check from the WikiTree+ search results or your watchlist. The check will complete when this number is reached",

        openOnlyTip: "Select to check only open profiles. When not selected, any profile with a public biography will be checked",
        ignorePre1500Tip: "Select to check only post-1500 profiles or those with no dates",
        reliableSourcesOnlyTip: "Select to require Pre-1700 reliable sources for all profiles",
        checkAutoGeneratedTip: "Select to report style for biography auto-generated by a GEDCOM import",
        numRelativesTip: "Enter number of degrees of connection to check.  This will check all relatives (parents, spouses, children, siblings) for the profile. This can apply to all profiles or ony those profiles that have source or style issues. Each degree will check the relatives of all previously checked profiles.",
        connectionsTip: "Select to check all connected profiles. When selected, all profiles will be checked; otherwise only unsourced profiles or profiles with style issues will be checked. Profiles will be checked for the number of degrees specified.",
        maxReportTip: "Enter the maximum number of profiles to report. The check will complete when this many profiles have been reported",
        reportStyleTip: "Select profiles to report.  Select Unsourced and Style to report profiles with source or style issues. Select Watchlist profiles not managed by you to report only those profiles from your watchlist where you are the manager. Select All Profiles to report all profiles. Select Sources for ... to report sources on the profiles, Select None to report overall statistics but no individual profiles",


        checkStart: "user:",

        userArgs: {
          inputWikiTreeId: "",
          numAncestorGen: 5,
          numDescendantGen: 2,
          checkType: 1,
          selectedCheckType: "checkByProfile",
          queryArg: "",
          maxQuery: 5000,
          searchStart: 0,
          searchMax: 5000,
          openOnly: false,
          ignorePre1500: false,
          reliableSourcesOnly: false,
          checkAutoGenerated: false,
          numRelatives: 0,
          checkAllConnections: false,
          maxReport: 5000,
          reportAllProfiles: false,
          reportNonManaged: false,
          selectedReportType: "",
          sourcesReport: false,
          profileReviewReport: false,
          reportStatsOnly: false,
          userId: 0,
          userName: "",
          loggedIn: false,
        },
        checkStatus: { 
          stateMessage: " ",
          progressMessage: "Identify how to find profiles, criteria for finding profiles, what to check, what to report, then select Check Profiles",
          progressMessageTitle: "",
          cancelPending: false,

          checkDisabled: false,
          cancelDisabled: true,
          exportDisabled: true,
          toolsDisabled: true,
        },
        checkResults: {
          key: "",
          resultsRowData: [],
          sourcesRowData: [],
          profilesRowData: [],
        },
        isInternetExplorer: false,

        sortKey: "wikiTreeId",
        reverse: false,
        loginMessage: "",
        toolsLabel: "Tools not available",
        toolsUserId: "",

      }
    },

  computed: {
    isExportDisabled: function () {
      if ((this.checkStatus.exportDisabled || this.isInternetExplorer) ||
          ((this.checkResults.resultsRowData.length < 1) &&
            (this.checkResults.sourcesRowData.length < 1) &&
            (this.checkResults.profilesRowData.length < 1))) {
        return true;
      } else {
        return false;
      }
    },

    isWatchlistDisabled: function() {
      // disabled unless user logged in
      return (!this.userContext.loggedIn);
    },

    watchlistSelected: function() {
      return (this.userArgs.selectedCheckType === "checkWatchlist");
    },

    isCheckByProfile: function() {
      if (this.userArgs.selectedCheckType === "checkByProfile") {
        return true;
      } else {
        return false;
      }
    },
    isCheckByQuery: function() {
      if (this.userArgs.selectedCheckType === "checkByQuery") {
        return true;
      } else {
        return false;
      }
    },
    isCheckWatchlist: function() {
      if (this.userArgs.selectedCheckType === "checkWatchlist") {
        return true;
      } else {
        return false;
      }
    },
    isCheckRandom: function() {
      if (this.userArgs.selectedCheckType === "checkRandom") {
        return true;
      } else {
        return false;
      }
    },

    isSourcesReport: function() {
      if ((this.userArgs.selectedReportType === "sourcesReportStyle") ||
          (this.userArgs.selectedReportType === "sourcesReportAll")) {
        return true;
      } else {
        return false;
      }
    },

    isProfileReviewReport: function() {
      if ((this.userArgs.selectedReportType === "reportReviewProfiles") ||
          (this.userArgs.selectedReportType === "reportReviewProfilesAll")) {
        return true;
      } else {
        return false;
      }
    },

// should "reportNonManaged"  be default only?
    isDefaultReport: function() {
      if ((this.userArgs.selectedReportType === "sourcesReportStyle") ||
          (this.userArgs.selectedReportType === "sourcesReportAll") ||
          (this.userArgs.selectedReportType === "reportReviewProfiles") ||
          (this.userArgs.selectedReportType === "reportReviewProfilesAll") ||
          (this.userArgs.selectedReportType === "reportStatsOnly")) {
        return false;
      } else {
        return true;
      }
    },

    disableQueryArg: function() {
      if ((this.userArgs.selectedCheckType === "checkByProfile") ||
          (this.userArgs.selectedCheckType === "checkWatchlist") ||
          (this.userArgs.selectedCheckType === "checkRandom")) {
        return true;
      } else {
        return false;
      }
    },
  },

  created() {
    // Override default values with those from URL, if any
    let userAgent = navigator.userAgent;
    this.isInternetExplorer = userAgent.indexOf("MSIE ") > -1 || userAgent.indexOf("Trident/") > -1;
    this.getUrlParams();
    if (this.userContext.loggedIn) {
      this.loginMessage = "You are currently logged in as " + this.userContext.userName;
      if (this.userArgs.inputWikiTreeId.length == 0) {
        this.userArgs.inputWikiTreeId = this.userContext.userName;
      }
    } else {
      this.loginMessage = "You are not currently logged in to apps.wikitree.com. Only public biographies will be checked.";
    }
  },

  mounted() {
    this.$nextTick(function () {
      // Code that will run only after the
      // entire view has been rendered
      // use the auto arg to act like check profiles button click
      if (this.checkStart === "auto") {
        this.userArgs.reportAllProfiles = false;
        this.checkProfiles();
      }
    })
  },

    methods: {

      sortBy: function(sortKey) {
        let sortData = this.checkResults.resultsRowData;
        if (this.userArgs.sourcesReport) {
          sortData = this.checkResults.sourcesRowData;
        } else {
          if (this.userArgs.profileReviewReport) {
            sortData = this.checkResults.profilesRowData;
          }
        }
        //this.checkResults.resultsRowData.sort( (a, b) => {
        sortData.sort( (a, b) => {
          //  numeric sort
          if (typeof a[sortKey] === 'number'){
            return a[sortKey] - b[sortKey];
          }
          //  alphanumeric sort
          const aa = a[sortKey];
          const bb = b[sortKey];
          return aa < bb ? -1 : aa > bb ?  1 : 0;
          } );
          this.reverse = (this.sortKey === sortKey) ? !this.reverse : false;
          if (this.reverse) this.checkResults.resultsRowData.reverse();
          this.sortKey = sortKey;
        },

      checkProfiles: function () {
        let isValidUserInput = true;
        if (this.userArgs.searchStart > this.userArgs.maxQuery) {
          this.checkStatus.progressMessage = "Check starting at cannot be greater than Max search profiles";
        } else {
          switch (this.userArgs.selectedCheckType) {
            case "checkByQuery":
              if (this.userArgs.maxQuery > 50000) {
                this.userArgs.maxQuery = 50000;
                this.checkStatus.progressMessage = "Max search profiles has been changed to maximum of 50000";
              }
              if (this.userArgs.queryArg.length === 0) {
                isValidUserInput = false;
                this.checkStatus.progressMessage = "WikiTree+ search text must be supplied";
              }
              this.setTools(false, "");
              break;
            case "checkRandom":
              this.setTools(false, "");
              break;
            case "checkByProfile":
              if (!this.userArgs.inputWikiTreeId.includes("-")) {
                isValidUserInput = false;
                this.checkStatus.progressMessage = "Enter WikiTreeId in the form Name-####";
              } else {
                this.setTools(true, this.userArgs.inputWikiTreeId);
              }
              break;
            case "checkWatchlist":
                if (this.userArgs.maxQuery > 5000) {
                  this.userArgs.maxQuery = 5000;
                  this.checkStatus.progressMessage = "Max search profiles has been changed to maximum of 5000";
                }
                this.setTools(true, this.userContext.userName);
              break;
          }
        }
        if (isValidUserInput) {
          switch (this.userArgs.selectedReportType) {
            case "reportSourcesStyle":
              this.userArgs.sourcesReport = false;
              this.userArgs.reportAllProfiles = false;
              this.userArgs.profileReviewReport = false;
              this.userArgs.reportNonManaged = false;
              this.userArgs.reportStatsOnly = false;
              break;
            case "reportAll":
              this.userArgs.sourcesReport = false;
              this.userArgs.reportAllProfiles = true;
              this.userArgs.profileReviewReport = false;
              this.userArgs.reportNonManaged = false;
              this.userArgs.reportStatsOnly = false;
              break;
            case "reportNonManaged":
              this.userArgs.sourcesReport = false;
              this.userArgs.reportNonManaged = true;
              this.userArgs.reportAllProfiles = false;
              this.userArgs.profileReviewReport = false;
              this.userArgs.reportStatsOnly = false;
              break;
            case "sourcesReportStyle":
              this.userArgs.sourcesReport = true;
              this.userArgs.reportAllProfiles = false;
              this.userArgs.profileReviewReport = false;
              this.userArgs.reportNonManaged = false;
              this.userArgs.reportStatsOnly = false;
              break;
            case "sourcesReportAll":
              this.userArgs.sourcesReport = true;
              this.userArgs.reportAllProfiles = true;
              this.userArgs.profileReviewReport = false;
              this.userArgs.reportNonManaged = false;
              this.userArgs.reportStatsOnly = false;
              break;
            case "reportReviewProfiles":
              this.userArgs.sourcesReport = false;
              this.userArgs.reportAllProfiles = false;
              this.userArgs.profileReviewReport = true;
              this.userArgs.reportNonManaged = false;
              this.userArgs.reportStatsOnly = false;
              break;
            case "reportReviewProfilesAll":
              this.userArgs.sourcesReport = false;
              this.userArgs.reportAllProfiles = true;
              this.userArgs.profileReviewReport = true;
              this.userArgs.reportNonManaged = false;
              this.userArgs.reportStatsOnly = false;
              break;
            case "reportStatsOnly":
              this.userArgs.sourcesReport = false;
              this.userArgs.reportAllProfiles = false;
              this.userArgs.profileReviewReport = false;
              this.userArgs.reportNonManaged = false;
              this.userArgs.reportStatsOnly = true;
              break;
          }
          // Clear previous results
          this.checkResults.resultsRowData.splice(0, this.checkResults.resultsRowData.length);
          this.checkResults.sourcesRowData.splice(0, this.checkResults.sourcesRowData.length);
          this.checkResults.profilesRowData.splice(0, this.checkResults.profilesRowData.length);
          this.checkStatus.checkDisabled = true;
          this.checkStatus.cancelDisabled = false;
          this.checkStatus.exportDisabled = true;
          this.checkStatus.stateMessage = "";
          this.checkStatus.progressMessage = "Examining profiles";
          this.userArgs.userId = this.userContext.userId;
          this.userArgs.userName = this.userContext.userName;
          this.userArgs.loggedIn = this.userContext.loggedIn;
          let bioCheck = new BioCheck();
          bioCheck.check(this.userArgs, this.checkStatus, this.checkResults);
        }
      },

      cancelCheck: function () {
        this.checkStatus.stateMessage = "Cancel in progress...";
        this.checkStatus.cancelPending = true;
        this.checkStatus.cancelDisabled = true;
      },

      exportCsv: function () {
        this.checkStatus.stateMessage = "Creating CSV ...";
        let bioResultsExport = new BioResultsExport();
        if (this.userArgs.sourcesReport) {
          bioResultsExport.exportSourcesRowCsv(this.userArgs, this.checkResults.sourcesRowData);
        } else {
          if (this.userArgs.profileReviewReport) {
            bioResultsExport.exportReviewRowCsv(this.userArgs, this.checkResults.profilesRowData);
          } else {
            bioResultsExport.exportResultsRowCsv(this.userArgs, this.checkResults.resultsRowData);
          }
        }
        this.checkStatus.stateMessage = "Completed";
      },

      setTools: function (enableTools, profileId) {
        if (enableTools) {
          this.checkStatus.toolsDisabled = false;
          this.toolsLabel = profileId + " Tools ";
          this.toolsUserId = profileId;
        } else {
          this.toolsLabel = "Tools not available";
          this.checkStatus.toolsDisabled = true;
        }
      },

      profileTools: function () {
        if (this.toolsUserId.includes("-")) {
          let parts = this.toolsUserId.split("-");
          let url = "https://www.wikitree.com/genealogy/" + parts[0] +
                    "-Family-Tree-" + parts[1] + "#tools";
          window.open(url);
        }
      },

      checkBioHelp: function () {
        const url = "https://www.wikitree.com/wiki/Space:BioCheckHelp";
        window.open(url);
      },

      wikiTreePlus: function () {
        let url = "https://wikitree.sdms.si/default.htm?report=srch1";
        if (this.userArgs.selectedCheckType === "checkByQuery") {
          url += "&Query=" + this.userArgs.queryArg + "&MaxProfiles=" + this.userArgs.maxQuery;
        }
        window.open(url);
      },

    /*
     * get URL parameters
     * sample args
     *   ?action=checkQuery&query=val&maxProfiles=val
     *   ?action=checkProfile&profileId=val&numAncestorGen=5&checkStart=auto
     *   ?action=checkWatchlist&checkStart=auto 
     *
     * args:
     *   action=checkQuery or checkProfile or checkWatchlist
     *   query=value for WikiTree+ query
     *   maxProfiles=max profiles for WikiTree+ query
     *   profileId=profile name
     *   numAncestorGen=number of ancestor generations
     *   numDescendantGen=number of descendant generations
     *   checkStart=user or auto
     * when action=checkWatchlist&checkStart=auto max search, check, and report are set to 5000
    */
      getUrlParams: function () {
        if (this.isInternetExplorer) {
          let regex = new RegExp('[\\?&]' + "action" + '=([^&#]*)');
          //let args = regex.exec(this.urlParams);
          let args = regex.exec(this.userContext.urlParamString);
          if (!(args === null) && (args.length > 0)) {
            let checkType = decodeURIComponent(args[1].replace(/\+/g, " "));
            if (checkType === "checkQuery") {
              this.userArgs.selectedCheckType = "checkByQuery";
            } else {
              if (checkType === "checkProfile") {
                this.userArgs.selectedCheckType = "checkByProfile";
              } else {
                if (checkType === "checkWatchlist") {
                  this.userArgs.selectedCheckType = "checkWatchlist";
                  this.userArgs.maxQuery = 5000;
                  this.userArgs.searchMax = 5000;
                  this.userArgs.maxReport = 5000;
                }
              }
            }
          }
          regex = new RegExp('[\\?&]' + "query" + '=([^&#]*)');
          args = regex.exec(this.urlParams);
          if (!(args === null) && (args.length > 0)) {
            this.userArgs.queryArg = decodeURIComponent(args[1].replace(/\+/g, " "));
          }
          regex = new RegExp('[\\?&]' + "maxProfiles" + '=([^&#]*)');
          args = regex.exec(this.urlParams);
          if (!(args === null) && (args.length > 0)) {
            this.userArgs.maxQuery = decodeURIComponent(args[1].replace(/\+/g, " "));
          }
          regex = new RegExp('[\\?&]' + "numAncestorGen" + '=([^&#]*)');
          args = regex.exec(this.urlParams);
          if (!(args === null) && (args.length > 0)) {
            this.userArgs.numAncestorGen = decodeURIComponent(args[1].replace(/\+/g, " "));
          }
          regex = new RegExp('[\\?&]' + "numDescendantGen" + '=([^&#]*)');
          args = regex.exec(this.urlParams);
          if (!(args === null) && (args.length > 0)) {
            this.userArgs.numAncestorGen = decodeURIComponent(args[1].replace(/\+/g, " "));
          }
          regex = new RegExp('[\\?&]' + "checkStart" + '=([^&#]*)');
          args = regex.exec(this.urlParams);
          if (!(args === null) && (args.length > 0)) {
            this.checkStart = decodeURIComponent(args[1].replace(/\+/g, " "));
          }
        } else {
          let args = new URLSearchParams(this.userContext.urlParamString.search);
          if (args.has("action")) {
            let checkType = args.get("action");
            if (checkType === "checkQuery") {
              this.userArgs.selectedCheckType = "checkByQuery";
            } else {
              if (checkType === "checkProfile") {
                this.userArgs.selectedCheckType = "checkByProfile";
              } else {
                if (checkType === "checkWatchlist") {
                  this.userArgs.selectedCheckType = "checkWatchlist";
                  this.userArgs.maxQuery = 5000;
                  this.userArgs.searchMax = 5000;
                  this.userArgs.maxReport = 5000;
                } else {
                  if (checkType === "checkRandom") {
                    this.userArgs.selectedCheckType = "checkRandom";
                  }
                }
              }
            }
          }
          if (args.has("query")) {
            this.userArgs.queryArg = args.get("query");
          }
          if (args.has("maxProfiles")) {
            this.userArgs.maxQuery = args.get("maxProfiles");
          }
          if (args.has("profileId")) {
            this.userArgs.inputWikiTreeId = args.get("profileId");
            this.userArgs.openOnly = false;
          }
          if (args.has("numAncestorGen")) {
            this.userArgs.numAncestorGen = args.get("numAncestorGen");
          }
          if (args.has("numDescendantGen")) {
            this.userArgs.numDescendantGen = args.get("numDescendantGen");
          }
          if (args.has("checkStart")) {
            this.checkStart = args.get("checkStart");
          }
        }
      }
    }
}
</script>
<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
}
.user-input {
  display: flex;
  margin: 0 .5em 0 .5em;
  align-items: center;
  min-height: 1.75em;
}
.flex-grid {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  border: 1px solid black;
}
.flex-grid .col {
  flex: 1;
}
.flex-center {
  display: flex;
  justify-content: center;
}

@media (max-width: 400px) {
  .flex-grid {
    display: block;
    .col {
      width: 100%;
      margin: 0 0 10px 0;
    }
  }
}

* {
    box-sizing: border-box;
  }
body {
  padding: 20px;
}

.vmodel-input {
  display: block;
  width: 100%;
  font-size: 100%;
}
input[type="checkbox"] {
  flex: 1;
  width: auto;
}
label,
select {
  display: flex;
  width: 100%;
  max-width: 100%;
  font-size: 100%;
}
button {
  margin: .5em;
  font-size: 100%;
  box-shadow: 2px 2px 2px 1px rgba(0, 0, 0, 0.2);
}
.button-panel {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.left-button {
  display: flex;
  justify-content: flex-start;
}
.right-button {
  display: flex;
  justify-content: flex-end;
}
.feedback {
  display:flex;
  padding: 0 0 0.5em 0;
  flex-direction: column;
}
.feedback-progress {
}
.feedback-state {
}
.tableContainer {
  clear: both;
  width: 90vw;
  height: 75vh;
}
.resultsTable {
  border: 1px solid black;
  border-collapse: collapse;
}

table { 
  width: 90vw;
}
tr {
  table-layout: fixed;
  word-wrap: break-word;
}

thead, tbody, tr {
  display: table;
  width: 90vw;
}

tbody {
  display: block;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 66vh;
}

th {
  border: 1px solid black;
  border-bottom: 2px solid black;
  border-top: 2px solid black;
}
td {
  border-right: 1px solid black;
  border-bottom: 1px solid black;
  border-left: 1px solid black;
}
.colWikiTreeId { width: 9% }
.colPersonName { width: 15% }
.colUnsourcedStatus { width: 6% }
.colIsEmpty { width: 5% }
.colMisplacedLineCnt { width: 7% }
.colMissingEnd { width: 6% }
.colBioHeading { width: 7% }
.colSourcesHeading { width: 6% }
.colReferencesTag { width: 8% }
.colAcknowledgements { width: 5% }
.colInlineRefCnt { width: 5% }

.colSourceCount { width: 4% }
.colSourceLine { width: 51% }
.colStyleIssues { width : 7% }
.colProfilePrivacy { width : 7% }
.colOrphan { width : 7% }
.colBirthDate { width : 7% }
.colDeathDate { width : 7% }

td {
  text-align: center;
}
td.colSourceLine { text-align: left }
</style>
