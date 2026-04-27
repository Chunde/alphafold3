const API = {
  async get(path) {
    const res = await fetch(path);
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(msg || `HTTP ${res.status}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  },

  async post(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(msg || `HTTP ${res.status}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  },

  getConfig()       { return this.get("/api/v1/config"); },
  updateConfig(cfg) { return this.post("/api/v1/config", cfg); },
  submitJob(data)   { return this.post("/api/v1/jobs", data); },
  listJobs()        { return this.get("/api/v1/jobs"); },
  getJob(id)        { return this.get(`/api/v1/jobs/${id}`); },
  cancelJob(id)     { return this.post(`/api/v1/jobs/${id}/cancel`); },
  getLogs(id)       { return this.get(`/api/v1/jobs/${id}/logs`); },
  getResults(id)    { return this.get(`/api/v1/jobs/${id}/results`); },

  resultUrl(jobId, seed, sample, type) {
    if (type === "top-cif")
      return `/api/v1/jobs/${jobId}/results/top/model.cif`;
    if (type === "top-confidences")
      return `/api/v1/jobs/${jobId}/results/top/confidences.json`;
    return `/api/v1/jobs/${jobId}/results/${seed}/${sample}/${type}`;
  },
};
