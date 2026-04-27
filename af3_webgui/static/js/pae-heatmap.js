const PAEHeatmap = {
  async loadTop(jobId) {
    const url = API.resultUrl(jobId, null, null, "top-confidences");
    await this.loadUrl(url);
  },

  async loadSample(jobId, seed, sample) {
    const url = API.resultUrl(jobId, seed, sample, "confidences.json");
    await this.loadUrl(url);
  },

  async loadUrl(url) {
    const el = document.getElementById("paePlot");
    if (!el) return;
    el.innerHTML = `<div class="text-center py-5"><div class="spinner-border"></div></div>`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();
      const pae = data.pae || data.predicted_aligned_error;

      if (!pae) {
        el.innerHTML = `<div class="text-muted text-center py-5">No PAE data available</div>`;
        return;
      }

      const z = Array.isArray(pae[0]) ? pae : pae[0];
      const ticks = data.max_pae || data.pae_output?.[0]?.max_pae || null;

      const layout = {
        title: "Predicted Aligned Error (PAE)",
        xaxis: { title: "Residue", scaleanchor: "y", constrain: "domain" },
        yaxis: { title: "Residue", autorange: "reversed" },
        width: Math.min(700, el.clientWidth || 700),
        height: 600,
        margin: { l: 60, r: 20, t: 50, b: 60 },
        coloraxis: {
          colorscale: [[0, "#313695"], [0.2, "#4575b4"], [0.4, "#abd9e9"],
                       [0.5, "#ffffbf"], [0.6, "#fdae61"], [0.8, "#d73027"], [1, "#a50026"]],
          cmin: 0, cmax: 31.75,
          colorbar: { title: "Expected Position Error (Å)" },
        },
      };

      Plotly.newPlot(el, [{
        z, type: "heatmap",
        colorscale: layout.coloraxis.colorscale,
        zmin: 0, zmax: 31.75,
        colorbar: layout.coloraxis.colorbar,
      }], layout, { responsive: true });
    } catch (e) {
      el.innerHTML = `<div class="text-danger text-center py-5">Failed to load PAE: ${e.message}</div>`;
    }
  },
};
