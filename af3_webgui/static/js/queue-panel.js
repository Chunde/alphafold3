const QueuePanel = {
  refreshTimer: null,

  mount() {
    const el = document.getElementById("panel-queue");
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Job Queue</h5>
        <button class="btn btn-outline-secondary btn-sm" id="refreshQueueBtn">
          <i class="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>
      <div id="queueTableWrap">
        <div class="text-center py-5 text-muted">Loading...</div>
      </div>`;

    document.getElementById("refreshQueueBtn").addEventListener("click", () => this.load());
    this.load();
    this.startAutoRefresh();
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
      const jobs = await API.listJobs();
      this.render(jobs);
    } catch (e) {
      document.getElementById("queueTableWrap").innerHTML =
        `<div class="alert alert-danger">Failed to load jobs: ${e.message}</div>`;
    }
  },

  render(jobs) {
    if (!jobs.length) {
      document.getElementById("queueTableWrap").innerHTML =
        `<div class="text-center py-5 text-muted">No jobs yet. <a href="#submit">Create one</a>.</div>`;
      return;
    }

    const rows = jobs.map(j => {
      const badgeClass = {
        pending: "bg-secondary", running: "bg-primary", completed: "bg-success",
        failed: "bg-danger", cancelled: "bg-warning text-dark",
      }[j.status] || "bg-secondary";

      return `
        <tr>
          <td><code>${j.id}</code></td>
          <td>${this.esc(j.name)}</td>
          <td><span class="badge status-badge ${badgeClass}">${j.status}</span></td>
          <td><small>${App.formatDate(j.created_at)}</small></td>
          <td>${j.num_seeds}</td>
          <td>${j.num_samples}</td>
          <td>
            ${j.status === "running" || j.status === "pending"
              ? `<button class="btn btn-outline-danger btn-sm cancel-job-btn" data-id="${j.id}">Cancel</button>`
              : j.status === "completed"
                ? `<button class="btn btn-outline-primary btn-sm view-results-btn" data-id="${j.id}">View Results</button>`
                : j.status === "failed"
                  ? `<button class="btn btn-outline-secondary btn-sm view-logs-btn" data-id="${j.id}">Logs</button>`
                  : ""}
          </td>
        </tr>`;
    }).join("");

    document.getElementById("queueTableWrap").innerHTML = `
      <table class="table table-hover job-table">
        <thead>
          <tr><th>ID</th><th>Name</th><th>Status</th><th>Created</th><th>Seeds</th><th>Samples</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    // Bind buttons
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
  },

  esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  },
};
