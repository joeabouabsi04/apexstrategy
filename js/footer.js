/* ============================================================
   APEXSTRATEGY — FOOTER  (ES6 module)
   Import this file for its side effects:
     • Registers the <apex-footer> Custom Element
   One template, used identically on index.html / workbench.html /
   handbook.html — replaces three hand-duplicated <footer> blocks
   (only one of which actually had layout CSS) with a single
   source of truth. Visual rules live in css/style.css alongside
   the rest of the design system, not injected from here.
   ============================================================ */

const FOOTER_TEMPLATE = /* html */ `
<footer class="apex-footer" role="contentinfo">
  <div class="apex-footer-top">
    <div class="apex-footer-brand">
      <span class="apex-footer-logo">APEX<span class="apex-footer-logo-accent">STRATEGY</span></span>
      <span class="apex-footer-tagline">WEATHER-DRIVEN RACE ENGINEERING PLATFORM</span>
    </div>
    <ul class="apex-footer-links" role="list">
      <li role="listitem"><a href="index.html">COMMAND CENTER</a></li>
      <li role="listitem"><a href="workbench.html">WORKBENCH</a></li>
      <li role="listitem"><a href="handbook.html">HANDBOOK</a></li>
    </ul>
  </div>
  <div class="apex-footer-bottom">
    <span class="apex-footer-copy">&copy; 2026 APEXSTRATEGY. ALL RIGHTS RESERVED.</span>
    <span class="apex-footer-meta">
      WEATHER DATA: OPENWEATHERMAP API
  </div>
</footer>`;

export class ApexFooterElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = FOOTER_TEMPLATE;
  }
}

customElements.define("apex-footer", ApexFooterElement);
