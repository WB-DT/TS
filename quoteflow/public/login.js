const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#work-email");
const passwordInput = document.querySelector("#work-password");
const loginError = document.querySelector("#login-error");
const loginButton = document.querySelector("#login-submit");

fetch("/api/branding")
  .then((response) => response.ok ? response.json() : null)
  .then((branding) => {
    if (!branding) return;
    document.title = `${branding.companyName} | QuoteFlow`;
  })
  .catch(() => {});

for (const accountButton of document.querySelectorAll("[data-demo-email]")) {
  accountButton.addEventListener("click", () => {
    emailInput.value = accountButton.dataset.demoEmail;
    passwordInput.focus();
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;

  loginError.hidden = true;
  loginButton.disabled = true;
  loginButton.querySelector("span").textContent = "Signing in...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Sign-in failed. Try again.");
    window.location.assign(result.redirect);
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
    passwordInput.focus();
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector("span").textContent = "Sign in";
  }
});

// Sign in with Microsoft in the browser: MSAL, authorization code + PKCE, exactly like
// the original QuoteFlow SPA. The resulting Dataverse token is registered with the
// server so its OData queries run as this person.
const microsoftButton = document.querySelector("#microsoft-signin");
const loginDivider = document.querySelector("#login-divider");

function showLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

async function setUpMicrosoftSignIn() {
  const msal = window.QuoteFlowMsal;
  if (!msal) return;
  const config = await msal.config();
  if (!config.configured) {
    // Fallback: the older server-side Microsoft flow, when only that one is set up.
    const status = await fetch("/api/auth/microsoft/status")
      .then((response) => (response.ok ? response.json() : { configured: false }))
      .catch(() => ({ configured: false }));
    microsoftButton.hidden = !status.configured;
    return;
  }

  microsoftButton.hidden = false;
  loginDivider.hidden = false;
  microsoftButton.addEventListener("click", async (event) => {
    event.preventDefault();
    microsoftButton.setAttribute("aria-busy", "true");
    microsoftButton.querySelector("span").textContent = "Opening Microsoft...";
    try {
      await msal.signIn();
    } catch (error) {
      showLoginError(error.message);
      microsoftButton.removeAttribute("aria-busy");
      microsoftButton.querySelector("span").textContent = "Sign in with Microsoft";
    }
  });

  // Returning from Microsoft: finish the exchange, then open the workspace.
  try {
    const result = await msal.completeRedirect();
    if (result?.redirect) window.location.assign(result.redirect);
  } catch (error) {
    showLoginError(error.message);
  }
}

setUpMicrosoftSignIn();

const signInErrors = {
  "not-in-quoteflow": "Your Microsoft account isn't set up in QuoteFlow yet. Ask a manager to add your work email on the Users page.",
  "microsoft-cancelled": "Microsoft sign-in was cancelled.",
  "microsoft-expired": "That sign-in link expired. Please try again.",
  "microsoft-failed": "Microsoft sign-in didn't work. Please try again.",
  "microsoft-not-set-up": "Microsoft sign-in isn't set up yet.",
};
const signInError = new URLSearchParams(window.location.search).get("error");
if (signInErrors[signInError]) {
  loginError.textContent = signInErrors[signInError];
  loginError.hidden = false;
}