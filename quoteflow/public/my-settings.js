// My settings: each person's screen brightness (theme) and text size.
// Choices are saved to their account, so they follow them on any computer.

const DISPLAY_STORAGE_KEY = "quoteflow.display";

// Changes how the page looks right now (does not save anything).
function previewDisplaySettings({ theme, textSize }) {
  const root = document.documentElement;
  if (theme && theme !== "light") root.dataset.theme = theme;
  else delete root.dataset.theme;
  if (textSize && textSize !== "standard") root.dataset.textSize = textSize;
  else delete root.dataset.textSize;
}

function rememberOnThisComputer(settings) {
  try {
    localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function lastSavedOnThisComputer() {
  try {
    return JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

// Open every page in the person's look straight away (no flash of Light).
previewDisplaySettings(lastSavedOnThisComputer());

// Ask the server for the person's saved choices and apply them.
async function loadDisplaySettings() {
  const local = lastSavedOnThisComputer();
  try {
    const response = await fetch("/api/settings");
    if (!response.ok) throw new Error("Settings could not be loaded.");
    const { personal } = await response.json();
    const settings = {
      theme: personal?.display_theme || local.theme || "light",
      textSize: personal?.display_text_size || local.textSize || "standard",
    };
    previewDisplaySettings(settings);
    rememberOnThisComputer(settings);
    return settings;
  } catch {
    return { theme: local.theme || "light", textSize: local.textSize || "standard" };
  }
}

async function initializeMySettings() {
  const saved = await loadDisplaySettings();
  const form = document.querySelector("#my-settings-form");
  if (!form || form.dataset.initialized === "true") return;
  form.dataset.initialized = "true";

  const status = document.querySelector("#my-settings-status");
  const saveButton = document.querySelector("#my-settings-save");

  form.elements.theme.value = saved.theme;
  form.elements.textSize.value = saved.textSize;

  function chosen() {
    return { theme: form.elements.theme.value, textSize: form.elements.textSize.value };
  }

  // Clicking an option previews it; nothing is saved until "Save changes".
  form.addEventListener("change", () => {
    previewDisplaySettings(chosen());
    status.className = "request-feedback";
    status.textContent = "Previewing. Click Save changes to keep this look.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = chosen();
    saveButton.disabled = true;
    status.className = "request-feedback";
    status.textContent = "Saving…";
    try {
      const response = await fetch("/api/settings/personal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_theme: settings.theme, display_text_size: settings.textSize }),
      });
      const stored = response.ok ? await response.json() : {};
      // Double-check the server really stored both values.
      if (stored.display_theme !== settings.theme || stored.display_text_size !== settings.textSize) {
        throw new Error("The server did not save the settings.");
      }
      rememberOnThisComputer(settings);
      status.className = "request-feedback is-success";
      status.textContent = "Saved. This look will follow you on any computer.";
    } catch {
      status.className = "request-feedback is-error";
      status.textContent = "Could not save. Please try again.";
    } finally {
      saveButton.disabled = false;
    }
  });
}

document.addEventListener("workspace:ready", initializeMySettings);
if (document.body.dataset.workspaceReady === "true") initializeMySettings();