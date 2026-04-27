const ConfigPanel = {
  async mount() {
    const el = document.getElementById("panel-config");
    el.innerHTML = `<div class="text-center py-5"><div class="spinner-border"></div></div>`;

    let cfg;
    try {
      cfg = await API.getConfig();
    } catch (e) {
      el.innerHTML = `<div class="alert alert-danger">Failed to load config: ${e.message}</div>`;
      return;
    }

    el.innerHTML = `
      <h5 class="mb-3">Runtime Configuration</h5>
      <div class="row">
        <div class="col-lg-6">
          <div class="card mb-3">
            <div class="card-header"><strong>Inference Settings</strong></div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label">Number of Recycles</label>
                <input class="form-control" id="cfgRecycles" type="number" value="${cfg.num_recycles}" min="1" max="100">
                <small class="text-muted">More recycles may improve accuracy but increases runtime</small>
              </div>
              <div class="mb-3">
                <label class="form-label">Number of Diffusion Samples</label>
                <input class="form-control" id="cfgSamples" type="number" value="${cfg.num_diffusion_samples}" min="1" max="1000">
                <small class="text-muted">Number of samples per seed for diffusion</small>
              </div>
              <div class="mb-3">
                <label class="form-label">Flash Attention Implementation</label>
                <select class="form-select" id="cfgFlash">
                  <option value="triton" ${cfg.flash_attention === "triton" ? "selected" : ""}>Triton</option>
                  <option value="cudnn" ${cfg.flash_attention === "cudnn" ? "selected" : ""}>cuDNN</option>
                  <option value="xla" ${cfg.flash_attention === "xla" ? "selected" : ""}>XLA</option>
                </select>
              </div>
              <button class="btn btn-primary" id="saveConfigBtn">Save Settings</button>
              <span id="configSavedMsg" class="text-success ms-2 d-none">Saved!</span>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card mb-3">
            <div class="card-header"><strong>System Status</strong></div>
            <div class="card-body">
              <table class="table table-sm">
                <tr><td>Docker</td>
                  <td><span id="cfgDockerBadge" class="badge ${cfg.docker_available ? 'bg-success' : 'bg-danger'}">
                    ${cfg.docker_available ? 'Available' : 'Unavailable'}</span></td></tr>
                <tr><td>GPU</td>
                  <td><span id="cfgGpuBadge" class="badge ${cfg.gpu_available ? 'bg-success' : 'bg-danger'}">
                    ${cfg.gpu_available ? 'Available' : 'Unavailable'}</span></td></tr>
                <tr><td>Model</td><td><code>${cfg.model_dir || "/mnt/data"}</code></td></tr>
                <tr><td>Databases</td><td><code>${cfg.db_dir || "/mnt/data/public_databases"}</code></td></tr>
                <tr><td>Jobs Directory</td><td><code>${App.config?.jobs_dir || "jobs/"}</code></td></tr>
              </table>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById("saveConfigBtn").addEventListener("click", async () => {
      const data = {
        num_recycles: parseInt(document.getElementById("cfgRecycles").value) || 10,
        num_diffusion_samples: parseInt(document.getElementById("cfgSamples").value) || 5,
        flash_attention: document.getElementById("cfgFlash").value,
      };
      try {
        await API.updateConfig(data);
        App.config = { ...App.config, ...data };
        const msg = document.getElementById("configSavedMsg");
        msg.classList.remove("d-none");
        setTimeout(() => msg.classList.add("d-none"), 2000);
      } catch (e) {
        alert(`Failed to save: ${e.message}`);
      }
    });
  },

  async refresh() {
    const dockerEl = document.getElementById("cfgDockerBadge");
    const gpuEl = document.getElementById("cfgGpuBadge");
    if (!dockerEl || !gpuEl) return;
    try {
      const cfg = await API.getConfig();
      dockerEl.className = `badge ${cfg.docker_available ? 'bg-success' : 'bg-danger'}`;
      dockerEl.textContent = cfg.docker_available ? 'Available' : 'Unavailable';
      gpuEl.className = `badge ${cfg.gpu_available ? 'bg-success' : 'bg-danger'}`;
      gpuEl.textContent = cfg.gpu_available ? 'Available' : 'Unavailable';
    } catch (e) { /* silent */ }
  },
};
