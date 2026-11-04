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
