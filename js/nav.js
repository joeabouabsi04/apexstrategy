/* ============================================================
   APEXSTRATEGY — NAVIGATION  (ES6 module)
   Import this file for its side effects:
     • Registers the <apex-nav> Custom Element
     • Injects scoped nav CSS
     • Starts keyboard shortcut listener
   ============================================================ */

/*-- SECTION: SVG LOGO --*/

const LOGO_SVG = /* html */ `
<svg viewBox="0 0 222 38" xmlns="http://www.w3.org/2000/svg"
     height="34" aria-hidden="true" focusable="false"
     style="display:block;flex-shrink:0;overflow:visible;">
  <polygon style="fill:var(--neon)" points="1,38 12,38 20,2 9,2"/>
  <polygon style="fill:var(--neon)" points="12,25 28,25 27,20 11,20"/>
  <polygon style="fill:var(--neon)" points="16,38 20,38 48,2 44,2"/>
  <rect style="fill:var(--neon)"            x="50" y="0"  width="4" height="4"/>
  <rect style="fill:var(--neon)"            x="55" y="0"  width="4" height="4"/>
  <rect style="fill:var(--neon);opacity:.68" x="50" y="6"  width="3" height="3"/>
  <rect style="fill:var(--neon);opacity:.68" x="55" y="6"  width="3" height="3"/>
  <rect style="fill:var(--neon);opacity:.60" x="60" y="2"  width="3" height="3"/>
  <rect style="fill:var(--neon);opacity:.40" x="52" y="12" width="3" height="3"/>
  <rect style="fill:var(--neon);opacity:.38" x="57" y="10" width="2" height="2"/>
  <rect style="fill:var(--neon);opacity:.35" x="62" y="7"  width="3" height="3"/>
  <rect style="fill:var(--neon);opacity:.33" x="61" y="1"  width="2" height="2"/>
  <rect style="fill:var(--neon);opacity:.20" x="55" y="18" width="2" height="2"/>
  <rect style="fill:var(--neon);opacity:.18" x="60" y="16" width="2" height="2"/>
  <rect style="fill:var(--neon);opacity:.16" x="65" y="12" width="2" height="2"/>
  <rect style="fill:var(--neon);opacity:.10" x="68" y="9"  width="1" height="1"/>
  <line x1="76" y1="7" x2="76" y2="31" style="stroke:var(--border)" stroke-width="1"/>
  <text x="82" y="26" style="font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:18px;letter-spacing:2.5px">
    <tspan style="fill:var(--neon)">APEX</tspan><tspan style="fill:var(--text-primary)">STRATEGY</tspan>
  </text>
</svg>`;

/*-- SECTION: NAV TEMPLATE --*/

const NAV_TEMPLATE = /* html */ `
<nav class="apex-nav" role="navigation" aria-label="Main navigation">
  <div class="apex-nav-left">
    <a href="index.html" class="apex-nav-brand" aria-label="ApexStrategy — Command Center">
      ${LOGO_SVG}
    </a>
    <div class="apex-nav-status" aria-label="System status: online">
      <span class="status-dot status-live" aria-hidden="true"></span>
      <span class="apex-label apex-nav-status-label">SYSTEM ONLINE</span>
    </div>
  </div>
  <div class="apex-nav-right">
    <button class="apex-theme-toggle" id="themeToggle" type="button"
            aria-label="Switch to light mode" aria-pressed="false">
      <svg class="theme-icon theme-icon-moon" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
        <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" style="fill:var(--text-secondary)"/>
      </svg>
      <svg class="theme-icon theme-icon-sun" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" style="display:none">
        <circle cx="8" cy="8" r="3.5" style="fill:var(--text-secondary)"/>
        <g style="stroke:var(--text-secondary);stroke-width:1.2">
          <line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/>
          <line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/>
          <line x1="3.2" y1="3.2" x2="4.6" y2="4.6"/><line x1="11.4" y1="11.4" x2="12.8" y2="12.8"/>
          <line x1="12.8" y1="3.2" x2="11.4" y2="4.6"/><line x1="4.6" y1="11.4" x2="3.2" y2="12.8"/>
        </g>
      </svg>
    </button>
    <ul class="apex-nav-links" id="navLinks" role="list">
      <li role="listitem"><a href="index.html"     class="apex-nav-link" data-page="home"      aria-label="Command Center">COMMAND CENTER</a></li>
      <li role="listitem"><a href="workbench.html" class="apex-nav-link" data-page="workbench" aria-label="Workbench">WORKBENCH</a></li>
      <li role="listitem"><a href="handbook.html"  class="apex-nav-link" data-page="handbook"  aria-label="Handbook">HANDBOOK</a></li>
    </ul>
    <button class="apex-nav-toggle" id="navToggle" type="button"
            aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="navLinks">
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
  </div>
</nav>`;

/*-- SECTION: PAGE MAP --*/

const PAGE_MAP = {
  home: ["index.html", "/", ""],
  workbench: ["workbench.html"],
  handbook: ["handbook.html"],
};

/*-- SECTION: NAVIGATION CONTROLLER --*/

export class NavigationController {
  constructor(root) {
    this._root = root;
    this._nav = root.querySelector(".apex-nav");
    this._links = root.querySelectorAll(".apex-nav-link");
    this._toggle = root.querySelector("#navToggle");
    this._linkList = root.querySelector("#navLinks");
    this._themBtn = root.querySelector("#themeToggle");
    this._isOpen = false;
  }

  _detectActivePage() {
    const file =
      window.location.pathname.toLowerCase().split("/").pop() || "index.html";
    for (const [page, patterns] of Object.entries(PAGE_MAP)) {
      if (patterns.some((p) => file === p || (!p && !file))) return page;
    }
    for (const [page, patterns] of Object.entries(PAGE_MAP)) {
      if (
        patterns.some(
          (p) =>
            p &&
            window.location.pathname
              .toLowerCase()
              .includes(p.replace(".html", "")),
        )
      )
        return page;
    }
    return "home";
  }

  _setActiveLink() {
    const active = this._detectActivePage();
    this._links.forEach((l) => {
      const is = l.dataset.page === active;
      l.classList.toggle("active", is);
      l.setAttribute("aria-current", is ? "page" : "false");
    });
  }

  _initTheme() {
    this._applyTheme(localStorage.getItem("apexTheme") ?? "dark", false);
  }

  _applyTheme(theme, animate = true) {
    const html = document.documentElement;
    theme === "light"
      ? html.setAttribute("data-theme", "light")
      : html.removeAttribute("data-theme");
    localStorage.setItem("apexTheme", theme);
    this._syncThemeButton(theme);
    if (animate) {
      html.classList.add("theme-switching");
      setTimeout(() => html.classList.remove("theme-switching"), 220);
    }
  }

  _syncThemeButton(theme) {
    const btn = this._themBtn;
    if (!btn) return;
    const moon = btn.querySelector(".theme-icon-moon");
    const sun = btn.querySelector(".theme-icon-sun");
    const light = theme === "light";
    btn.setAttribute("aria-pressed", light ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      light ? "Switch to dark mode" : "Switch to light mode",
    );
    if (moon) moon.style.display = light ? "none" : "block";
    if (sun) sun.style.display = light ? "block" : "none";
  }

  _toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") ?? "dark";
    this._applyTheme(cur === "light" ? "dark" : "light");
  }

  _openMenu() {
    this._isOpen = true;
    this._linkList.classList.add("nav-open");
    this._nav.classList.add("nav-open");
    this._toggle.setAttribute("aria-expanded", "true");
    this._linkList.querySelector(".apex-nav-link")?.focus();
  }
  _closeMenu() {
    this._isOpen = false;
    this._linkList.classList.remove("nav-open");
    this._nav.classList.remove("nav-open");
    this._toggle.setAttribute("aria-expanded", "false");
  }
  _toggleMenu() {
    this._isOpen ? this._closeMenu() : this._openMenu();
  }

  _bindEvents() {
    this._toggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._toggleMenu();
    });
    this._themBtn?.addEventListener("click", () => this._toggleTheme());
    document.addEventListener("click", (e) => {
      if (this._isOpen && !this._nav.contains(e.target)) this._closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isOpen) {
        this._closeMenu();
        this._toggle?.focus();
      }
    });
    this._links.forEach((l) =>
      l.addEventListener("click", () => {
        if (this._isOpen) this._closeMenu();
      }),
    );
  }

  init() {
    this._initTheme();
    this._setActiveLink();
    this._bindEvents();
  }
}

/*-- SECTION: CUSTOM ELEMENT --*/

export class ApexNavElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = NAV_TEMPLATE;
    new NavigationController(this).init();
  }
}

/*-- SECTION: KEYBOARD SHORTCUTS --*/

export class KeyboardShortcutController {
  constructor() {
    this._hintEl = null;
    this._hintTimer = null;
  }

  _showHint() {
    if (!this._hintEl) {
      this._hintEl = Object.assign(document.createElement("div"), {
        className: "apex-keyhints",
        setAttribute: undefined,
      });
      this._hintEl.className = "apex-keyhints";
      this._hintEl.setAttribute("aria-hidden", "true");
      this._hintEl.innerHTML = `<kbd>/</kbd> SEARCH &nbsp;|&nbsp; <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> TABS &nbsp;|&nbsp; <kbd>R</kbd> REFRESH &nbsp;|&nbsp; <kbd>?</kbd> THIS`;
      document.body.appendChild(this._hintEl);
    }
    this._hintEl.classList.add("visible");
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(
      () => this._hintEl?.classList.remove("visible"),
      2800,
    );
  }

  init() {
    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      const isInput = ["input", "textarea", "select"].includes(tag);
      if (e.key === "?" && !isInput) {
        this._showHint();
        return;
      }
      if (isInput) return;
      switch (e.key) {
        case "/":
          e.preventDefault();
          document.querySelector(".apex-search-bar")?.focus();
          break;
        case "r":
        case "R":
          document.dispatchEvent(new CustomEvent("apex:refetch"));
          break;
        case "1":
        case "2":
        case "3":
          document.dispatchEvent(
            new CustomEvent("apex:switchTab", {
              detail: { index: parseInt(e.key, 10) - 1 },
            }),
          );
          break;
      }
    });
  }
}

/*-- SECTION: INJECTED STYLES --*/

function injectNavStyles() {
  if (document.getElementById("apex-nav-styles")) return;
  const s = document.createElement("style");
  s.id = "apex-nav-styles";
  s.textContent = `
    apex-nav { display: block; }
    .apex-nav-left { display:flex; align-items:center; gap:16px; }
    .apex-nav-brand { display:flex; align-items:center; line-height:1; }
    .apex-nav-status { display:flex; align-items:center; padding:0 14px; border-left:1px solid var(--border); height:28px; }
    .apex-nav-status-label { color:var(--neon); letter-spacing:0.12em; font-size:0.65rem; }
    .apex-theme-toggle { display:flex; align-items:center; justify-content:center; width:30px; height:30px; border:1px solid var(--border); background:transparent; cursor:pointer; transition:border-color 120ms,opacity 120ms; flex-shrink:0; }
    .apex-theme-toggle:hover { border-color:var(--neon); }
    .apex-theme-toggle:hover svg path, .apex-theme-toggle:hover svg circle, .apex-theme-toggle:hover svg line { fill:var(--neon)!important; stroke:var(--neon)!important; }
    .apex-keyhints { display:none; position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:var(--bg-panel); border:1px solid var(--border); padding:6px 16px; font-family:var(--font-mono); font-size:0.65rem; color:var(--text-muted); letter-spacing:0.1em; z-index:2000; white-space:nowrap; pointer-events:none; }
    .apex-keyhints.visible { display:block; }
    .apex-keyhints kbd { color:var(--text-secondary); margin:0 4px; padding:1px 5px; border:1px solid var(--border); font-family:var(--font-mono); font-size:0.6rem; }
    html.theme-switching * { transition:background-color 180ms ease-out,border-color 140ms ease-out,color 100ms ease-out!important; }
    @media(max-width:380px){ .apex-nav-brand svg{ width:46px;overflow:hidden; } }
    @media(max-width:480px){ .apex-nav-status{ display:none; } }
  `;
  document.head.appendChild(s);
}

/*-- SECTION: MODULE SIDE EFFECTS --*/
// These run once when the module is first imported.

injectNavStyles();
customElements.define("apex-nav", ApexNavElement);
new KeyboardShortcutController().init();
