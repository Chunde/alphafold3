const ConfidencePlot = {
  async loadTop(jobId) {
    const url = API.resultUrl(jobId, null, null, "top-confidences");
    await this.loadUrl(url);
  },

  async loadSample(jobId, seed, sample) {
    const url = API.resultUrl(jobId, seed, sample, "confidences.json");
    await this.loadUrl(url);
  },

  async loadUrl(url) {
    const el = document.getElementById("confidencePlot");
    if (!el) return;
    el.innerHTML = `<div class="text-center py-5"><div class="spinner-border"></div></div>`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();
      const plddt = data.plddt || data.local_confidence || data.atom_plddts;

      if (!plddt || !plddt.length) {
        el.innerHTML = `<div class="text-muted text-center py-5">No pLDDT data available</div>`;
        return;
      }

      const x = Array.from({ length: plddt.length }, (_, i) => i + 1);
      const colors = plddt.map(v => {
        if (v >= 90) return "#0053d6";
        if (v >= 70) return "#65cbf3";
        if (v >= 50) return "#ffdb13";
        return "#ff7d45";
      });

      // Draw confidence zones
      const shapes = [
        { type: "rect", x0: 0, x1: 1, y0: 90, y1: 100, xref: "paper", yref: "y",
          fillcolor: "rgba(0,83,214,.06)", line: { width: 0 }, layer: "below" },
        { type: "rect", x0: 0, x1: 1, y0: 70, y1: 90, xref: "paper", yref: "y",
          fillcolor: "rgba(101,203,243,.06)", line: { width: 0 }, layer: "below" },
        { type: "rect", x0: 0, x1: 1, y0: 50, y1: 70, xref: "paper", yref: "y",
          fillcolor: "rgba(255,219,19,.06)", line: { width: 0 }, layer: "below" },
        { type: "rect", x0: 0, x1: 1, y0: 0, y1: 50, xref: "paper", yref: "y",
          fillcolor: "rgba(255,125,69,.06)", line: { width: 0 }, layer: "below" },
      ];

      const annotations = [
        { x: 1, y: 95, xref: "paper", yref: "y", text: "Very high (pLDDT > 90)",
          showarrow: false, xanchor: "right", font: { size: 9, color: "#0053d6" } },
        { x: 1, y: 80, xref: "paper", yref: "y", text: "Confident (90 > pLDDT > 70)",
          showarrow: false, xanchor: "right", font: { size: 9, color: "#65cbf3" } },
        { x: 1, y: 60, xref: "paper", yref: "y", text: "Low (70 > pLDDT > 50)",
          showarrow: false, xanchor: "right", font: { size: 9, color: "#ffdb13" } },
        { x: 1, y: 25, xref: "paper", yref: "y", text: "Very low (pLDDT < 50)",
          showarrow: false, xanchor: "right", font: { size: 9, color: "#ff7d45" } },
      ];

      const layout = {
        title: "Predicted lDDT per Position",
        xaxis: { title: "Residue", dtick: Math.max(1, Math.floor(plddt.length / 20)) },
        yaxis: { title: "pLDDT", range: [0, 100] },
        width: Math.min(800, el.clientWidth || 800),
        height: 400,
        margin: { l: 50, r: 180, t: 50, b: 50 },
        shapes, annotations,
      };

      Plotly.newPlot(el, [{
        x, y: plddt, type: "scatter", mode: "lines",
        line: { color: "#0d6efd", width: 1.5 },
        fill: "tozeroy", fillcolor: "rgba(13,110,253,.1)",
      }], layout, { responsive: true });
    } catch (e) {
      el.innerHTML = `<div class="text-danger text-center py-5">Failed to load confidence data: ${e.message}</div>`;
    }
  },
};
