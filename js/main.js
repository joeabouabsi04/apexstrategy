/* ============================================================
   APEXSTRATEGY — MAIN.JS
   Single entry point. Loaded as type="module" on all 3 pages.
   ============================================================ */

import "./nav.js";
import { runBootSequence } from "./anim.js";

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
    // Home page — boot hero first, then circuit grid
    const { initHero } = await import("./hero.js");
    const { HomeController } = await import("./HomeController.js");
    initHero();
    new HomeController();
  }
});
