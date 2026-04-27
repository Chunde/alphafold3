const StructureViewer = {
  stage: null,

  async loadTop(jobId) {
    const url = API.resultUrl(jobId, null, null, "top-cif");
    this.render(url);
  },

  async loadSample(jobId, seed, sample) {
    const url = API.resultUrl(jobId, seed, sample, "model.cif");
    this.render(url);
  },

  clear() {
    const container = document.getElementById("viewportContainer");
    if (container) container.innerHTML = `<div id="viewport"></div>`;
    this.stage = null;
  },

  async render(url) {
    this.clear();
    const viewport = document.getElementById("viewport");
    if (!viewport) return;

    // Loading indicator
    const loading = document.createElement("div");
    loading.className = "loading-overlay";
    loading.innerHTML = `<div class="spinner-border text-light"></div>`;
    viewport.parentElement.appendChild(loading);

    try {
      const resp = await fetch(url);
      const cifText = await resp.text();

      // Remove loading
      loading.remove();

      // Create NGL stage
      this.stage = new NGL.Stage(viewport, { backgroundColor: "#1a1a2e" });
      this.stage.setParameters({ clipNear: 0, clipFar: 100, clipDist: 10 });

      const blob = new Blob([cifText], { type: "text/plain" });
      const component = await this.stage.loadFile(blob, { ext: "cif" });

      // Cartoon representation with bfactor coloring (pLDDT stored in B-factor)
      component.addRepresentation("cartoon", {
        color: NGL.ColormakerRegistry.bfactorScheme,
        smoothSheet: true,
      });

      // Add ball+stick for ligands/non-polymer
      component.addRepresentation("ball+stick", {
        sele: "not protein and not nucleic and not water",
        color: NGL.ColormakerRegistry.elementScheme,
      });

      this.stage.autoView();
    } catch (e) {
      loading.remove();
      viewport.innerHTML = `
        <div class="d-flex align-items-center justify-content-center" style="height:500px;color:#999;">
          <div class="text-center">
            <i class="bi bi-exclamation-triangle" style="font-size:2rem"></i>
            <p class="mt-2">Failed to load structure</p>
            <small>${e.message}</small>
          </div></div>`;
    }
  },
};
