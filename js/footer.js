/* ============================================================
   APEXSTRATEGY — FOOTER  (ES6 module)
   Import this file for its side effects:
     • Registers the <apex-footer> Custom Element
   One template, used identically on index.html / workbench.html /
   handbook.html. Visual rules live in css/style.css alongside
   the rest of the design system, not injected from here.
   ============================================================ */

const FOOTER_TEMPLATE = /* html */ `
<footer class="apex-footer" role="contentinfo">
  <div class="apex-footer-top">
    <div class="apex-footer-brand">
      <span class="apex-footer-logo">APEX<span class="apex-footer-logo-accent">STRATEGY</span></span>
      <span class="apex-footer-tagline">Weather-driven race engineering. Live forecasts turned into setup calls for twenty legendary circuits.</span>
    </div>
    <ul class="apex-footer-links" role="list">
      <li role="listitem"><a href="index.html">Circuits</a></li>
      <li role="listitem"><a href="workbench.html">Workbench</a></li>
      <li role="listitem"><a href="handbook.html">Handbook</a></li>
    </ul>
  </div>
  <div class="apex-footer-bottom">
    <div class="apex-footer-bottom-inner">
      <span class="apex-footer-copy">&copy; 2026 ApexStrategy</span>
      <span class="apex-footer-meta">Weather data · OpenWeatherMap API</span>
    </div>
  </div>
</footer>`;

export class ApexFooterElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = FOOTER_TEMPLATE;
  }
}

customElements.define("apex-footer", ApexFooterElement);
