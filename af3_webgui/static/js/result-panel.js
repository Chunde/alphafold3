const ResultPanel = {
  jobId: null,
  results: null,
  selectedSeed: null,
  selectedSample: null,

  showEmpty() {
    const el = document.getElementById("panel-results");
    el.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-graph-up" style="font-size:3rem"></i>
        <p class="mt-3">Select a completed job from the <a href="#queue">Queue</a> to view results.</p>
      </div>`;
  },

  async mount(jobId) {
    this.jobId = jobId;
    const el = document.getElementById("panel-results");
    el.innerHTML = `<div class="text-center py-5"><div class="spinner-border"></div> Loading results...</div>`;

    try {
      const job = await API.getJob(jobId);
      this.job = job;
      this.results = job.results || await API.getResults(jobId);
      this.render();
    } catch (e) {
      el.innerHTML = `<div class="alert alert-danger">Failed to load: ${e.message}</div>`;
    }
  },

  render() {
    const el = document.getElementById("panel-results");
    const r = this.results;

    if (!r || !r.has_results) {
      el.innerHTML = `<div class="alert alert-info">No results available yet for this job.</div>`;
      return;
    }

    // Default selection: top result
    this.selectedSeed = null;
    this.selectedSample = null;

    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h5 class="mb-1">${this.esc(this.job.name)}</h5>
          <small class="text-muted">Job ID: ${this.job.id}</small>
        </div>
        <div>
          <button class="btn btn-outline-secondary btn-sm me-1" id="downloadTopCifBtn">
            <i class="bi bi-download"></i> Top CIF
          </button>
          <button class="btn btn-outline-secondary btn-sm" id="downloadTopJsonBtn">
            <i class="bi bi-download"></i> Top JSON
          </button>
        </div>
      </div>

      <ul class="nav nav-tabs result-subtab mb-3" id="resultSubtabs">
        <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#subtab-structure">3D Structure</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#subtab-pae">PAE Heatmap</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#subtab-confidence">Confidence Plot</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#subtab-summary">Summary</a></li>
      </ul>

      <div class="tab-content">
        <div class="tab-pane fade show active" id="subtab-structure">
          <!-- Sample selector -->
          <div class="d-flex flex-wrap gap-2 mb-3" id="sampleSelector"></div>
          <div id="viewportContainer">
            <div id="viewport"></div>
          </div>
        </div>
        <div class="tab-pane fade" id="subtab-pae">
          <div id="paePlot"></div>
        </div>
        <div class="tab-pane fade" id="subtab-confidence">
          <div id="confidencePlot"></div>
        </div>
        <div class="tab-pane fade" id="subtab-summary">
          <div id="summaryContent"></div>
        </div>
      </div>`;

    this.renderSampleSelector();
    this.renderSummary();

    document.getElementById("downloadTopCifBtn").addEventListener("click", () => {
      window.open(API.resultUrl(this.jobId, null, null, "top-cif"), "_blank");
    });
    document.getElementById("downloadTopJsonBtn").addEventListener("click", () => {
      window.open(API.resultUrl(this.jobId, null, null, "top-confidences"), "_blank");
    });

    // Load visualizations for top result initially
    this.loadTopStructure();
    this.loadTopPAE();
    this.loadTopConfidence();

    // Listen for subtab changes to resize plots
    document.querySelectorAll("#resultSubtabs a[data-bs-toggle='tab']").forEach(el => {
      el.addEventListener("shown.bs.tab", e => {
        const target = e.target.getAttribute("href");
        if (target === "#subtab-pae") setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
        if (target === "#subtab-confidence") setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
      });
    });
  },

  renderSampleSelector() {
    const container = document.getElementById("sampleSelector");
    if (!container) return;

    let html = `<span class="btn btn-sm btn-outline-secondary sample-chip top-chip me-1 active"
      data-seed="" data-sample="">Top Ranked</span>`;
    (this.results.samples || []).forEach(s => {
      html += `<span class="btn btn-sm btn-outline-secondary sample-chip me-1 mb-1"
        data-seed="${s.seed}" data-sample="${s.sample_idx}">
        S${s.seed} #${s.sample_idx}
        ${s.has_cif ? "" : " <small class='text-muted'>(no CIF)</small>"}
      </span>`;
    });
    container.innerHTML = html;

    container.querySelectorAll(".sample-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        container.querySelectorAll(".sample-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const seed = chip.dataset.seed ? parseInt(chip.dataset.seed) : null;
        const sample = chip.dataset.sample ? parseInt(chip.dataset.sample) : null;
        if (seed === null) {
          this.loadTopStructure();
          this.loadTopPAE();
          this.loadTopConfidence();
        } else {
          StructureViewer.loadSample(this.jobId, seed, sample);
          PAEHeatmap.loadSample(this.jobId, seed, sample);
          ConfidencePlot.loadSample(this.jobId, seed, sample);
        }
      });
    });
  },

  loadTopStructure() {
    StructureViewer.loadTop(this.jobId);
  },

  loadTopPAE() {
    PAEHeatmap.loadTop(this.jobId);
  },

  loadTopConfidence() {
    ConfidencePlot.loadTop(this.jobId);
  },

  renderSummary() {
    const el = document.getElementById("summaryContent");
    if (!el) return;

    const top = this.results.top;
    const m = top && top.metrics ? top.metrics : null;

    let metricCards = "";
    if (m) {
      const cards = [
        ["pTM", m.ptm, 3],
        ["ipTM", m.iptm, 3],
        ["ranking_score", m.ranking_score, 3],
        ["fraction_disordered", m.fraction_disordered, 3],
        ["num_recycles", m.num_recycles, null],
        ["chain_ptm", m.chain_ptm ? JSON.stringify(m.chain_ptm) : "-", null],
      ];
      metricCards = cards.filter(c => c[1] != null).map(c => {
        let disp = typeof c[1] === "number" ? c[1].toFixed(c[2] || 3) : c[1];
        return `<div class="col-md-3 col-6"><div class="card metric-card">
          <div class="value">${disp}</div><div class="label">${c[0]}</div></div></div>`;
      }).join("");
    }

    // Chain-pair ipTM table
    let chainPairTable = "";
    if (m && m.chain_pair_iptm) {
      const chains = Object.keys(m.chain_pair_iptm);
      let th = "<th></th>" + chains.map(c => `<th>${this.esc(c)}</th>`).join("");
      let trs = chains.map(r => {
        let tds = chains.map(c => {
          const v = m.chain_pair_iptm[r][c];
          const color = v > 0.8 ? "#198754" : v > 0.6 ? "#ffc107" : "#dc3545";
          return `<td style="color:${color};font-weight:600">${v.toFixed(3)}</td>`;
        }).join("");
        return `<tr><th>${this.esc(r)}</th>${tds}</tr>`;
      }).join("");
      chainPairTable = `<div class="mt-3"><h6>Chain-Pair ipTM</h6>
        <table class="table table-sm table-bordered chain-pair-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
    }

    // Samples table
    let samplesTable = "";
    if (this.results.samples && this.results.samples.length) {
      const srows = this.results.samples.map(s => {
        const sm = s.metrics || {};
        return `<tr>
          <td>${s.seed}</td><td>${s.sample_idx}</td>
          <td>${sm.ptm ? sm.ptm.toFixed(3) : "-"}</td>
          <td>${sm.iptm ? sm.iptm.toFixed(3) : "-"}</td>
          <td>${sm.ranking_score ? sm.ranking_score.toFixed(3) : "-"}</td>
          <td>${sm.fraction_disordered != null ? sm.fraction_disordered.toFixed(3) : "-"}</td>
          <td>${sm.num_recycles != null ? sm.num_recycles : "-"}</td>
        </tr>`;
      }).join("");
      samplesTable = `<div class="mt-3"><h6>All Samples</h6>
        <table class="table table-sm table-hover">
          <thead><tr><th>Seed</th><th>Sample</th><th>pTM</th><th>ipTM</th><th>Ranking</th><th>Frac. Disordered</th><th>Recycles</th></tr></thead>
          <tbody>${srows}</tbody></table></div>`;
    }

    el.innerHTML = `<div class="row">${metricCards}</div>${chainPairTable}${samplesTable}`;
  },

  esc(s) {
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  },
};
