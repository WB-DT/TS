// Sign in with Microsoft, in the browser, then hand the Dataverse token to the server.
//
// Flow (the same one the original single-page QuoteFlow used):
//   1. The login page loads MSAL in the browser and calls loginRedirect().
//   2. Microsoft returns to /login with a code; the browser exchanges it for a
//      Dataverse token (public client, PKCE - no client secret anywhere).
//   3. The browser posts that token to /api/auth/dataverse/session below.
//   4. This module asks Dataverse WhoAmI who it is, matches the work email to a
//      QuoteFlow user, and starts the app session with the token stored server-side.
//
// Roles are still QuoteFlow's own: Microsoft sign-in proves who someone is, the
// Users page decides what they can see. Unknown emails are refused, not auto-created.
const dataverse = require("./dataverse");

function register(app, { database, safeUser, landingPath }) {
  // Everything the browser needs to start MSAL. Public values only.
  app.get("/api/auth/dataverse/config", (request, response) => {
    const config = dataverse.config();
    const origin = String(process.env.APP_ORIGIN || `${request.protocol}://${request.get("host")}`).replace(/\/+$/, "");
    response.set("Cache-Control", "no-store");
    response.json({
      configured: dataverse.isConfigured(),
      clientId: config.clientId,
      tenantId: config.tenantId,
      dataverseUrl: config.baseUrl,
      // The original SPA asked for exactly this scope.
      scope: `${config.baseUrl}/user_impersonation`,
      // Register this exact URL as the app registration's redirect URI.
      redirectUri: `${origin}/login`,
      signedIn: dataverse.signedIn(request.session),
    });
  });

  // Step 3/4: exchange the browser's Dataverse token for a QuoteFlow session.
  app.post("/api/auth/dataverse/session", async (request, response) => {
    const accessToken = String(request.body?.accessToken || "");
    if (!accessToken) {
      response.status(400).json({ error: "Microsoft sign-in did not return a Dataverse token." });
      return;
    }

    let identity;
    try {
      identity = await dataverse.identify({ dataverse: { accessToken } });
    } catch (error) {
      const status = Number(error.status) === 401 ? 401 : 502;
      response.status(status).json({
        error: status === 401
          ? "Microsoft signed you in, but Dataverse did not accept the token. Ask IT to grant the app Dataverse user_impersonation consent."
          : `QuoteFlow could not reach Dataverse: ${error.message}`,
        code: error.code || "dataverse-error",
      });
      return;
    }

    const record = identity.email ? await database.users.findActiveByEmail(identity.email) : null;
    if (!record || !record.roles.some((role) => role !== "Rep")) {
      console.log(`Microsoft sign-in: ${identity.email || "unknown account"} is not an active QuoteFlow user.`);
      response.status(403).json({
        error: identity.email
          ? `${identity.email} signed in to Microsoft but is not set up in QuoteFlow yet. Ask a manager to add your work email on the Users page.`
          : "Microsoft did not return a work email for that account.",
        code: "not-in-quoteflow",
        email: identity.email || null,
      });
      return;
    }
    await database.users.recordSignIn(record.id);

    request.session.regenerate((error) => {
      if (error) {
        response.status(500).json({ error: "QuoteFlow could not start your session. Try again." });
        return;
      }
      request.session.user = safeUser(record);
      // Held server-side so every OData query runs as this person.
      request.session.dataverse = {
        accessToken,
        expiresOn: Number(request.body?.expiresOn) || null,
        email: identity.email,
        name: identity.name,
        userId: identity.userId,
      };
      request.session.save((saveError) => {
        if (saveError) {
          response.status(500).json({ error: "QuoteFlow could not start your session. Try again." });
          return;
        }
        response.json({
          user: request.session.user,
          redirect: landingPath(request.session.user),
          dataverse: { email: identity.email, name: identity.name },
        });
      });
    });
  });

  // Silent token refresh from the browser (MSAL keeps the refresh token).
  app.post("/api/auth/dataverse/token", (request, response) => {
    const accessToken = String(request.body?.accessToken || "");
    if (!accessToken) {
      response.status(400).json({ error: "No Dataverse token was sent." });
      return;
    }
    if (!request.session?.user) {
      response.status(401).json({ error: "Sign in to continue." });
      return;
    }
    request.session.dataverse = {
      ...(request.session.dataverse || {}),
      accessToken,
      expiresOn: Number(request.body?.expiresOn) || null,
    };
    request.session.save((error) => {
      if (error) {
        response.status(500).json({ error: "The Dataverse token could not be refreshed." });
        return;
      }
      response.json({ ok: true });
    });
  });

  // Keeps the QuoteFlow session but drops the Dataverse token (used on sign-out
  // when the person stays signed in to Microsoft elsewhere).
  app.post("/api/auth/dataverse/disconnect", (request, response) => {
    if (!request.session) {
      response.json({ ok: true });
      return;
    }
    if (request.session.dataverse) request.session.dataverse = null;
    request.session.save((error) => {
      if (error) {
        response.status(500).json({ error: "The Dataverse token could not be cleared." });
        return;
      }
      response.json({ ok: true });
    });
  });
}

module.exports = { register };
