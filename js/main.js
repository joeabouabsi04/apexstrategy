/* ============================================================
   APEXSTRATEGY — MAIN.JS
   Single entry point. Loaded as type="module" on all 3 pages.
   Imports nav as a side effect, then dynamically boots the
   correct page controller based on the current URL.
   ============================================================ */

// Side effects on import: registers <apex-nav> custom element,
// injects scoped nav CSS, starts keyboard shortcut listener
import "./nav.js";

import { runBootSequence } from "./anim.js";

/*-- SECTION: PAGE BOOT --*/

document.addEventListener("DOMContentLoaded", async () => {
  runBootSequence();

  const path = window.location.pathname.toLowerCase();

  if (path.includes("workbench")) {
    const { WorkbenchController } = await import("./WorkbenchController.js");
    const wb = new WorkbenchController();
    await wb
      .init()
      .catch((err) => console.error("[main] WorkbenchController:", err));
  } else if (path.includes("handbook")) {
    const { TabController } = await import("./TabController.js");
    new TabController(".workbench-nav", ".workbench-panes");
  } else {
    // Default: index.html / Command Center
    const { HomeController } = await import("./HomeController.js");
    new HomeController();
  }
});
