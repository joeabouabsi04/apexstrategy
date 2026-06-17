/* ============================================================
   APEXSTRATEGY — TAB CONTROLLER  (ES6 module)
   No dependencies. Import and instantiate directly.
   ============================================================ */

const COMPASS_16 = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];
const WIND_ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];

export class TabController {
  constructor(navSelector, panesSelector, onSwitch = null) {
    this.nav = document.querySelector(navSelector);
    this.panesContainer = document.querySelector(panesSelector);
    this.onSwitch = onSwitch;
    this.activeTab = null;
    this.tabs = [];
    this.panes = [];
    this._clickHandler = null;
    this._keyHandler = null;

    if (!this.nav || !this.panesContainer) {
      console.warn(
        "[TabController] Selectors not found:",
        navSelector,
        panesSelector,
      );
      return;
    }
    this._init();
  }

  _init() {
    this.tabs = Array.from(this.nav.querySelectorAll("[data-tab]"));
    this.panes = Array.from(
      this.panesContainer.querySelectorAll("[data-pane]"),
    );
    if (!this.tabs.length) return;

    this.nav.setAttribute("role", "tablist");
    this.tabs.forEach((tab) => {
      tab.setAttribute("role", "tab");
      tab.setAttribute("type", "button");
      tab.setAttribute("tabindex", "-1");
      tab.setAttribute("aria-selected", "false");
      const pane = this._findPane(tab.dataset.tab);
      if (pane) {
        const pid = `apex-pane-${tab.dataset.tab}`;
        pane.id = pid;
        pane.setAttribute("role", "tabpanel");
        tab.setAttribute("id", `apex-tab-${tab.dataset.tab}`);
        tab.setAttribute("aria-controls", pid);
        pane.setAttribute("aria-labelledby", `apex-tab-${tab.dataset.tab}`);
      }
    });

    this._clickHandler = (e) => {
      const btn = e.target.closest("[data-tab]");
      if (!btn || btn.classList.contains("tab-disabled")) return;
      this.switchTo(btn.dataset.tab);
    };
    this.nav.addEventListener("click", this._clickHandler);

    this._keyHandler = (e) => this._handleKeyNav(e);
    this.nav.addEventListener("keydown", this._keyHandler);

    const pre = this.tabs.find((t) => t.classList.contains("tab-active"));
    const init = pre?.dataset.tab ?? this.tabs[0]?.dataset.tab;
    if (init) this.switchTo(init);
  }

  _handleKeyNav(e) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    if (!document.activeElement?.closest("[data-tab]")) return;
    e.preventDefault();
    const enabled = this.tabs.filter(
      (t) => !t.classList.contains("tab-disabled"),
    );
    if (!enabled.length) return;
    const ci = enabled.findIndex((t) => t.dataset.tab === this.activeTab);
    let ni;
    switch (e.key) {
      case "ArrowRight":
        ni = (ci + 1) % enabled.length;
        break;
      case "ArrowLeft":
        ni = (ci - 1 + enabled.length) % enabled.length;
        break;
      case "Home":
        ni = 0;
        break;
      case "End":
        ni = enabled.length - 1;
        break;
    }
    const next = enabled[ni];
    if (next) {
      this.switchTo(next.dataset.tab);
      next.focus();
    }
  }

  /** Activate a tab by slug. No-ops if already active. */
  switchTo(tabName) {
    if (tabName === this.activeTab) return;
    this.activeTab = tabName;

    this.tabs.forEach((t) => {
      const a = t.dataset.tab === tabName;
      t.classList.toggle("tab-active", a);
      t.setAttribute("aria-selected", a ? "true" : "false");
      t.setAttribute("tabindex", a ? "0" : "-1");
    });

    this.panes.forEach((p) => {
      const a = p.dataset.pane === tabName;
      p.classList.toggle("pane-active", a);
      if (a) {
        p.classList.remove("pane-wipe-enter");
        void p.offsetWidth;
        p.classList.add("pane-wipe-enter");
        p.addEventListener(
          "animationend",
          () => p.classList.remove("pane-wipe-enter"),
          { once: true },
        );
      }
    });

    this.nav.dispatchEvent(
      new CustomEvent("tabchange", { bubbles: true, detail: { tab: tabName } }),
    );
    this.onSwitch?.(tabName);
    console.log(`[TabController] Active: ${tabName}`);
  }

  /** @returns {string|null} Active tab slug */
  getActiveTab() {
    return this.activeTab;
  }

  /** Disable a tab button — used for WET tab under dry conditions */
  disableTab(tabName) {
    const t = this._findTab(tabName);
    if (!t) return;
    t.classList.add("tab-disabled");
    t.setAttribute("aria-disabled", "true");
    t.setAttribute("tabindex", "-1");
  }

  /** Re-enable a disabled tab */
  enableTab(tabName) {
    const t = this._findTab(tabName);
    if (!t) return;
    t.classList.remove("tab-disabled");
    t.removeAttribute("aria-disabled");
  }

  /** Remove all event listeners */
  destroy() {
    if (this._clickHandler)
      this.nav.removeEventListener("click", this._clickHandler);
    if (this._keyHandler)
      this.nav.removeEventListener("keydown", this._keyHandler);
    this._clickHandler = this._keyHandler = null;
  }

  _findTab(n) {
    return this.tabs.find((t) => t.dataset.tab === n) ?? null;
  }
  _findPane(n) {
    return this.panes.find((p) => p.dataset.pane === n) ?? null;
  }
}
