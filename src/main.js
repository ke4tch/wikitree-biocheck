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
import Vue from "vue";
import App from "./App.vue";
import WikiTreeAuth from './WikiTreeAuth.js'

Vue.config.productionTip = false;

let myUserContext = {
  urlParamString: "",
  loggedIn: false,
  userName: "",
  userId: 0,
};

let wtAuth = new WikiTreeAuth;

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logged_in").style.display = "none";
  document.getElementById("need_login").style.display = "none";
  // See if user wants to skip login
  let myCookie = wtAuth.cookie('biocheck_state');
  if (myCookie === "skip") {
    wtAuth.cookie('biocheck_state', 'null');
    startAppNow();
  } else {
    const wikiTreeAuth = new WikiTreeAuth (
      ({
        onLoggedIn: () => {
          myUserContext.loggedIn = true;
          myUserContext.userName = wikiTreeAuth.getUserName();
          myUserContext.userId = wikiTreeAuth.getUserId();
          startAppNow();
        },
        onUnlogged: () => {
          document.getElementById("logged_in").style.display = "none";
          document.getElementById("need_login").style.display = "block";
          document.getElementById('returnURL').value = window.location.href;
        },
      }));
    wikiTreeAuth.login();
  }
});


function startAppNow() {
  document.getElementById("need_login").style.display = "none";
  document.getElementById("logged_in").style.display = "block";
  wtAuth.cookie('biocheck_state', 'null');
  myUserContext.urlParamString = window.location;
  new Vue({
    el: "#app",

    components: { App },

    created() {
      // send args to the App
      myUserContext.urlParamString = window.location;
    },
    render: (h) => h("app", { props: { userContext: myUserContext } }),
  }).$mount("#app");
}
