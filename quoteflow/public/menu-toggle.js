// Collapsible main menu: a button at the top of the sidebar (or the [ key) collapses the menu
// to icons only, so pages like the quote get the full width. The choice is remembered in this browser.

(function menuToggle() {
  const KEY = "quoteflow.menu";
  const read = () => { try { return localStorage.getItem(KEY) || "full"; } catch { return "full"; } };
  const write = (value) => { try { localStorage.setItem(KEY, value); } catch { /* private window: not remembered */ } };

  function apply(state) {
    document.documentElement.dataset.menu = state;
    const button = document.querySelector("#menu-toggle");
    if (button) {
      button.setAttribute("aria-expanded", String(state === "full"));
      button.setAttribute("aria-label", state === "full" ? "Collapse main menu" : "Expand main menu");
      button.title = `${state === "full" ? "Collapse" : "Expand"} menu ( [ )`;
    }
  }

  function toggle() {
    const next = document.documentElement.dataset.menu === "collapsed" ? "full" : "collapsed";
    write(next);
    apply(next);
  }

  document.documentElement.dataset.menu = read();
  document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar || document.querySelector("#menu-toggle")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "menu-toggle";
    button.className = "menu-toggle";
    button.innerHTML = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 5 7.5 10l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    button.addEventListener("click", toggle);
    sidebar.prepend(button);
    apply(read());
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "[" || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    toggle();
  });
})();
