App to check a WikiTree biography

## Dependencies
Makes use of Vue version 2.x

Uses Vite to compile the Vue templates and build project

Using npm to build project:

### Compiles and hot-reloads for development
```
npm run dev
```

### Compiles and minifies for production
```
npm run build

```
### Lints and fixes files
```
npm run lint
```
### Generate docs
```
npm run docs
```


## Shared Code
The following are identical classes found in the Bio Check app and in the 
WikiTree Browser Extension Bio Check feature. They may, in the future, be
used in the WikiTree Dynamic Tree.
* Biography.js
* BiographyResults.js
* PersonDate.js
* SourceRules.js

Example use:
```
import { theSourceRules } from "./SourceRules.js";
import { PersonDate } from "./PersonDate.js";
import { Biography } from "./Biography.js";
  let thePerson = new PersonDate();
  // get the bio text and person dates to check
  thePerson.initWithDates(birthDate, deathDate);
  let biography = new Biography(theSourceRules);
  biography.parse(bioString, thePerson.isPersonPre1500(), thePerson.isPersonPre1700(),
    thePerson.mustBeOpen(), thePerson.isUndated(), false
  );
  let bioStatus = biography.validate(); // true if appears sourced and no style issues, else false
  // now report from biography.bioResults as desired
```

## Software Status
Needs review to consider viablity of migrating to Vue 3.x. 

The index.html file has a placeholder for the app div. This is
where the Vue app is placed.

The main.js script deals with authentication and then starts the Vue app,
passing arguments to be used when the div is rendered.
