// Browser sign-in with Microsoft (MSAL) for QuoteFlow.
//
// Same flow as the original single-page QuoteFlow: authorization code + PKCE in the
// browser, token for <dataverse url>/user_impersonation, no client secret. The only
// difference is that the token is then registered with the QuoteFlow server
// (/api/auth/dataverse/session) so the server's OData queries run as this person.
//
// Public API: window.QuoteFlowMsal = { config, signIn, completeRedirect, token,
//   refreshServerToken, fetchWithRefresh, clear, account }.
(function () {
  const MSAL_SOURCE = "/vendor/msal-browser.min.js";
  let msalLoad = null;
  let configLoad = null;
  let appInstance = null;

  function loadMsal() {
    if (window.msal) return Promise.resolve(window.msal);
    if (msalLoad) return msalLoad;
    msalLoad = new Promise((resolve, reject) => {
      if (document.documentElement.dataset.msalError === "true") {
        reject(new Error("Microsoft sign-in could not load. Check the network or content-security settings."));
        return;
      }
      const script = document.createElement("script");
      script.src = MSAL_SOURCE;
      script.async = true;
      script.onload = () => {
        if (window.msal) resolve(window.msal);
        else reject(new Error("Microsoft sign-in could not load. Check the network or content-security settings."));
      };
      script.onerror = () => {
        document.documentElement.dataset.msalError = "true";
        reject(new Error("Microsoft sign-in could not load. Check the network or content-security settings."));
      };
      document.head.append(script);
    });
    return msalLoad;
  }

  function config() {
    if (!configLoad) {
      configLoad = fetch("/api/auth/dataverse/config", { headers: { Accept: "application/json" } })
        .then((response) => (response.ok ? response.json() : { configured: false }))
        .catch(() => ({ configured: false }));
    }
    return configLoad;
  }

  async function getApp() {
    if (appInstance) return appInstance;
    const [msalLib, settings] = await Promise.all([loadMsal(), config()]);
    if (!settings.configured) throw new Error("Microsoft sign-in is not set up for QuoteFlow yet.");
    const app = new msalLib.PublicClientApplication({
      auth: {
        clientId: settings.clientId,
        authority: `https://login.microsoftonline.com/${settings.tenantId}`,
        redirectUri: settings.redirectUri,
      },
      cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false },
    });
    // msal-browser 4+ requires initialize() before any other call.
    if (typeof app.initialize === "function") await app.initialize();
    appInstance = app;
    return app;
  }

  function activeAccount(app) {
    return app.getActiveAccount() || app.getAllAccounts()[0] || null;
  }

  async function account() {
    try {
      const app = await getApp();
      return activeAccount(app);
    } catch {
      return null;
    }
  }

  async function signIn() {
    const [app, settings] = await Promise.all([getApp(), config()]);
    await app.loginRedirect({ scopes: [settings.scope], prompt: "select_account" });
  }

  // Reads a token from the MSAL cache; `interactive` falls back to a popup.
  async function token({ interactive = false } = {}) {
    const [app, settings] = await Promise.all([getApp(), config()]);
    const signedInAccount = activeAccount(app);
    if (!signedInAccount) return null;
    try {
      const result = await app.acquireTokenSilent({ scopes: [settings.scope], account: signedInAccount });
      return { accessToken: result.accessToken, expiresOn: result.expiresOn ? result.expiresOn.getTime() : null, account: signedInAccount };
    } catch (error) {
      if (!interactive) return null;
      const result = await app.acquireTokenPopup({ scopes: [settings.scope], account: signedInAccount });
      return { accessToken: result.accessToken, expiresOn: result.expiresOn ? result.expiresOn.getTime() : null, account: signedInAccount };
    }
  }

  // Finishes a returning Microsoft sign-in and starts the QuoteFlow session.
  async function completeRedirect() {
    const settings = await config();
    if (!settings.configured) return null;
    const app = await getApp();
    const result = await app.handleRedirectPromise();
    const signedInAccount = result?.account || activeAccount(app);
    if (!signedInAccount) return null;
    app.setActiveAccount(signedInAccount);
    const accessToken = result?.accessToken || (await token())?.accessToken;
    if (!accessToken) {
      throw new Error("Microsoft signed you in but did not return a Dataverse token. Ask IT to consent the app for Dataverse.");
    }
    const response = await fetch("/api/auth/dataverse/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        expiresOn: result?.expiresOn ? result.expiresOn.getTime() : null,
        accountName: signedInAccount.name || "",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "QuoteFlow could not finish the Microsoft sign-in.");
    return payload;
  }

  // Sends a fresh token to the server after a Dataverse 401.
  async function refreshServerToken() {
    const fresh = await token({ interactive: true }).catch(() => null);
    if (!fresh?.accessToken) return false;
    const response = await fetch("/api/auth/dataverse/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: fresh.accessToken, expiresOn: fresh.expiresOn }),
    });
    return response.ok;
  }

  // fetch() that retries once with a refreshed Dataverse token. Server routes that
  // read Dataverse answer 401 + code "dataverse-token-expired" when the token aged out.
  async function fetchWithRefresh(url, options = {}, retried = false) {
    const response = await fetch(url, options);
    if (response.status !== 401 || retried) return response;
    let code = "";
    try {
      code = (await response.clone().json())?.code || "";
    } catch {
      code = "";
    }
    if (code !== "dataverse-token-expired") return response;
    if (!(await refreshServerToken())) return response;
    return fetch(url, options);
  }

  async function clear() {
    try {
      await fetch("/api/auth/dataverse/disconnect", { method: "POST" });
    } catch {
      /* the server session is cleared by /api/auth/logout anyway */
    }
    try {
      const app = await getApp();
      const signedInAccount = activeAccount(app);
      if (!signedInAccount) return;
      if (typeof app.clearCache === "function") await app.clearCache();
      if (typeof app.logoutRedirect === "function") {
        await app.logoutRedirect({ account: signedInAccount, onRedirectNavigate: () => false });
      }
    } catch {
      /* no MSAL session to clear */
    }
  }

  window.QuoteFlowMsal = { account, clear, completeRedirect, config, fetchWithRefresh, refreshServerToken, signIn, token };
})();
