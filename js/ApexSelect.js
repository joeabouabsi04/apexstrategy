/* ============================================================
   APEXSTRATEGY — APEX SELECT  (ES6 module)
   Custom themed dropdown. Native <option> popups cannot be
   styled with CSS (the OS/browser draws them), so this class
   progressively enhances every `select.apex-select`:

     • The native select is hidden but stays in the DOM as the
       single source of truth for the current value.
     • A pill button + themed listbox panel replace it visually,
       following the site's design tokens (dark AND light mode).
     • Choosing an option writes select.value and dispatches a
       native "change" event, so existing controller listeners
       (HomeController filters/sort, workbench picker) work
       completely unchanged.
     • Full keyboard support: Enter/Space/ArrowDown open,
       Arrow keys + Home/End navigate, Enter selects, Esc closes.
       ARIA listbox/option roles throughout.
   ============================================================ */

const CHEVRON_SVG = /* html */ `
  <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true" focusable="false">
    <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor"
          stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

export class ApexSelect {
  /**
   * Enhance every un-enhanced `select.apex-select` under root.
   * Safe to call repeatedly (e.g. after injecting new markup).
   */
  static enhance(root = document) {
    root
      .querySelectorAll("select.apex-select:not([data-enhanced])")
      .forEach((s) => new ApexSelect(s));
  }

  constructor(select) {
    this._select = select;
    this._isOpen = false;
    this._build();
    this._bind();
  }

  /*-- BUILD --*/

  _build() {
    const s = this._select;
    s.dataset.enhanced = "true";

    this._wrap = document.createElement("div");
    this._wrap.className = "apex-select-wrap";

    this._btn = document.createElement("button");
    this._btn.type = "button";
    this._btn.className = "apex-select-btn";
    this._btn.setAttribute("aria-haspopup", "listbox");
    this._btn.setAttribute("aria-expanded", "false");
    const label = s.getAttribute("aria-label");
    if (label) this._btn.setAttribute("aria-label", label);

    this._value = document.createElement("span");
    this._value.className = "apex-select-value";
    this._btn.appendChild(this._value);
    this._btn.insertAdjacentHTML("beforeend", CHEVRON_SVG);

    this._menu = document.createElement("ul");
    this._menu.className = "apex-select-menu";
    this._menu.setAttribute("role", "listbox");

    this._items = [...s.options].map((opt) => {
      const li = document.createElement("li");
      li.className = "apex-select-option";
      li.setAttribute("role", "option");
      li.dataset.value = opt.value;
      li.textContent = opt.textContent.trim();
      li.tabIndex = -1;
      this._menu.appendChild(li);
      return li;
    });

    s.insertAdjacentElement("afterend", this._wrap);
    this._wrap.appendChild(this._btn);
    this._wrap.appendChild(this._menu);
    this._syncFromSelect();
  }

  /*-- STATE SYNC --*/

  _syncFromSelect() {
    const v = this._select.value;
    const current = this._items.find((li) => li.dataset.value === v);
    this._value.textContent =
      current?.textContent ??
      this._select.selectedOptions[0]?.textContent ??
      "";
    this._items.forEach((li) =>
      li.setAttribute(
        "aria-selected",
        li.dataset.value === v ? "true" : "false",
      ),
    );
  }

  _choose(value) {
    if (this._select.value !== value) {
      this._select.value = value;
      this._select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    this._syncFromSelect();
    this._close();
    this._btn.focus();
  }

  /*-- OPEN / CLOSE --*/

  _openMenu() {
    if (this._isOpen) return;
    this._isOpen = true;
    this._wrap.classList.add("open");
    this._btn.setAttribute("aria-expanded", "true");
    const selected =
      this._items.find((li) => li.getAttribute("aria-selected") === "true") ??
      this._items[0];
    selected?.focus();
  }

  _close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._wrap.classList.remove("open");
    this._btn.setAttribute("aria-expanded", "false");
  }

  /*-- EVENTS --*/

  _bind() {
    this._btn.addEventListener("click", () =>
      this._isOpen ? this._close() : this._openMenu(),
    );

    this._btn.addEventListener("keydown", (e) => {
      if (["ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        this._openMenu();
      }
    });

    this._menu.addEventListener("click", (e) => {
      const li = e.target.closest("[role='option']");
      if (li) this._choose(li.dataset.value);
    });

    this._menu.addEventListener("keydown", (e) => this._handleMenuKeys(e));

    // Close on outside click / focus loss
    document.addEventListener("click", (e) => {
      if (this._isOpen && !this._wrap.contains(e.target)) this._close();
    });

    // Keep the label in sync when scripts change the native select
    this._select.addEventListener("change", () => this._syncFromSelect());
  }

  _handleMenuKeys(e) {
    const idx = this._items.indexOf(document.activeElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this._items[Math.min(idx + 1, this._items.length - 1)]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        this._items[Math.max(idx - 1, 0)]?.focus();
        break;
      case "Home":
        e.preventDefault();
        this._items[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        this._items[this._items.length - 1]?.focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (idx >= 0) this._choose(this._items[idx].dataset.value);
        break;
      case "Escape":
        e.preventDefault();
        this._close();
        this._btn.focus();
        break;
      case "Tab":
        this._close();
        break;
    }
  }
}
