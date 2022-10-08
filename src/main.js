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
import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

let myContext = { 
  urlParamString: "",
  loggedIn : false,
  userName : "",
  userId : 0,
};

// a hack to pass in from index.html 
var $ = window.theDollar
var wikitree = window.wts;
var myCookie = $.cookie("biocheck_state");

// In the ready() function we run some code when the DOM is ready to go.
$(document).ready(function(){

  // See if user wants to skip login
  if (myCookie === "skip") {
    $.removeCookie("biocheck_state");
    startAppNow();
  } else {

  wikitree.init({});

  wikitree.session.checkLogin({})
    .then(function() { 
      if (wikitree.session.loggedIn) { 
        /* We're already logged in and have a valid session. */
        $('#need_login').hide();
        $('#logged_in').show();
        myContext.loggedIn = true;
        myContext.userName = $.cookie("wikitree_wtb_UserName");
        myContext.userId = $.cookie("wikitree_wtb_UserID");
        startAppNow();
      }           
      else {      
        /* We're not yet logged in, but maybe we've been returned-to with an auth-code */ 
        var x = window.location.href.split('?');
        var queryParams = new URLSearchParams( x[1] );
        if (queryParams.has('authcode')) { 
          var authcode = queryParams.get('authcode');
          wikitree.session.clientLogin( {'authcode': authcode}  )
            .then(function() {  
              if (wikitree.session.loggedIn) { 
                /* If the auth-code was good, redirect back to ourselves without the authcode in the URL 
                 * (don't want it bookmarked, etc).  but do include the args
                 */
                window.location = localStorage.getItem("biocheck_url");
              } else {                      
                $('#need_login').show();        
                $('#logged_in').hide();         
              }                           
            });                     
          } else {        
            localStorage.setItem("biocheck_url", window.location.href);
            $('#need_login').show();
            $('#logged_in').hide();
          }               
        }           
      });     
    }
  });

function startAppNow () {
  $('#need_login').hide();
  $('#logged_in').show();
  $.removeCookie("biocheck_state");

  new Vue({

    el: '#app',

    components: { App },

    created() {
      // send args to the App
      myContext.urlParamString = window.location;
    },

    render: h => h('app', { props: { userContext: myContext }})
      }).$mount("#app");
  }
