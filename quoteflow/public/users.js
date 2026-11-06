function initializeUsersPage() {
  const root = document.querySelector("#users-root");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  let users = [];
  let roles = [];
  let teams = [];
  let openUserId = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function installFieldHelp(definitions) {
    const byKey = new Map(definitions.map((definition) => [definition.key, definition]));
    for (const placeholder of root.querySelectorAll("[data-field-help]")) {
      const definition = byKey.get(placeholder.dataset.fieldHelp);
      if (!definition) continue;
      const id = `users-help-${definition.key}`;
      const label = escapeHtml(definition.label);
      const text = escapeHtml(definition.definition);
      placeholder.innerHTML = `<span class="field-help"><button class="info-button" type="button" aria-label="Definition of ${label}: ${text}" aria-describedby="${id}" aria-controls="${id}" aria-expanded="false"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.1" stroke="currentColor" stroke-width="1.4"/><path d="M10 9v4M10 6.4h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button><span class="field-tooltip" id="${id}" role="tooltip">${text}</span></span>`;
    }
  }

  function formatDateTime(epoch) {
    if (!epoch) return "Never";
    return new Date(Number(epoch) * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  }

  function statusBadge(active) {
    return active
      ? '<span class="status-pill status-pill--success">Active</span>'
      : '<span class="status-pill status-pill--error">Inactive</span>';
  }

  function teamBadge(team) {
    return `<span class="type-badge type-badge--${team === "MDM" ? "mdm" : "quote"}">${escapeHtml(team)}</span>`;
  }

  function rolePills(userRoles) {
    return userRoles.map((role) => `<span class="status-pill status-pill--info">${escapeHtml(role)}</span>`).join(" ");
  }

  function roleCheckboxes(checkedRoles) {
    return roles.map((role) => `<label class="role-checkbox"><input type="checkbox" name="roles" value="${escapeHtml(role)}"${checkedRoles.includes(role) ? " checked" : ""} /><span>${escapeHtml(role)}</span></label>`).join("");
  }

  // Managers can approve by default; the checkbox is only editable for Revisers.
  function syncCanApproveCheckbox(form) {
    const checkbox = form.querySelector("input[name='canApprove']");
    if (!checkbox) return;
    const selected = [...form.querySelectorAll("input[name='roles']:checked")].map((input) => input.value);
    if (selected.includes("Manager")) {
      checkbox.checked = true;
      checkbox.disabled = true;
    } else if (selected.includes("Reviser")) {
      checkbox.disabled = false;
    } else {
      checkbox.checked = false;
      checkbox.disabled = true;
    }
  }

  function bindCanApproveSync(form) {
    form.addEventListener("change", (event) => {
      if (event.target.matches("input[name='roles']")) syncCanApproveCheckbox(form);
    });
  }

  root.innerHTML = `
    <section class="items-section" aria-labelledby="users-title">
      <div class="items-heading"><div><h2 id="users-title">Users</h2><p class="section-description" id="users-count">Loading users…</p></div><span class="item-count">LIVE DATA</span></div>
      <div class="log-filters users-toolbar" role="group" aria-label="Search and filter users">
        <label for="users-search">Search <input id="users-search" type="search" placeholder="Name or email" autocomplete="off" /></label>
        <label for="users-filter-role">Role <select id="users-filter-role"><option value="">All roles</option></select></label>
        <label for="users-filter-status">Status <select id="users-filter-status"><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <span class="users-toolbar-action"><button class="secondary-button" id="add-user-toggle" type="button" aria-expanded="false" aria-controls="add-user-panel">Add a user</button></span>
      </div>
      <div class="table-scroll"><table class="users-table"><caption class="visually-hidden">All users</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Roles</th><th scope="col">Team</th><th scope="col">Status</th><th scope="col">Last sign-in</th></tr></thead>
        <tbody id="users-body"><tr><td colspan="6">Loading users…</td></tr></tbody>
      </table></div>
    </section>
    <section class="items-section" id="add-user-panel" aria-labelledby="add-user-title" hidden>
      <div class="items-heading"><div><h2 id="add-user-title">Add a user</h2><p class="section-description">New users sign in with the demo password. Users are never deleted, so their history stays.</p></div></div>
      <form id="add-user-form">
        <div class="request-fields-grid">
          <div class="request-field"><div class="field-heading"><label for="add-user-name">Name</label><span data-field-help="userName"></span></div><input id="add-user-name" name="name" type="text" maxlength="160" autocomplete="off" required /></div>
          <div class="request-field"><div class="field-heading"><label for="add-user-email">Work email</label><span data-field-help="userEmail"></span></div><input id="add-user-email" name="email" type="email" autocomplete="off" required /></div>
          <div class="request-field"><div class="field-heading"><label for="add-user-team">Team</label><span data-field-help="userTeam"></span></div><select id="add-user-team" name="team" required><option value="">Choose team</option></select></div>
          <div class="request-field request-field--wide"><fieldset class="role-checkboxes"><legend>Roles <span data-field-help="userRoles"></span></legend><div class="role-checkbox-grid" id="add-user-roles"></div></fieldset><small>One person can hold several roles.</small></div>
          <div class="request-field request-field--wide"><fieldset class="role-checkboxes"><legend>Permissions <span data-field-help="canApprove"></span></legend><div class="role-checkbox-grid"><label class="role-checkbox"><input type="checkbox" name="canApprove" disabled /><span>Can approve</span></label></div></fieldset><small>Managers can approve by default. A Manager can also give this permission to a Reviser.</small></div>
        </div>
        <div class="request-actions"><p class="request-feedback" id="add-user-feedback" role="status" aria-live="polite"></p><button class="analyze-button" type="submit"><span>Add user</span></button></div>
      </form>
    </section>
    <div class="quote-detail-panel" id="user-detail-panel" hidden></div>`;

  const searchInput = root.querySelector("#users-search");
  const roleFilter = root.querySelector("#users-filter-role");
  const statusFilter = root.querySelector("#users-filter-status");
  const count = root.querySelector("#users-count");
  const body = root.querySelector("#users-body");
  const addToggle = root.querySelector("#add-user-toggle");
  const addPanel = root.querySelector("#add-user-panel");
  const addForm = root.querySelector("#add-user-form");
  const addFeedback = root.querySelector("#add-user-feedback");
  const detailPanel = root.querySelector("#user-detail-panel");

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const role = roleFilter.value;
    const status = statusFilter.value;
    const visible = users.filter((user) => {
      const matchesQuery = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
      const matchesRole = !role || user.roles.includes(role);
      const matchesStatus = !status || (status === "active" ? user.active : !user.active);
      return matchesQuery && matchesRole && matchesStatus;
    });
    count.textContent = `${visible.length} of ${users.length} ${users.length === 1 ? "user" : "users"}`;
    body.innerHTML = visible.map((user) => `<tr class="quote-log-row" data-user-id="${escapeHtml(user.id)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(user.name)}">
      <td><strong class="quote-id">${escapeHtml(user.name)}</strong></td>
      <td>${escapeHtml(user.email)}</td>
      <td>${rolePills(user.roles)}</td>
      <td>${teamBadge(user.team)}</td>
      <td>${statusBadge(user.active)}</td>
      <td>${escapeHtml(formatDateTime(user.last_sign_in_at))}</td>
    </tr>`).join("") || '<tr><td colspan="6">No users match these filters.</td></tr>';
  }

  const AUDIT_FIELD_LABELS = { created: "User created", roles: "Roles", status: "Status", can_approve: "Can approve" };

  function renderUserDetail(user) {
    const auditRows = (user.audit || []).map((entry) => `<tr>
      <td>${escapeHtml(formatDateTime(entry.changedAt))}</td>
      <td>${escapeHtml(entry.changedByName || "System (MANAGER_EMAILS)")}</td>
      <td>${escapeHtml(AUDIT_FIELD_LABELS[entry.field] || entry.field)}</td>
      <td>${escapeHtml(entry.oldValue ?? "—")}</td>
      <td>${escapeHtml(entry.newValue ?? "—")}</td>
    </tr>`).join("");
    return `<div class="quote-detail" role="region" aria-label="User details for ${escapeHtml(user.name)}">
      <div class="items-heading"><div><h3>${escapeHtml(user.name)} ${statusBadge(user.active)}</h3><p class="section-description">${escapeHtml(user.email)} · ${escapeHtml(user.team)} · Last sign-in ${escapeHtml(formatDateTime(user.last_sign_in_at))}</p></div><button class="secondary-button" type="button" data-close-panel>Close</button></div>
      <form class="user-roles-form" data-user-id="${escapeHtml(user.id)}">
        <fieldset class="role-checkboxes"><legend>Roles <span data-field-help="userRoles"></span></legend><div class="role-checkbox-grid">${roleCheckboxes(user.roles)}</div></fieldset>
        <fieldset class="role-checkboxes user-permissions"><legend>Permissions <span data-field-help="canApprove"></span></legend><div class="role-checkbox-grid"><label class="role-checkbox"><input type="checkbox" name="canApprove"${user.roles.includes("Manager") || user.can_approve ? " checked" : ""}${user.roles.includes("Manager") || !user.roles.includes("Reviser") ? " disabled" : ""} /><span>Can approve</span></label></div><small class="checklist-hint">The person who revised a quote cannot also approve it.</small></fieldset>
        <div class="review-actions"><p class="screening-feedback" role="status" aria-live="polite"></p><button class="analyze-button" type="submit"><span>Save roles</span></button></div>
      </form>
      <div class="user-status-block">
        <p class="section-description">Deactivated users can't sign in. Their open quotes show on the Manager home dashboard as needing reassignment.</p>
        <p class="screening-feedback" role="status" aria-live="polite"></p>
        <button class="secondary-button user-status-toggle" type="button" data-user-id="${escapeHtml(user.id)}" data-active="${user.active}">${user.active ? "Deactivate user" : "Reactivate user"}</button>
      </div>
      <div class="detail-files"><h4>Change history</h4>
        <div class="table-scroll"><table class="users-table"><caption class="visually-hidden">Change history for ${escapeHtml(user.name)}</caption>
          <thead><tr><th scope="col">When</th><th scope="col">Changed by</th><th scope="col">Change</th><th scope="col">Old value</th><th scope="col">New value</th></tr></thead>
          <tbody>${auditRows || '<tr><td colspan="5">No changes recorded yet.</td></tr>'}</tbody>
        </table></div>
      </div>
    </div>`;
  }

  async function openUserDetail(userId, { scroll = true } = {}) {
    openUserId = userId;
    detailPanel.hidden = false;
    detailPanel.innerHTML = '<p class="section-description">Loading user…</p>';
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}`);
      const user = await response.json();
      if (!response.ok) throw new Error(user.error || "Could not load user.");
      detailPanel.innerHTML = renderUserDetail(user);
      installFieldHelp(detailFieldHelp);
      bindDetailPanel(user);
      if (scroll) detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      detailPanel.innerHTML = `<p class="section-description is-error">${escapeHtml(error.message)}</p>`;
    }
  }

  function bindDetailPanel(user) {
    detailPanel.querySelector("[data-close-panel]").addEventListener("click", () => {
      detailPanel.hidden = true;
      openUserId = null;
    });

    const rolesForm = detailPanel.querySelector(".user-roles-form");
    const rolesFeedback = rolesForm.querySelector(".screening-feedback");
    bindCanApproveSync(rolesForm);
    rolesForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selected = [...rolesForm.querySelectorAll("input[name='roles']:checked")].map((input) => input.value);
      if (!selected.length) {
        rolesFeedback.textContent = "Choose at least one role.";
        rolesFeedback.className = "screening-feedback is-error";
        return;
      }
      const canApproveInput = rolesForm.querySelector("input[name='canApprove']");
      const payload = { roles: selected };
      if (canApproveInput && !canApproveInput.disabled) payload.canApprove = canApproveInput.checked;
      const button = rolesForm.querySelector("button[type='submit']");
      button.disabled = true;
      rolesFeedback.textContent = "Saving…";
      rolesFeedback.className = "screening-feedback";
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(user.id)}/roles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Roles could not be saved.");
        await loadUsers();
        const freshFeedback = detailPanel.querySelector(".user-roles-form .screening-feedback");
        if (freshFeedback) {
          freshFeedback.textContent = "Roles saved.";
          freshFeedback.className = "screening-feedback is-success";
        }
      } catch (error) {
        rolesFeedback.textContent = error.message;
        rolesFeedback.className = "screening-feedback is-error";
        button.disabled = false;
      }
    });

    const statusButton = detailPanel.querySelector(".user-status-toggle");
    const statusFeedback = detailPanel.querySelector(".user-status-block .screening-feedback");
    statusButton.addEventListener("click", async () => {
      const nextActive = statusButton.dataset.active !== "true";
      statusButton.disabled = true;
      statusFeedback.textContent = nextActive ? "Reactivating…" : "Deactivating…";
      statusFeedback.className = "screening-feedback";
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(user.id)}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: nextActive }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Status could not be saved.");
        await loadUsers();
        const freshFeedback = detailPanel.querySelector(".user-status-block .screening-feedback");
        if (freshFeedback) {
          freshFeedback.textContent = nextActive ? "User reactivated." : "User deactivated.";
          freshFeedback.className = "screening-feedback is-success";
        }
      } catch (error) {
        statusFeedback.textContent = error.message;
        statusFeedback.className = "screening-feedback is-error";
        statusButton.disabled = false;
      }
    });
  }

  let detailFieldHelp = [];

  async function loadUsers() {
    const response = await fetch("/api/users");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Users could not be loaded.");
    users = payload.users || [];
    roles = payload.roles || [];
    teams = payload.teams || [];
    detailFieldHelp = payload.fieldHelp || [];
    installFieldHelp(detailFieldHelp);
    if (root.dataset.controlsReady !== "true") {
      root.dataset.controlsReady = "true";
      roleFilter.innerHTML = `<option value="">All roles</option>${roles.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join("")}`;
      addForm.elements.team.innerHTML = `<option value="">Choose team</option>${teams.map((team) => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`).join("")}`;
      root.querySelector("#add-user-roles").innerHTML = roleCheckboxes([]);
    }
    applyFilters();
    if (openUserId) await openUserDetail(openUserId, { scroll: false });
  }

  for (const control of [searchInput, roleFilter, statusFilter]) {
    control.addEventListener("input", applyFilters);
  }

  body.addEventListener("click", (event) => {
    const row = event.target.closest(".quote-log-row");
    if (row) openUserDetail(row.dataset.userId);
  });
  body.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest(".quote-log-row");
    if (row) {
      event.preventDefault();
      openUserDetail(row.dataset.userId);
    }
  });

  addToggle.addEventListener("click", () => {
    const show = addPanel.hidden;
    addPanel.hidden = !show;
    addToggle.setAttribute("aria-expanded", String(show));
    if (show) addForm.elements.name.focus();
  });

  bindCanApproveSync(addForm);

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = [...addForm.querySelectorAll("input[name='roles']:checked")].map((input) => input.value);
    if (!selected.length) {
      addFeedback.textContent = "Choose at least one role.";
      addFeedback.className = "request-feedback is-error";
      return;
    }
    const canApproveInput = addForm.querySelector("input[name='canApprove']");
    const button = addForm.querySelector("button[type='submit']");
    button.disabled = true;
    addFeedback.textContent = "Adding user…";
    addFeedback.className = "request-feedback";
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.elements.name.value,
          email: addForm.elements.email.value,
          team: addForm.elements.team.value,
          roles: selected,
          canApprove: Boolean(canApproveInput && !canApproveInput.disabled && canApproveInput.checked),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "User could not be added.");
      addFeedback.textContent = `${payload.name} was added.`;
      addFeedback.className = "request-feedback is-success";
      addForm.reset();
      await loadUsers();
    } catch (error) {
      addFeedback.textContent = error.message;
      addFeedback.className = "request-feedback is-error";
    } finally {
      button.disabled = false;
    }
  });

  loadUsers().catch((error) => {
    count.textContent = error.message;
    body.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
  });
}

document.addEventListener("workspace:ready", initializeUsersPage);
if (document.body.dataset.workspaceReady === "true") initializeUsersPage();
