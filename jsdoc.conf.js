'use strict';

// include the README on the overview page
// don't show source
// put the output in a docs subdirectory
// use the default template with a modified 
//    publish.js that changes "Home" to BioCheck
module.exports = {
    "plugins": [],
    "source": {
        "include": ["./README.md"]
    },
    "templates": {
        "default": {
          "outputSourceFiles": false
        }
    },
    "opts": {
        "destination": "./docs",
        "template": "./jsdocTemplate",
    }
};
