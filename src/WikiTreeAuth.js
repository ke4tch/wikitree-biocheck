/*
 * Liberally stolen from 
 * wikitree-dynamic-tree tree.js WtLoginManager
 *
 * what is different?
 * - brings the cookie code from dynamic tree
 * - does not use WikiTreeAPI because it brings in other unneeded things
 * - looks for the old API cookies as backup for user login
 * - preserves the URL with any ?abc=xyz arguments
 * - provide the option to continue without logging in
 *
 * On WtLoginManager the document element wt-api-login is used for login
 * which is in the upper right corner does look like the rest of WikiTree
 * but if we change the look/feel of the app will users be upset?
 * what about the option to use the app without logging in
 *
 */

export default
class WikiTreeAuth {

  C_WT_USERNAME = "WikiTreeAPI_userName";
  C_WT_USER_ID = "WikiTreeAPI_userId";
  C_WT_START_URL = "WikiTreeAPI_startUrl";
  loginMessage = '';

  constructor(events = {}) {
    this.events = events;
    this.userName = null;
    this.userId = null;
    this.userName = this.cookie(this.C_WT_USERNAME) || null;
    this.userId = this.cookie(this.C_WT_USER_ID) || null;
    // if not logged in, fall back to old apps login
    if (!this.userName) {
      this.userName = this.cookie('wikitree_wtb_UserName') || null;
    }
    if (!this.userId) {
      this.userId = this.cookie('wikitree_wtb_UserID') || null;
    }
  }

  saveCookies() {
    this.cookie(this.C_WT_USERNAME, this.userName, { path: "/" });
    this.cookie(this.C_WT_USER_ID, this.userId, { path: "/" });
  }

  isLoggedIn() {
    return this.userName && this.userId;
  }

  getUserName() {
    return this.userName;
  }
  getUserId() {
    return this.userId;
  }

  // we save the starting url for the arguments
  restoreStartUrl() {
    history.replaceState("", "", localStorage.getItem(this.C_WT_START_URL));
  }

  getLoginMessage() {
    return this.loginMessage;
  }

  login() {
    const searchParams = new URLSearchParams(window.location.search);
    const authcode = searchParams.get("authcode") ? searchParams.get("authcode") : null;
    if (this.isLoggedIn()) {
      this.saveCookies();
      this.events?.onLoggedIn(this.userName);
    } else if (authcode) {
      // user is not logged in yet, but we've received authcode
      this.wikiTreeLogin({ action: "clientLogin", authcode: authcode });
    } else {
      localStorage.setItem(this.C_WT_START_URL, window.location.href);
      this.events?.onUnlogged();
    }
    return;
  }

  async wikiTreeLogin(loginData) {
    const API_URL = "https://api.wikitree.com/api.php";

    let formData = new FormData();
    for (var key in loginData) {
      formData.append(key, loginData[key]);
    }
    let options = {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(formData),
    };
    fetch(API_URL, options)
      .then((response) => {
        if (!response.ok) {
          this.loginMessage = 'login response ' + response.status + ': ' + response.statusText;
          console.log('login response ' + response.status + response.statusText);
          this.restoreStartUrl();
          throw new Error(`HTTP error! Status: ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((theJson) => {
        if (theJson.clientLogin.result === "Success") {
          this.userName = theJson.clientLogin.username;
          this.userId = theJson.clientLogin.userid;
          this.saveCookies();
          // In this case we need to force a window reload
          window.location.href = localStorage.getItem(this.C_WT_START_URL);
        }
      })
      .catch((error) => {
        console.error('Error: ', error);
        this.restoreStartUrl();
      });

  }
  cookie(key, value, options) {
    if (options === undefined) {
        options = {};
    }

    // If we have a value, we're writing/setting the cookie.
    if (value !== undefined) {
        if (value === null) {
            options.expires = -1;
        }
        if (typeof options.expires === "number") {
            var days = options.expires;
            options.expires = new Date();
            options.expires.setDate(options.expires.getDate() + days);
        }
        value = String(value);
        return (document.cookie = [
            encodeURIComponent(key),
            "=",
            value,
            options.expires ? "; expires=" + options.expires.toUTCString() : "",
            options.path ? "; path=" + options.path : "",
            options.domain ? "; domain=" + options.domain : "",
            options.secure ? "; secure" : "",
        ].join(""));
    }

    // We're not writing/setting the cookie, we're reading a value from it.
    var cookies = document.cookie.split("; ");

    var result = key ? null : {};
    for (var i = 0, l = cookies.length; i < l; i++) {
        var parts = cookies[i].split("=");
        var name = parts.shift();
        name = decodeURIComponent(name.replace(/\+/g, " "));
        let value = parts.join("=");
        value = decodeURIComponent(value.replace(/\+/g, " "));

        if (key && key === name) {
            result = value;
            break;
        }
        if (!key) {
            result[name] = value;
        }
    }
    return result;
  }
}
