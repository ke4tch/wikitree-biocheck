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
 * Rules for identifying sources in a biography that are not valid.
 * This class is intended to be a singleton and immutable
 * and look like what could be read from database tables
 */

import { BioCheckTemplateManager } from "./BioCheckTemplateManager.js";

class SourceRules {
  #isInit = false;

  // all sorts of rules to parse biography and check sources
  #biographyHeadings = [
    "biography",
    "biographie",
    "biografia",
    "biografie",
    "biografi",
    "elämäntarina",
    "Æviskrá",
    "bographie",
    "biografijo",
    "biografía",
  ];
  #researchNotesHeadings = [
    "research notes",
    // note if you want to give them a break you could
    // include research  notes (extra space) and research note (no s)
    "notes de recherche",
    "onderzoeksnotities",
    "opmerkingen",
    "bemerkungen zur nachforschung",
    "forschungsnotizen",
    "notas de investigación",
    "note di ricerca",
    "forskningsanteckningar",
    "forskningsnotater",
    "notas de pesquisa",
    "forskningsnotater",
    "tutkimustiedot",
    "notatki badawcze",
    "raziskovalne opombe",
    "viittaukset",
    "rannsóknarnótur",
  ];
  #sourcesHeadings = [
    "sources",
    "quellen",
    "bronnen",
    "fuentes",
    "lähteet",
    "fonti",
    "kallor",
    "heimildir",
    "källor",
    "fontes",
    "kilder",
    "źródła",
    "izvor",
  ];
  #acknowledgmentsHeadings = [
    "acknowledgements",
    "acknowledgments",
    "acknowledgement",
    "acknowledgment",
    "remerciements",
    "dankbetuiging",
    "anerkennung",
    "danksagungen",
    "agradecimientos",
    "ringraziamenti",
    "dankwoord",
    "erkännanden",
    "reconhecimentos",
    "riconoscimenti",
    "anerkendelser",
    "anerkjennelser",
    "bekräftelser",
    "tunnustukset",
    "podziękowanie",
    "priznanja",
  ];
  // loads from templates, each is name and status
  #rnb = [];
  // loads from templates
  #navBox = [];
  // loads from templates
  #projectBox = [];
  // loads from templates
  #sticker = [];

  // strings that identify a census source
  // when used by itself or with nothing other than
  // date are not a valid source
  #censusStrings = [
    "census",
    "recensement",
    "bevolkingsregister",
    "volkszählung",
    "censo",
    "censimento",
    "volkstelling",
    "folketælling",
    "telling",
    "folkräkning",
    "väestönlaskenta",
    "spis",
    "ludności",
    "popis",
    "väestönlaskenta",
    "manntal",
    "folketelling",
    "folkräkning",
    "us federal census",
    "united states federal census",
    "united states census",
    "us census",
    "u.s. census",
    "us census returns",
    "federal census",
    "swedish census",
    "canada census",
    "census of canada",
    "canadian census",
    "england census",
    "irish census",
    "ireland census",
    "census information",
    "new york state census",
    "iowa state census",
    "scotland census",
  ];

  /* order by length then alpha, but for efficiency
   * since most profiles are English, that is first
   * Note: logic checks for at least 15 characters so
   * shorter are commented out, but kept in case
   * this is too aggressive
   * invalidSourceList are strings on a line by themselves
   */
  #invalidSourceList = [
    /*
    ".",
    "*",
    "bmd",
    "---",
    "ibid",
    "----",
    "bible",
    "census",
    "family",
    "freebmd",
    "hinshaw",
    "ancestry",
    "footnote",
    "geneanet",
    "research",
    "see also",
    "footnotes",
    "see also:",
    "we relate",
    "findagrave",
    "footnotes:",
    "myheritage",
    "ancestrycom",
    "ancestry.uk",
    "ancestry.ca",
    "bdm records",
    "my heritage",
    "my research",
    "will follow",
    "ancestry.com",
    "familysearch",
    "family bible",
    "family trees",
    "find a grave",
    "find-a-grave",
    "find my past",
    "source list:",
    "ancestry.com:",
    "billiongraves",
    "family member",
    "family papers",
    "family search",
    "needs sources",
    ":source list:",
    "source needed",
    "we relate web",
    "ancestry.co.uk",
    "ancestrydotcom",
    "billion graves",
    "census records",
    "church records",
    "family history",
    "family records",
    "findagrave.com",
    "freebmd.org.uk",
    "internet files",
    "my family tree",
    "myheritage.com",
    "parish records",
    "passenger list",
    "'''see also'''",
//   12345678901234
    */
    "ancestry source",
    "census records.",
    "familysearchorg",
    "family accounts",
    "familie dossier",
    "family research",
    "online research",
    "own family tree",
    "title: marriage",
    "'''see also:'''",
    "www.ancestry.ca",
    "www.bms2000.org",
    "familysearch.org",
    "family documents",
    "family knowledge",
    "findmypast.co.uk",
    "'''footnotes:'''",
    "internet records",
    "personal records",
    "research records",
    "www.ancestry.com",
    "acknowledgements:",
    "ancestry research",
    "familysearch data",
    "familysearch tree",
    "family collection",
    "family tree files",
    "fellow researcher",
    "my family records",
    "scotland's people",
    "wiki, family tree",
    ":'''footnotes:'''",
    "personal research",
    "private genealogy",
    "'''source list'''",
    ":'''source list'''",
    "'''source list:'''",
    "cemetery headstone",
    "citing this record",
    "family information",
    "newspaper obituary",
    "source information",
    "title: death index",
    "wwwfamilysearchorg",
    "www.ancestry.co.uk",
    "www.gencircles.com",
    "www.myheritage.com",
    "{{citation needed}}",
    "citing this record:",
    "familysearch search",
    "from family records",
    "my heritage records",
    "my tree on ancestry",
    ":'''source list:'''",
    "real estate records",
    "ancestry family site",
    "ancestry family tree",
    "family bible records",
    "personal family tree",
    "personal information",
    "research on ancestry",
    "uk census; bmd index",
    "www.familysearch.org",
    "ancestry family trees",
    "family search records",
    "mormon church records",
    "replace this citation",
    "ancestry and documents",
    "scotlandspeople.gov.uk",
    "ancestry tree & sources",
    "family tree on ancestry",
    "personal family records",
    "thanks to family search",
    "no sources at this time",
    "geneanet community trees",
    "scotlandspeople database",
    "family search family tree",
    "scotland's people website",
    "us census, public records",
    "ancestry and family search",
    "new york census, 1790-1890",
    "www.scotlandspeople.gov.uk",
    "family tree on familysearch",
    "social security death index",
    "torrey's marriages database",
    "sources are on my family tree",
    "familysearch.org ancestry.com",
    "ancestry.com familysearch.org",
    "online trees. will add sources",
    "geneanet community trees index",
    "'''footnotes and citations:'''",
    ":'''footnotes and citations:'''",
    "family search files on internet",
    "victorian death index 1921-1985",
    "iowa, select marriages, 1809-1992",
    "research on ancestry and wikiTree",
    "personal knowledge , census reports",
    "a source is still needed for this data",
    "social security applications and claims",
    "a source for this information is needed",
    "family records, census, and death records",
    "research on ancestry and burial card info",
    "research on ancestry and marriage records",
    "geneanet community trees index on ancestry",
    "marriage records and ancestry.com research",
    "passenger and immigration lists index, 1500s-1900s",
    "replace this citation if there is another source",
    "research on ancestry and a variety of other places",
    "search at https://www.freereg.org.uk with appropriate parameters",
    "personal recollection, as told to me by their relative. notes and sources in their possession.",
    "michael lechner,",
    "virginia hanks",
    "teresa a. theodore",
    "michael eneriis",
    "personal knowledge, newspaper and bible records",

    /*
    "spis",
    "censo",
    "popis",
    "badania",
    "ricerca",
    "se aven",
    "se även",
    "se også",
    "sukupuu",
    "telling",
    "zie ook",
    "ættartré",
    "ludności",
    "pesquisa",
    "se också",
    "stamboom",
    "tutkimus",
    "forschung",
    "forskning",
    "onderzoek",
    "recherche",
    "slægtstræ",
    "slektstre",
    "släktträd",
    "volgt nog",
    "bron nodig",
    "censimento",
    "familietre",
    "katso myös",
    "katso myös",
    "rannsóknir",
    "sjá einnig",
    "siehe auch",
    "voir aussi",
    "zobacz też",
    "familie træ",
    "folkräkning",
    "poglej tudi",
    "recensement",
    "veja também",
    "ver tambien",
    "familiebibel",
    "folketælling",
    "guarda anche",
    "källa behövs",
    "potreben vir",
    "raziskovanje",
    "volkszählung",
    "volkstelling",
    "bronnen nodig",
    "familienbibel",
    "familie bibel",
    "investigación",
    "nachforschung",
    "perheraamattu",
    "source requise",
    "voir également",
    */
//   12345678901234
    "družinsko drevo",
    "drzewo rodzinne",
    "familiestamboom",
    "kilde nødvendig",
    "lähde tarvitaan",
    "tarvitaan lähde",
    "quelle benötigt",
    "väestönlaskenta",
    "árbol de familia",
    "bible de famille",
    "fjölskyldubiblía",
    "fonte necessária",
    "fuente necesaria",
    "potrzebne źródło",
    "quelle notwendig",
    "familienstammbaum",
    "heimildar er þörf",
    "korvaa tämä viite",
    "source nécessaire",
    "albero genealogico",
    "arbre généalogique",
    "bevolkingsregister",
    "ersätt detta citat",
    "heimild nauðsynleg",
    "kilde er nødvendig",
    "nadomesti ta citat",
    "skiptið út heimild",
    "zastąpić ten cytat",
    "erstat henvisningen",
    "korvaa tämä lainaus",
    "udskift dette citat",
    "ersetze dieses zitat",
    "reemplazar esta cita",
    "vervang deze citatie",
    "erstatt dette sitatet",
    "substitua esta citação",
    "ersätt denna hänvisning",
    "remplacez cette citation",
    "erstatt denne henvisningen",
    "sostituire questa citazione",
  ];

  // anywhere in a line not a valid source
  #invalidPartialSourceList = [
    "through the import of",
    "add sources here",
    "add [[sources]] here",
    "family tree maker",
    ".ftw",
    "replace this citation if there is another source",
    "replace this citation",
  ];

  // anywhere on a line is a valid source
  #validPartialSourceList = ["sources are hidden to protect", "sources hidden to protect", "source hidden to protect"];

  // on the start of a line not a valid source
  #invalidStartPartialSourceList = [
    "entered by",
    "no sources.",
    "no repo record found",
    "source will be added by",
    "no sour record found",
    "no note record found",
  ];

  // on a line by itself
  // not a valid source for
  // profile born > 150 or died > 100
  #tooOldToRememberSourceList = [
    /*
    "husket av",
    "nnn mukaan",
    "eigen kennis",
    "wie erinnert",
    "som minns av",
    "som husket av",
    "ihågkommet av",
    "kuten muistaa",
    "som husket af",
    "samkvæmt minni",
    "jak zapamiętał",
    */
//   12345678901234
    "personal knowledge",
    "firsthand knowledge",
    "first hand knowledge",
    "af fyrstu hendi",
    "kot se spominja",
    "wie erinnert von",
    "como lo recuerda",
    "kuten nn muistaa",
    "as remembered by",
    "förstahandskälla",
    "ensi käden tieto",
    "como lembrado por",
    "come ricordato da",
    "comme rappelé par",
    "selon la mémoire de",
    "førstehånds kendskab",
    "förstahands kännedom",
    "førstehåndskjennskap",
    "zoals herinnerd door",
    "wissen aus erster hand",
    "personal recollection of",
    "personal recollection of events witnessed by",
  ];

  // anywhere in a line
  // not a valid source for
  // profile born > 150 or died > 100
  #invalidPartialSourceListTooOld = [
    "first hand knowledge",
    "firsthand knowledge",
    "personal recollection",
    "as remembered by",
    "selon la mémoire de",
    "zoals herinnerd door",
    "eigen kennis",
    "wie erinnert von",
    "wissen aus erster hand",
    "como lo recuerda",
    "como lembrado por",
    "come ricordato da",
    "wie erinnert",
    "comme rappelé par",
    "som husket av",
    "som minns av",
    "kuten muistaa",
    "jak zapamiętał",
    "kot se spominja",
    "som husket af",
    "kuten nn muistaa",
    "nnn mukaan",
    "samkvæmt minni",
    "husket av",
    "first-hand information",
    "eigen kennis",
  ];

  // line by itself
  // not a valid source for Pre1700
  #invalidSourceListPre1700 = [
    /*
    "igi",
    "family data",
    "birth record",
    "death record",
    */
//   12345678901234
    "marriage record",
    "birth certificate",
    "marriage certificate",
    "death certificate",

    /*
    "akt zgonu",
    "dánarskrá",
    "dödsnotis",
    "trouwakte",
    "trouwacte",
    "dåbsattest",
    "dødsattest",
    "dödsattest",
    "dödsrekord",
    "navneattest",
    "vigselbevis",
    "vigselnotis",
    "dánarvottorð",
    "fæðingarskrá",
    "födelsebevis",
    "födelsenotis",
    "geboorteakte",
    "mrliški list",
    "poročni list",
    "rojstni list",
    "smrtni zapis",
    "acte de décès",
    "akt urodzenia",
    "fødselsattest",
    "fødselsrekord",
    "geboorte akte",
    "hjúskaparskrá",
    "huwelijksakte",
    "kuolinkirjaus",
    "poročni zapis",
    "rojstni zapis",
    "sterbeurkunde",
    "vielsesattest",
    "vigselsattest",
    "vihkitodistus",
    */
//   12345678901234
    "akt małżeństwa",
    "dödscertifikat",
    "dödsfallsintyg",
    "geburtsurkunde",
    "heiratsurkunde",
    "kuolemantiedot",
    "kuolinmerkintä",
    "kuolintodistus",
    "syntymäkirjaus",
    "trouw oorkonde",
    "acte de mariage",
    "døds sertifikat",
    "ekteskapsrekord",
    "födelsedokument",
    "fæðingarvottorð",
    "overlijdensakte",
    "syntymätodistus",
    "syntymämerkintä",
    "vihkimismerkintä",
    "äktenskap rekord",
    "äktenskap rekord",
    "dødsregistrering",
    "dødsregistrering",
    "hjúskaparvottorð",
    "overlijdens acte",
    "overlijdens akte",
    "acta de defunción",
    "certidão de óbito",
    "registre de décès",
    "registro de morte",
    "acte de naissance",
    "acta de nacimiento",
    "avioliitto ennätys",
    "certyfikat śmierci",
    "vielseregistrering",
    "fødselsregistrering",
    "ægteskabsoptegnelse",
    "certificat de décès",
    "registre de mariage",
    "record di matrimonio",
    "certificato di morte",
    "certidão de casamento",
    "certificat de mariage",
    "eheurkunde trauschein",
    "registro de casamento",
    "registre de naissance",
    "certificato di nascita",
    "registro de matrimonio",
    "registro de nascimento",
    "certidão de nascimento",
    "certificat de naissance",
    "certificado de defunción",
    "certificado de matrimonio",
    "certificato di matrimonio",
    "certificado de nacimiento",
    "syntymätiedot akt urodzenia",
    "registro degli atti di morte",
    "vielselsattest el. vigselsattest",
  ];

  // anywhere on a line
  // not a valid source for Pre1700
  #invalidPartialSourceListPre1700 = [
    "ancestry tree",
    "public member tree",
    "family tree",
    "arbre généalogique",
    "familienstammbaum",
    "stamboom",
    "árbol de familia",
    "družinsko drevo",
    "albero genealogico",
    "familiestamboom",
    "familie træ",
    "familietre",
    "släktträd",
    "sukupuu",
    "drzewo rodzinne",
    "family-tree",
    "familysearch.org/tree",
    "trees.ancestry.com",
    "geni tree",
    "ancestral file",
    "burke's peerage",
    "burke’s dormant and extinct peerages",
    "burke’s extinct and dormant baronetcies",
    "burke’s peerage and baronetage",
    "capedia",
    "dictionnaire universel de la noblesse de france",
    "fabpedigree.com",
    "family data collection",
    "genealogie.quebec",
    "genealogieonline",
    "genealogy of the wives of the american presidents",
    "geneanet tree",
    "historiske efterretninger om verfortiente danske adelsmaend",
    "https://kindred.stanford.edu",
    "international genealogical index",
    "jean-baptiste-pierre jullien de courcelles",
    "kindred britain",
    "millennium file",
    "myheritage tree",
    "nicolas viton de saint-allais",
    "nobiliaire universel de france",
    "nosorigines",
    "nos origines",
    "nos origines.",
    "our common ancestors",
    "our royal, titled, noble, and commoner ancestors",
    "our-royal-titled-noble-and-commoner-ancestors.com",
    "pedigree resource file",
    "roglo",
    "rootsweb tree",
    "stirnet.com",
    "the peerage",
    "thepeerage.com",
    "tudor place",
    "u.s. and international marriage records, 1560-1900",
    "us and international marriages Index",
    "vore fælles ahner",
    "www.genealogieonline.nl",
    "www.tudorplace.com.ar",
    "ancestry.com-oneworld tree",
    "one world tree",
    "family group sheet",
    "added by confirming a smart match",
    "world family tree",
    "derbund wft",
    "www.gencircles.com",
    "unsourced family tree handed down",
  ];

  // make this a singleton
  constructor() {
    if (!SourceRules.theSourceRules) {
      let bioCheckTemplateManager = new BioCheckTemplateManager();
      bioCheckTemplateManager.load();
      SourceRules.theSourceRules = this;
    }
    return SourceRules.theSourceRules;
  }

  /* 
   * Load template rules from JSON data
   * this is screwy but seems to work. theload method in BioCheckTemplateManger calls theSourceRules.loadTemplates
   * and this load method is called from theSourceRules constructor
   * avoids issues with no async in constructor
   * but remains a singleton
   */
  loadTemplates(templates) {
    if (!this.#isInit) {
      for (let i = 0; i < templates.length; i++) {
        if (templates[i].type.toLowerCase().trim() === 'profile box') {
          if (templates[i].group.toLowerCase().trim() === 'research note box') {
            let researchNote = {
              name: "",
              status: "",
            };
            researchNote.name = templates[i].name.toLowerCase().trim();
            researchNote.status = templates[i].status.toLowerCase().trim();
            this.#rnb.push(researchNote);
          }
        }
        if (templates[i].type.toLowerCase().trim() === 'navigation profile box') {
          this.#navBox.push(templates[i].name.toLowerCase().trim());
        }
        if (templates[i].type.toLowerCase().trim() === 'project box') {
          this.#projectBox.push(templates[i].name.toLowerCase().trim());
        }
        if (templates[i].type.toLowerCase().trim() === 'sticker') {
          this.#sticker.push(templates[i].name.toLowerCase().trim());
        }
      }
      this.#isInit = true;
    }
  }

  /**
   * Determine if a line is a valid biography heading
   * @param {String} line to test
   * @returns {Boolean} true if bio heading else false
   */
  isBiographyHeading(line) {
    return this.#biographyHeadings.includes(line);
  }
  /**
   * Determine if a line is a valid research notes heading
   * @param {String} line to test
   * @returns {Boolean} true if research notes heading else false
   */
  isResearchNotesHeading(line) {
    return this.#researchNotesHeadings.includes(line);
  }
  /**
   * Determine if a line is a valid sources heading
   * @param {String} line to test
   * @returns {Boolean} true if sources heading else false
   */
  isSourcesHeading(line) {
    return this.#sourcesHeadings.includes(line);
  }
  /**
   * Determine if a line is a valid acknowledgements heading
   * @param {String} line to test
   * @returns {Boolean} true if acknowledgements heading else false
   */
  isAckHeading(line) {
    return this.#acknowledgmentsHeadings.includes(line);
  }

  /**
   * Determine if a line is a valid Research Notes Box
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {Boolean} true if research notes box else false
   */
  isResearchNotesBox(line) {
    let isFound = false;
    this.#rnb.find((element) => {
      if (element.name === line) {
        isFound = true;
      }
    });
    return isFound;
  }

  /**
   * Return status value for research notes box
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {String} status value or blank if not a research notes box
   */
  getResearchNotesBoxStatus(line) {
    let stat = "";
    let isFound = false;
    this.#rnb.find((element) => {
      if (element.name === line) {
        stat = element.status;
      }
    });
    return stat;
  }

  /**
   * Determine if a line is a valid Project Box
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {Boolean} true if research notes box else false
   */
  isProjectBox(line) {
    return this.#projectBox.includes(line);
  }

  /**
   * Determine if a line is a valid Nav Box
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {Boolean} true if nav box else false
   */
  isNavBox(line) {
    return this.#navBox.includes(line);
  }

  /**
   * Determine if a line is a valid Sticker
   * assumes the leading {{ removed and line is lower case
   * @param {String} line to test
   * @returns {Boolean} true if sticker else false
   */
  isSticker(line) {
    return this.lineStartsWithListEntry(line, this.#sticker);
  }

  /**
   * Determine if a line is a census line
   * @param {String} line to test
   * @returns {Boolean} true if census line else false
   */
  isCensus(line) {
    return this.#censusStrings.includes(line);
  }
  /**
   * Determine if a line contains a census string
   * @param {String} line the line
   * @returns census string if line contains census string
   */
  hasCensusString(line) {
    return this.lineContainsListEntry(line, this.#censusStrings);
  }
  /**
   * Determine if line by itself is an invalid source
   * @param {String} line input source string
   * @returns {Boolean} true if invalid source else false
   */
  isInvalidSource(line) {
    return this.#invalidSourceList.includes(line);
  }

  /*
   * Does string start with the text for any of the string in array
   * @param {String} the line to test
   * @param {Array} the array of string to test
   * @returns {Boolean} true if the line includes text from the list of strings else false
   */
  lineStartsWithListEntry(line, stringList) {
    let isFound = false;
    stringList.find((element) => {
      if (line.startsWith(element)) {
        isFound = true;
      }
    });
    return isFound;
  }

  /*
   * Does string include the text for any of the string in array
   * @param {String} the line to test
   * @param {Array} the array of string to test
   * @returns {Boolean} true if the line includes text from the list of strings else false
   */
  lineContainsListEntry(line, stringList) {
    let hasText = false;
    stringList.find((element) => {
      if (line.includes(element)) {
        hasText = true;
      }
    });
    return hasText;
  }
  /*
   * Does line contain a phrase on the valid partial source list
   * This is a test case for strings that if found mean the profile is sourced
   * (thanks to David S for the test case)
   * @param {String} line string to evaluate
   * @returns {Boolean} true if line found, else false
   */
  containsValidPartialSource(line) {
    return this.lineContainsListEntry(line, this.#validPartialSourceList);
  }
  /**
   * Determine if found on partial source list
   * @param {String} line input source string
   * @returns {Boolean} true if found on partial source list, else false
   */
  isInvalidPartialSource(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceList);
  }
  /**
   * Determine if found on partial source list too old to remember
   * @param {String} line input source string
   * @returns {Boolean} true if found on too old partial source list, else false
   */
  isInvalidPartialSourceTooOld(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceListTooOld);
  }
  /**
   * Determine if found on partial source list for pre1700
   * @param {String} line input source string
   * @returns {Boolean} true if found on pre1700 partial source list, else false
   */
  isInvalidPartialSourcePre1700(line) {
    return this.lineContainsListEntry(line, this.#invalidPartialSourceListPre1700);
  }
  /**
   * Determine if starts with something on the invalid partial source list
   * @param {String} line input source string
   * @returns {Boolean} true if starts with invalid source, else false
   */
  isInvalidStartPartialSource(line) {
    let isFound = false;
    this.#invalidStartPartialSourceList.find((element) => {
      if (line.startsWith(element)) {
        isFound = true;
      }
    });
    return isFound;
  }
  /**
   * Determine if line by itself is an invalid source for profile too old to
   * remember
   * @param {String} line input source string
   * @returns {Boolean} true if invalid source else false
   */
  isInvalidSourceTooOld(line) {
    return this.#tooOldToRememberSourceList.includes(line);
  }
  /**
   * Determine if line by itself is an invalid source for Pre1700
   * @param {String} line input source string
   * @returns {Boolean} true if invalid source else false
   */
  isInvalidSourcePre1700(line) {
    return this.#invalidSourceListPre1700.includes(line);
  }
}

const theSourceRules = new SourceRules();
Object.freeze(theSourceRules);
export { theSourceRules };
