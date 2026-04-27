const App = {
  currentJobId: null,
  config: null,
  _mounted: {},

  async init() {
    try {
      this.config = await API.getConfig();
    } catch (e) {
      this.config = { docker_available: false, gpu_available: false };
    }
    this.updateStatusBadge();

    // Mount all panels once on init
    SubmitPanel.mount();
    QueuePanel.mount();
    ResultPanel.showEmpty();
    ConfigPanel.mount();
    this._mounted = { submit: true, queue: true, results: true, config: true };

    window.addEventListener("hashchange", () => this.route());
    this.route();

    // App bar tab clicks
    document.querySelectorAll(".app-tab").forEach(tab => {
      tab.addEventListener("click", e => {
        e.preventDefault();
        const hash = tab.getAttribute("href");
        window.location.hash = hash;
      });
    });
  },

  updateStatusBadge() {
    const b = document.getElementById("statusBadge");
    if (!this.config) {
      b.className = "badge-status";
      b.textContent = "Checking...";
    } else if (!this.config.docker_available) {
      b.className = "badge-status offline";
      b.textContent = "Docker offline";
    } else if (!this.config.gpu_available) {
      b.className = "badge-status warn";
      b.textContent = "GPU not available";
    } else {
      b.className = "badge-status ready";
      b.textContent = "GPU ready";
    }
  },

  route() {
    const hash = window.location.hash || "#submit";

    // Update app bar tabs
    document.querySelectorAll(".app-tab").forEach(tab => {
      tab.classList.toggle("active", tab.getAttribute("href") === hash);
    });

    // Show/hide panels (don't re-mount)
    const panels = {
      "#submit": "panel-submit",
      "#queue": "panel-queue",
      "#results": "panel-results",
      "#config": "panel-config",
    };
    const activeId = panels[hash] || "panel-submit";

    document.querySelectorAll(".tab-pane").forEach(p => {
      p.classList.remove("show", "active");
    });
    const panel = document.getElementById(activeId);
    if (panel) panel.classList.add("show", "active");

    // Render sidebar
    this.renderSidebar(hash);

    // Refresh panels that need live data
    if (hash === "#queue") QueuePanel.load();
    if (hash === "#results" && this.currentJobId) ResultPanel.mount(this.currentJobId);
    else if (hash === "#results" && !this.currentJobId) ResultPanel.showEmpty();
    if (hash === "#config") ConfigPanel.refresh();
  },

  renderSidebar(hash) {
    const nav = document.getElementById("sidebarNav");
    if (!nav) return;

    if (hash === "#submit" || !hash) {
      nav.innerHTML = `
        <a class="sidebar-step active"><span class="step-num">1</span> Input molecules</a>
        <a class="sidebar-step"><span class="step-num">2</span> Advanced settings</a>
        <a class="sidebar-step"><span class="step-num">3</span> Review & submit</a>
        <div class="sidebar-divider"></div>
        <a class="sidebar-step submit-sidebar-btn" style="cursor:pointer;"><i class="bi bi-play-fill me-2"></i> Submit job</a>`;
      // Bind submit button in sidebar
      nav.querySelector(".submit-sidebar-btn")?.addEventListener("click", () => {
        SubmitPanel.submit();
      });
    } else if (hash === "#queue") {
      nav.innerHTML = `
        <a class="sidebar-step active"><i class="bi bi-list-ul me-2"></i> All jobs</a>
        <div class="sidebar-divider"></div>
        <a class="sidebar-step" href="#submit"><i class="bi bi-plus-circle me-2"></i> New prediction</a>`;
    } else if (hash === "#results") {
      nav.innerHTML = `
        <a class="sidebar-step active"><i class="bi bi-graph-up me-2"></i> Results</a>
        <div class="sidebar-divider"></div>
        <a class="sidebar-step" data-subtab="structure"><i class="bi bi-box me-2"></i> 3D Structure</a>
        <a class="sidebar-step" data-subtab="pae"><i class="bi bi-grid-3x3 me-2"></i> PAE Heatmap</a>
        <a class="sidebar-step" data-subtab="confidence"><i class="bi bi-graph-up-arrow me-2"></i> Confidence Plot</a>
        <a class="sidebar-step" data-subtab="summary"><i class="bi bi-table me-2"></i> Summary</a>
        <div class="sidebar-divider"></div>
        <a class="sidebar-step" href="#queue"><i class="bi bi-arrow-left me-2"></i> Back to jobs</a>`;

      nav.querySelectorAll(".sidebar-step[data-subtab]").forEach(step => {
        step.addEventListener("click", () => {
          const subtab = step.dataset.subtab;
          const tabMap = {
            structure: "#subtab-structure",
            pae: "#subtab-pae",
            confidence: "#subtab-confidence",
            summary: "#subtab-summary",
          };
          const tab = document.querySelector(`#resultSubtabs a[href="${tabMap[subtab]}"]`);
          if (tab) new bootstrap.Tab(tab).show();
        });
      });
    } else if (hash === "#config") {
      nav.innerHTML = `
        <a class="sidebar-step active"><i class="bi bi-gear me-2"></i> Runtime config</a>
        <div class="sidebar-divider"></div>
        <a class="sidebar-step"><i class="bi bi-cpu me-2"></i> Inference</a>
        <a class="sidebar-step"><i class="bi bi-hdd me-2"></i> System status</a>`;
    }
  },

  showResults(jobId) {
    this.currentJobId = jobId;
    window.location.hash = "#results";
  },

  formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString();
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
