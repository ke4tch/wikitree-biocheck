App to check a WikiTree biography

## Dependencies
Makes use of Vue version 3.x
Uses Vite to compile the Vue templates and build project
Use npm to build the project.
Use npm to build project:

### Compiles and hot-reloads for development
```
npm run dev
```

### Compiles and minifies for production
```
npm run build
```

## Shared Code
The following are **identical** classes found in the Bio Check app, in the
WikiTree Browser Extension, and in the WikiTree Dynamic Tree.
* Biography.js
* BioCheckPerson.js
* SourceRules.js
The Bio Check app and WikiTree Dynamic Tree make use of
* BioCheckTemplateManager

Example use:
```
import { BioCheckTemplateManager } from "./BioCheckTemplateManager";
import { theSourceRules } from "./SourceRules.js";
import { BioCheckPerson } from "./BioCheckPerson.js";
import { Biography } from "./Biography.js";

  // initialization - just once
  let bioCheckTemplateManager = new BioCheckTemplateManager();
  bioCheckTemplateManager.load();

  // For each person. Get the bio text and dates to test
  let thePerson = new BioCheckPerson();
  let canUseThis = thePerson.canUse(profileObj, openOnly, ignorePre1500, useId);
  let biography = new Biography(theSourceRules);
  biography.parse(bioString, thePerson, searchString);
  let profileLooksGood = biography.validate();

  // now report from biography (use getters) as desired or just the boolean return 
```

## Software Status
The index.html file contains the app div where the Vue app is placed.

The main.js script deals with authentication and then starts the Vue app,
passing arguments to be used when the div is rendered.
