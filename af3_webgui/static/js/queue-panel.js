const QueuePanel = {
  refreshTimer: null,
  _showArchived: false,

  mount() {
    const el = document.getElementById("panel-queue");
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div class="d-flex align-items-center gap-3">
          <h5 class="mb-0">Job Queue</h5>
          <div class="btn-group btn-group-sm" id="queueViewToggle">
            <button class="btn btn-outline-secondary active" data-view="active">Active</button>
            <button class="btn btn-outline-secondary" data-view="archived">
              <i class="bi bi-archive"></i> Archived
            </button>
          </div>
        </div>
        <div class="d-flex gap-2" id="queueActions">
          <button class="btn btn-outline-danger btn-sm queue-action-active" id="cancelAllBtn" title="Cancel all pending & running jobs">
            <i class="bi bi-stop-circle"></i> Cancel All
          </button>
          <button class="btn btn-outline-secondary btn-sm queue-action-active" id="archiveCompletedBtn" title="Move completed, failed & cancelled jobs to archive">
            <i class="bi bi-archive"></i> Archive Completed
          </button>
          <button class="btn btn-outline-secondary btn-sm" id="refreshQueueBtn">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>
      <div id="queueTableWrap">
        <div class="text-center py-5 text-muted">Loading...</div>
      </div>`;

    document.getElementById("refreshQueueBtn").addEventListener("click", () => this.load());
    document.getElementById("cancelAllBtn").addEventListener("click", () => this._cancelAll());
    document.getElementById("archiveCompletedBtn").addEventListener("click", () => this._archiveCompleted());

    document.querySelectorAll("#queueViewToggle button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#queueViewToggle button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this._showArchived = btn.dataset.view === "archived";
        // Toggle action buttons visibility
        document.querySelectorAll(".queue-action-active").forEach(b => {
          b.style.display = this._showArchived ? "none" : "";
        });
        this.load();
      });
    });

    this.load();
    this.startAutoRefresh();
  },

  async _cancelAll() {
    if (!confirm("Cancel all pending and running jobs?")) return;
    try {
      const res = await API.cancelAllJobs();
      alert(`Cancelled ${res.cancelled} job(s).`);
      this.load();
    } catch (e) { alert("Failed: " + e.message); }
  },

  async _archiveCompleted() {
    if (!confirm("Archive all completed, failed, and cancelled jobs?")) return;
    try {
      const res = await API.archiveCompleted();
      alert(`Archived ${res.archived} job(s).`);
      this.load();
    } catch (e) { alert("Failed: " + e.message); }
  },

  startAutoRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => this.load(), 5000);
  },

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  async load() {
    try {
      const jobs = this._showArchived ? await API.listArchived() : await API.listJobs();
      this.render(jobs);
    } catch (e) {
      document.getElementById("queueTableWrap").innerHTML =
        `<div class="alert alert-danger">Failed to load jobs: ${e.message}</div>`;
    }
  },

  render(jobs) {
    if (!jobs.length) {
      const msg = this._showArchived
        ? "No archived jobs."
        : `No jobs yet. <a href="#submit">Create one</a>.`;
      document.getElementById("queueTableWrap").innerHTML =
        `<div class="text-center py-5 text-muted">${msg}</div>`;
      return;
    }

    const rows = jobs.map(j => {
      const badgeClass = {
        pending: "bg-secondary", running: "bg-primary", completed: "bg-success",
        failed: "bg-danger", cancelled: "bg-warning text-dark",
      }[j.status] || "bg-secondary";

      let actionBtn = "";
      if (this._showArchived) {
        // Archived view: show restore + view results
        actionBtn = `<button class="btn btn-outline-secondary btn-sm restore-btn" data-id="${j.id}">
                       <i class="bi bi-box-arrow-up"></i> Restore
                     </button>`;
        if (j.status === "completed") {
          actionBtn += ` <button class="btn btn-outline-primary btn-sm view-results-btn" data-id="${j.id}">View</button>`;
        }
      } else {
        // Active view
        if (j.status === "running" || j.status === "pending") {
          actionBtn = `<button class="btn btn-outline-danger btn-sm cancel-job-btn" data-id="${j.id}">Cancel</button>`;
        } else if (j.status === "completed") {
          actionBtn = `<button class="btn btn-outline-primary btn-sm view-results-btn" data-id="${j.id}">View Results</button>
                       <button class="btn btn-outline-secondary btn-sm archive-btn" data-id="${j.id}" title="Archive this job">
                         <i class="bi bi-archive"></i>
                       </button>`;
        } else {
          actionBtn = `<button class="btn btn-outline-secondary btn-sm archive-btn" data-id="${j.id}" title="Archive this job">
                         <i class="bi bi-archive"></i>
                       </button>`;
          if (j.status === "failed") {
            actionBtn += ` <button class="btn btn-outline-secondary btn-sm view-logs-btn" data-id="${j.id}">Logs</button>`;
          }
        }
      }

      return `
        <tr>
          <td><code>${j.id}</code></td>
          <td>${this.esc(j.name)}</td>
          <td><span class="badge status-badge ${badgeClass}">${j.status}</span></td>
          <td><small>${App.formatDate(j.created_at)}</small></td>
          <td>${j.num_seeds}</td>
          <td>${j.num_samples}</td>
          <td style="white-space:nowrap">${actionBtn}</td>
        </tr>`;
    }).join("");

    document.getElementById("queueTableWrap").innerHTML = `
      <table class="table table-hover job-table">
        <thead>
          <tr><th>ID</th><th>Name</th><th>Status</th><th>Created</th><th>Seeds</th><th>Samples</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    // Bind active-view buttons
    document.querySelectorAll(".view-results-btn").forEach(btn => {
      btn.addEventListener("click", () => App.showResults(btn.dataset.id));
    });
    document.querySelectorAll(".cancel-job-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        try { await API.cancelJob(btn.dataset.id); } catch (e) { alert(e.message); }
        this.load();
      });
    });
    document.querySelectorAll(".view-logs-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          const logs = await API.getLogs(btn.dataset.id);
          const w = window.open("", "_blank", "width=800,height=600");
          w.document.write(`<pre style="font-size:12px;padding:1rem;">${this.esc(logs)}</pre>`);
        } catch (e) { alert(e.message); }
      });
    });
    document.querySelectorAll(".archive-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        try { await API.archiveJob(btn.dataset.id); this.load(); } catch (e) { alert(e.message); }
      });
    });

    // Bind archived-view buttons
    document.querySelectorAll(".restore-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        try { await API.unarchiveJob(btn.dataset.id); this.load(); } catch (e) { alert(e.message); }
      });
    });
  },

  esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  },
};
