/* ============================================================
   APEXSTRATEGY — TAB CONTROLLER
   UNIQUE UI REQUIREMENT — custom ES6 tab navigation.
   Zero Bootstrap data-attributes. Zero jQuery. Pure DOM.

   Usage:
     const tabs = new TabController(
       '.workbench-nav',
       '.workbench-panes',
       tabName => console.log('switched to', tabName)
     );
     tabs.switchTo('tyres');     // programmatic
     tabs.disableTab('wet');     // conditional enable/disable
     tabs.destroy();             // cleanup on teardown

   HTML contract:
     Tabs:  <button class="workbench-tab" data-tab="overview" type="button">
     Panes: <div class="workbench-pane" data-pane="overview">
   ============================================================ */

/*-- SECTION: TABCONTROLLER CLASS --*/

class TabController {
  /**
   * @param {string}        navSelector   - CSS selector for the tab button container
   * @param {string}        panesSelector - CSS selector for the pane container
   * @param {Function|null} onSwitch      - Optional callback(tabName) fired after each switch
   */
  constructor(navSelector, panesSelector, onSwitch = null) {
    /** @type {Element|null} Tab button container element */
    this.nav = document.querySelector(navSelector);

    /** @type {Element|null} Pane wrapper element */
    this.panesContainer = document.querySelector(panesSelector);

    /** @type {Function|null} Caller-supplied post-switch hook */
    this.onSwitch = onSwitch;

    /** @type {string|null} slug of the currently active tab */
    this.activeTab = null;

    /** @type {Element[]} Ordered list of tab buttons */
    this.tabs = [];

    /** @type {Element[]} Ordered list of pane divs */
    this.panes = [];

    // Internal refs for listener cleanup
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

  /*-- SECTION: INIT --*/

  /**
   * Collects tab/pane elements, sets ARIA scaffolding, binds events, activates initial tab.
   */
  _init() {
    // Collect all [data-tab] buttons from the nav container
    this.tabs = Array.from(this.nav.querySelectorAll("[data-tab]"));

    // Collect all [data-pane] divs from the pane container
    this.panes = Array.from(
      this.panesContainer.querySelectorAll("[data-pane]"),
    );

    if (this.tabs.length === 0) {
      console.warn(
        "[TabController] No [data-tab] buttons found inside",
        this.nav,
      );
      return;
    }

    // ARIA scaffolding — role, controls, selected state
    this.nav.setAttribute("role", "tablist");

    this.tabs.forEach((tab) => {
      tab.setAttribute("role", "tab");
      tab.setAttribute("type", "button");
      tab.setAttribute("tabindex", "-1"); // only active tab is tabbable
      tab.setAttribute("aria-selected", "false");

      // Link each tab to its pane via aria-controls
      const tabName = tab.dataset.tab;
      const pane = this._findPane(tabName);
      if (pane) {
        const paneId = `apex-pane-${tabName}`;
        pane.setAttribute("id", paneId);
        pane.setAttribute("role", "tabpanel");
        pane.setAttribute("aria-labelledby", `apex-tab-${tabName}`);
        tab.setAttribute("id", `apex-tab-${tabName}`);
        tab.setAttribute("aria-controls", paneId);
      }
    });

    // Click delegation on nav container — one listener, not N
    this._clickHandler = (e) => {
      const btn = e.target.closest("[data-tab]");
      if (!btn) return;
      if (btn.classList.contains("tab-disabled")) return;
      this.switchTo(btn.dataset.tab);
    };
    this.nav.addEventListener("click", this._clickHandler);

    // Arrow-key navigation within the tablist (WCAG 4.1.2)
    this._keyHandler = (e) => this._handleKeyNav(e);
    this.nav.addEventListener("keydown", this._keyHandler);

    // Determine initial active tab:
    // honour an existing .tab-active on a button, otherwise default to first
    const preActive = this.tabs.find((t) => t.classList.contains("tab-active"));
    const initialTab = preActive?.dataset.tab ?? this.tabs[0]?.dataset.tab;
    if (initialTab) this.switchTo(initialTab);
  }

  /*-- SECTION: KEYBOARD NAVIGATION --*/

  /**
   * Handles ArrowLeft / ArrowRight / Home / End within the tablist.
   * @param {KeyboardEvent} e
   */
  _handleKeyNav(e) {
    const arrows = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!arrows.includes(e.key)) return;
    if (!document.activeElement?.closest("[data-tab]")) return;

    e.preventDefault();

    const enabledTabs = this.tabs.filter(
      (t) => !t.classList.contains("tab-disabled"),
    );
    if (enabledTabs.length === 0) return;

    const currentIndex = enabledTabs.findIndex(
      (t) => t.dataset.tab === this.activeTab,
    );
    let nextIndex;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % enabledTabs.length;
        break;
      case "ArrowLeft":
        nextIndex =
          (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = enabledTabs.length - 1;
        break;
    }

    const nextTab = enabledTabs[nextIndex];
    if (nextTab) {
      this.switchTo(nextTab.dataset.tab);
      nextTab.focus();
    }
  }

  /*-- SECTION: SWITCH --*/

  /**
   * Activates a tab by slug. No-ops if the tab is already active.
   * Applies wipe-in animation to the incoming pane, dispatches 'tabchange' event.
   * @param {string} tabName - The data-tab value to activate
   */
  switchTo(tabName) {
    if (tabName === this.activeTab) return;

    this.activeTab = tabName;

    // Update all tab buttons
    this.tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle("tab-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    // Update all panes
    this.panes.forEach((pane) => {
      const isActive = pane.dataset.pane === tabName;
      pane.classList.toggle("pane-active", isActive);

      if (isActive) {
        // Wipe-in animation: clip-path sweeps left→right, neon leading edge
        // Remove class first to force reflow so re-switching restarts animation
        pane.classList.remove("pane-wipe-enter");
        void pane.offsetWidth; // intentional reflow — restarts CSS animation
        pane.classList.add("pane-wipe-enter");

        // Clean up after animation so re-entry can restart cleanly
        pane.addEventListener(
          "animationend",
          () => pane.classList.remove("pane-wipe-enter"),
          { once: true },
        );
      }
    });

    // Broadcast so other controllers (e.g. WorkbenchController) can react
    this.nav.dispatchEvent(
      new CustomEvent("tabchange", {
        bubbles: true,
        cancelable: false,
        detail: { tab: tabName },
      }),
    );

    // Call the optional post-switch hook
    if (typeof this.onSwitch === "function") this.onSwitch(tabName);

    console.log(`[TabController] Active: ${tabName}`);
  }

  /*-- SECTION: ACCESSORS --*/

  /**
   * Returns the currently active tab slug.
   * @returns {string|null}
   */
  getActiveTab() {
    return this.activeTab;
  }

  /*-- SECTION: ENABLE / DISABLE --*/

  /**
   * Visually disables a tab and blocks interaction.
   * Used to grey out the WET STRATEGY tab under dry conditions.
   * @param {string} tabName
   */
  disableTab(tabName) {
    const tab = this._findTab(tabName);
    if (!tab) return;
    tab.classList.add("tab-disabled");
    tab.setAttribute("aria-disabled", "true");
    tab.setAttribute("tabindex", "-1");
  }

  /**
   * Re-enables a previously disabled tab.
   * @param {string} tabName
   */
  enableTab(tabName) {
    const tab = this._findTab(tabName);
    if (!tab) return;
    tab.classList.remove("tab-disabled");
    tab.removeAttribute("aria-disabled");
    // Tabindex restored properly on next switchTo call
  }

  /*-- SECTION: DESTROY --*/

  /**
   * Removes all event listeners. Call when the controller's host is unmounted.
   */
  destroy() {
    if (this._clickHandler) {
      this.nav.removeEventListener("click", this._clickHandler);
      this._clickHandler = null;
    }
    if (this._keyHandler) {
      this.nav.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }
    console.log("[TabController] Destroyed");
  }

  /*-- SECTION: PRIVATE HELPERS --*/

  /**
   * Finds a tab button by its data-tab value.
   * @param   {string}       tabName
   * @returns {Element|null}
   */
  _findTab(tabName) {
    return this.tabs.find((t) => t.dataset.tab === tabName) ?? null;
  }

  /**
   * Finds a pane element by its data-pane value.
   * @param   {string}       tabName
   * @returns {Element|null}
   */
  _findPane(tabName) {
    return this.panes.find((p) => p.dataset.pane === tabName) ?? null;
  }
}

/*-- SECTION: EXPORT --*/

window.TabController = TabController;
