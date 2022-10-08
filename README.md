# biocheck
App to check a WikiTree biography.

## Dependencies
Makes use of Vue version 2.x

Use Vue CLI for building to compile the .vue file

Using npm to build project:

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## Software Status
Needs review to consider viablity of migrating to Vue 3.x. 

Moving to 3.x will drop support for IE 11. It may also impact login.

The index.html file has a placeholder for the app div. The build fills this div
with the scripts.

The main.js script deals with authentication and then starts the Vue app,
passing arguments to be used when the div is rendered.
