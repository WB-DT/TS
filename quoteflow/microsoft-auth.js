// Sign in with Microsoft: company accounts through Entra ID.
// The app's IDs come from Codespaces secrets, never from this code.
// Signing in only proves who someone is; their QuoteFlow role still decides what they can see.
const crypto = require("node:crypto");
const msal = require("@azure/msal-node");

const config = {
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  redirectUri: process.env.AZURE_REDIRECT_URI,
};

// Read-only: who you are, plus reading files and SharePoint sites you can already open.
const SCOPES = ["openid", "profile", "email", "User.Read", "Files.Read.All", "Sites.Read.All"];

function isConfigured() {
  return Boolean(config.tenantId && config.clientId && config.clientSecret && config.redirectUri);
}

let client = null;
function getClient() {
  if (!client) {
    client = new msal.ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret,
      },
    });
  }
  return client;
}

function register(app, { database, safeUser, landingPath }) {
  // Lets the login page know whether to show the Microsoft button.
  app.get("/api/auth/microsoft/status", (_request, response) => {
    response.json({ configured: isConfigured() });
  });

  // Step 1: send the person to Microsoft's sign-in page.
  app.get("/auth/microsoft", async (request, response, next) => {
    if (!isConfigured()) {
      response.redirect("/login?error=microsoft-not-set-up");
      return;
    }
    try {
      const state = crypto.randomBytes(16).toString("hex");
      request.session.microsoftState = state;
      const url = await getClient().getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri: config.redirectUri,
        state,
        prompt: "select_account",
      });
      request.session.save((error) => (error ? next(error) : response.redirect(url)));
    } catch (error) {
      next(error);
    }
  });

  // Step 2: Microsoft sends them back here. Check it's really them, then find their QuoteFlow account.
  app.get("/auth/callback", async (request, response) => {
    const fail = (code) => response.redirect(`/login?error=${code}`);
    if (request.query.error) return fail("microsoft-cancelled");
    const expectedState = request.session?.microsoftState;
    if (!expectedState || request.query.state !== expectedState) return fail("microsoft-expired");
    delete request.session.microsoftState;

    let result;
    try {
      result = await getClient().acquireTokenByCode({
        code: String(request.query.code || ""),
        scopes: SCOPES,
        redirectUri: config.redirectUri,
      });
    } catch (error) {
      console.error("Microsoft sign-in failed:", error.errorCode || error.message);
      return fail("microsoft-failed");
    }

    const claims = result.idTokenClaims || {};
    const email = String(claims.preferred_username || claims.email || result.account?.username || "").trim().toLowerCase();
    const record = email ? await database.users.findActiveByEmail(email) : null;
    if (!record || !record.roles.some((role) => role !== "Rep")) {
      console.log(`Microsoft sign-in: ${email || "unknown account"} is not an active QuoteFlow user.`);
      return fail("not-in-quoteflow");
    }
    await database.users.recordSignIn(record.id);

    request.session.regenerate((error) => {
      if (error) return fail("microsoft-failed");
      request.session.user = safeUser(record);
      // Remembered so QuoteFlow can read the quote log as this person later.
      request.session.microsoftAccountId = result.account?.homeAccountId || null;
      request.session.save((saveError) => {
        if (saveError) return fail("microsoft-failed");
        response.redirect(landingPath(request.session.user));
      });
    });
  });
}

// Used in the next lesson: a read-only token for Microsoft Graph, for the signed-in person.
async function getGraphToken(session) {
  if (!isConfigured() || !session?.microsoftAccountId) return null;
  const account = await getClient().getTokenCache().getAccountByHomeId(session.microsoftAccountId);
  if (!account) return null;
  const result = await getClient().acquireTokenSilent({ account, scopes: ["Files.Read.All", "Sites.Read.All"] });
  return result.accessToken;
}

module.exports = { register, getGraphToken, isConfigured };