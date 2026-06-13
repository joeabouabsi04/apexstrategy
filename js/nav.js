/* ============================================================
   APEXSTRATEGY — NAVIGATION COMPONENT
   Implemented as a Custom Element (Web Components API, no shadow
   DOM so shared CSS penetrates fully). Each page just drops
   <apex-nav></apex-nav> — no copy-paste, no drift between pages.

   Active page is detected from window.location.pathname
   automatically — no per-page data attribute required.
   ============================================================ */

//-- SECTION: NAVIGATION TEMPLATE --//

const NAV_TEMPLATE = /* html */ `
<nav class="apex-nav" role="navigation" aria-label="Main navigation">

  <div class="apex-nav-left">
    <!-- Brand -->
    <a href="index.html" class="apex-nav-brand" aria-label="ApexStrategy home">
      <span class="brand-apex">APEX</span><span class="brand-word">STRATEGY</span>
      <span class="brand-sep" aria-hidden="true">|</span>
      <span class="apex-mono text-muted" style="font-size:0.65rem;letter-spacing:0.08em;">v2.4.1</span>
    </a>

    <!-- Live status indicator -->
    <div class="apex-nav-status" aria-label="System status: online">
      <span class="status-dot status-live" aria-hidden="true"></span>
      <span class="apex-label" style="color:var(--neon);letter-spacing:0.12em;">SYSTEM ONLINE</span>
    </div>
  </div>

  <div class="apex-nav-right">
    <!-- Primary links -->
    <ul class="apex-nav-links" id="navLinks" role="list">
      <li role="listitem">
        <a href="index.html"
           class="apex-nav-link"
           data-page="home"
           aria-label="Command Center — home page">COMMAND CENTER</a>
      </li>
      <li role="listitem">
        <a href="workbench.html"
           class="apex-nav-link"
           data-page="workbench"
           aria-label="Workbench — setup analyzer">WORKBENCH</a>
      </li>
      <li role="listitem">
        <a href="handbook.html"
           class="apex-nav-link"
           data-page="handbook"
           aria-label="Handbook — engineering reference">HANDBOOK</a>
      </li>
    </ul>

    <!-- Mobile hamburger -->
    <button class="apex-nav-toggle" id="navToggle"
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded="false"
            aria-controls="navLinks">
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
  </div>

</nav>
`;

//-- SECTION: PAGE → FILE MAP --//

// Maps data-page values to filename fragments so the active link
// is detected from window.location.pathname without any per-page attribute.
const PAGE_MAP = {
  home: ["index.html", "/", ""],
  workbench: ["workbench.html"],
  handbook: ["handbook.html"],
};

//-- SECTION: NAVIGATIONCONTROLLER --//

class NavigationController {
  /**
   * @param {HTMLElement} root — the <apex-nav> custom element host,
   *                             or document.body for manual init.
   */
  constructor(root) {
    this._root = root;
    this._nav = root.querySelector(".apex-nav");
    this._links = root.querySelectorAll(".apex-nav-link");
    this._toggle = root.querySelector("#navToggle");
    this._linkList = root.querySelector("#navLinks");
    this._isOpen = false;
  }

  //-- Active page detection --//
  _detectActivePage() {
    const path = window.location.pathname.toLowerCase();
    // Extract just the filename from the full path
    const file = path.split("/").pop() || "index.html";

    for (const [page, patterns] of Object.entries(PAGE_MAP)) {
      if (
        patterns.some(
          (p) =>
            file === p ||
            (p === "" && file === "") ||
            (p === "/" && file === ""),
        )
      ) {
        return page;
      }
    }

    // Fallback: match by substring
    for (const [page, patterns] of Object.entries(PAGE_MAP)) {
      if (patterns.some((p) => path.includes(p.replace(".html", "")))) {
        return page;
      }
    }

    return "home"; // safe default
  }

  //-- Apply active class to matching link --//
  _setActiveLink() {
    const activePage = this._detectActivePage();

    this._links.forEach((link) => {
      const isActive = link.dataset.page === activePage;
      link.classList.toggle("active", isActive);
      link.setAttribute("aria-current", isActive ? "page" : "false");
    });
  }

  //-- Mobile menu: open --//
  _openMenu() {
    this._isOpen = true;
    this._linkList.classList.add("nav-open");
    this._nav.classList.add("nav-open");
    this._toggle.setAttribute("aria-expanded", "true");
    // Focus first link for keyboard nav
    const firstLink = this._linkList.querySelector(".apex-nav-link");
    if (firstLink) firstLink.focus();
  }

  //-- Mobile menu: close --//
  _closeMenu() {
    this._isOpen = false;
    this._linkList.classList.remove("nav-open");
    this._nav.classList.remove("nav-open");
    this._toggle.setAttribute("aria-expanded", "false");
  }

  //-- Toggle mobile menu --//
  _toggleMenu() {
    this._isOpen ? this._closeMenu() : this._openMenu();
  }

  //-- Wire up all event listeners --//
  _bindEvents() {
    // Hamburger click
    this._toggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._toggleMenu();
    });

    // Outside click closes the menu
    document.addEventListener("click", (e) => {
      if (this._isOpen && !this._nav.contains(e.target)) {
        this._closeMenu();
      }
    });

    // Escape key closes the menu
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isOpen) {
        this._closeMenu();
        this._toggle?.focus(); // return focus to trigger
      }
    });

    // Close on link click (mobile — the page navigates but state feels clean)
    this._links.forEach((link) => {
      link.addEventListener("click", () => {
        if (this._isOpen) this._closeMenu();
      });
    });
  }

  //-- Public init --//
  init() {
    this._setActiveLink();
    this._bindEvents();
  }
}

//-- SECTION: CUSTOM ELEMENT DEFINITION --//

/**
 * <apex-nav> — drop this tag anywhere and you get the full nav.
 *
 * Usage on every page (no other attributes needed):
 *   <apex-nav></apex-nav>
 *
 * No shadow DOM: inherits the shared style.css fully.
 * Active page auto-detected from window.location.pathname.
 */
class ApexNavElement extends HTMLElement {
  connectedCallback() {
    // Render HTML into the host element
    this.innerHTML = NAV_TEMPLATE;

    // Wire up behaviour
    this._controller = new NavigationController(this);
    this._controller.init();
  }

  disconnectedCallback() {
    // Nothing to tear down — event listeners on document
    // are acceptable here since there is exactly one <apex-nav> per page.
  }
}

// Register the custom element
customElements.define("apex-nav", ApexNavElement);

//-- SECTION: ADDITIONAL NAV CSS (injected once) --//
// These styles can't live in style.css cleanly because they need to target
// the flex layout split (.apex-nav-left / .apex-nav-right) that only the
// component knows about. Injected once, idempotent.

(function injectNavStyles() {
  if (document.getElementById("apex-nav-styles")) return;

  const style = document.createElement("style");
  style.id = "apex-nav-styles";
  style.textContent = `
    apex-nav {
      display: block;
    }

    .apex-nav-left {
      display:     flex;
      align-items: center;
      gap:         20px;
    }

    .apex-nav-status {
      display:     flex;
      align-items: center;
      padding:     0 12px;
      border-left: 1px solid var(--border);
      height:      28px;
      gap:         0;
    }

    /* Brand word in primary text, apex part is already .text-neon via span */
    .brand-word {
      color: var(--text-primary);
    }

    /* Keyboard shortcut hint strip — shown when user hits / or ? */
    .apex-keyhints {
      display:         none;
      position:        fixed;
      bottom:          16px;
      left:            50%;
      transform:       translateX(-50%);
      background:      var(--bg-panel);
      border:          1px solid var(--border);
      padding:         6px 16px;
      font-family:     var(--font-mono);
      font-size:       0.65rem;
      color:           var(--text-muted);
      letter-spacing:  0.1em;
      z-index:         2000;
      white-space:     nowrap;
      pointer-events:  none;
    }

    .apex-keyhints.visible {
      display: block;
    }

    .apex-keyhints kbd {
      color:       var(--text-secondary);
      margin:      0 4px;
      padding:     1px 5px;
      border:      1px solid var(--border);
      font-family: var(--font-mono);
      font-size:   0.6rem;
    }
  `;

  document.head.appendChild(style);
})();

//-- SECTION: GLOBAL KEYBOARD SHORTCUTS --//
// Documented in §5 of brief: / focuses search, R refetches, Escape clears.
// Lives here because it's navigation-layer UX, not page-specific logic.

class KeyboardShortcutController {
  constructor() {
    this._hintEl = null;
    this._hintTimer = null;
  }

  _showHint() {
    if (!this._hintEl) {
      this._hintEl = document.createElement("div");
      this._hintEl.className = "apex-keyhints";
      this._hintEl.setAttribute("aria-hidden", "true");
      this._hintEl.innerHTML = `<kbd>/</kbd> SEARCH &nbsp;|&nbsp; <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> TABS &nbsp;|&nbsp; <kbd>R</kbd> REFRESH &nbsp;|&nbsp; <kbd>ESC</kbd> CLOSE`;
      document.body.appendChild(this._hintEl);
    }
    this._hintEl.classList.add("visible");
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(
      () => this._hintEl?.classList.remove("visible"),
      2400,
    );
  }

  init() {
    document.addEventListener("keydown", (e) => {
      // Don't intercept when user is typing in an input
      const tag = document.activeElement?.tagName.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";

      if (e.key === "?" && !isInput) {
        this._showHint();
        return;
      }

      if (isInput) return;

      switch (e.key) {
        case "/": {
          e.preventDefault();
          const search = document.querySelector(".apex-search-bar");
          if (search) {
            search.focus();
            search.select();
          }
          break;
        }
        case "r":
        case "R": {
          // Pages that want R-to-refresh expose window.__apexRefetch
          if (typeof window.__apexRefetch === "function") {
            window.__apexRefetch();
          }
          break;
        }
        case "1":
        case "2":
        case "3": {
          // Pages that want number-key tab switching expose window.__apexSwitchTab
          if (typeof window.__apexSwitchTab === "function") {
            window.__apexSwitchTab(parseInt(e.key, 10) - 1);
          }
          break;
        }
      }
    });
  }
}

//-- SECTION: BOOT + EXPORT --//

document.addEventListener("DOMContentLoaded", () => {
  // Keyboard shortcuts — available on all pages
  new KeyboardShortcutController().init();
});

// Export classes so other scripts can extend if needed
window.NavigationController = NavigationController;
window.KeyboardShortcutController = KeyboardShortcutController;
