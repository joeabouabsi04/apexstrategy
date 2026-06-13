//-- SECTION: NAVIGATION COMPONENT --//
class NavigationComponent {
  constructor() {
    this.mount = document.getElementById("apexNavMount");
  }

  init() {
    if (!this.mount || document.querySelector(".apex-nav")) {
      return;
    }

    const activePage =
      this.mount.dataset.activePage || this.getPageFromLocation();
    this.mount.innerHTML = this.render(activePage);
  }

  getPageFromLocation() {
    const pageName = window.location.pathname.split("/").pop();
    const pageMap = {
      "": "home",
      "index.html": "home",
      "workbench.html": "workbench",
      "handbook.html": "handbook",
    };

    return pageMap[pageName] || "home";
  }

  render(activePage) {
    return `
      <nav class="apex-nav" role="navigation" aria-label="Main navigation" data-active-page="${activePage}">
        <div class="d-flex align-items-center gap-3">
          <a href="index.html" class="apex-nav-brand">
            <span class="text-neon">APEX</span>STRATEGY
          </a>
          <span class="text-muted apex-mono">| v2.4.1</span>
          <div class="d-flex align-items-center">
            <span class="status-dot status-live"></span>
            <span class="apex-label">SYSTEM ONLINE</span>
          </div>
        </div>

        <ul class="apex-nav-links" id="navLinks">
          <li><a href="index.html" class="apex-nav-link" data-page="home">COMMAND CENTER</a></li>
          <li><a href="workbench.html" class="apex-nav-link" data-page="workbench">WORKBENCH</a></li>
          <li><a href="handbook.html" class="apex-nav-link" data-page="handbook">HANDBOOK</a></li>
        </ul>

        <button class="apex-nav-toggle" id="navToggle" type="button" aria-label="Toggle navigation" aria-expanded="false">
          <span class="apex-nav-toggle-line" aria-hidden="true"></span>
          <span class="apex-nav-toggle-line" aria-hidden="true"></span>
          <span class="apex-nav-toggle-line" aria-hidden="true"></span>
        </button>
      </nav>
    `;
  }
}

//-- SECTION: NAVIGATION CONTROLLER --//
class NavigationController {
  constructor() {
    this.nav = document.querySelector(".apex-nav");
    this.navLinks = document.getElementById("navLinks");
    this.navToggle = document.getElementById("navToggle");
    this.activePage = this.nav ? this.nav.dataset.activePage : "";
  }

  init() {
    if (!this.nav) {
      return;
    }

    this.setActiveLink();
    this.bindMobileMenu();
  }

  setActiveLink() {
    const links = this.nav.querySelectorAll(".apex-nav-link");

    links.forEach((link) => {
      const isActivePage = link.dataset.page === this.activePage;
      link.classList.toggle("active", isActivePage);
    });
  }

  bindMobileMenu() {
    if (!this.navLinks || !this.navToggle) {
      return;
    }

    this.navToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggleMenu();
    });

    this.navLinks.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", (event) => {
      if (!this.nav.contains(event.target)) {
        this.closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    const isOpen = this.navLinks.classList.toggle("nav-open");
    this.navToggle.setAttribute("aria-expanded", String(isOpen));
  }

  closeMenu() {
    this.navLinks.classList.remove("nav-open");
    this.navToggle.setAttribute("aria-expanded", "false");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new NavigationComponent().init();
  new NavigationController().init();
});
