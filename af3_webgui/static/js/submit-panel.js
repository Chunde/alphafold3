const SubmitPanel = {
  entityCounter: 0,

  // ── Ligands (commonly used biologically relevant molecules) ──
  LIGANDS: [
    // Nucleotides
    { code: "ATP", name: "Adenosine triphosphate" },
    { code: "ADP", name: "Adenosine diphosphate" },
    { code: "AMP", name: "Adenosine monophosphate" },
    { code: "GTP", name: "Guanosine triphosphate" },
    { code: "GDP", name: "Guanosine diphosphate" },
    { code: "GMP", name: "Guanosine monophosphate" },
    { code: "CTP", name: "Cytidine triphosphate" },
    { code: "CDP", name: "Cytidine diphosphate" },
    { code: "CMP", name: "Cytidine monophosphate" },
    { code: "UTP", name: "Uridine triphosphate" },
    { code: "UDP", name: "Uridine diphosphate" },
    { code: "UMP", name: "Uridine monophosphate" },
    { code: "TTP", name: "Thymidine triphosphate" },
    { code: "TMP", name: "Thymidine monophosphate" },
    { code: "ANP", name: "Phosphoaminophosphonic acid-adenylate ester (ATP analog)" },
    // Nicotinamide / Flavins
    { code: "NAD", name: "Nicotinamide adenine dinucleotide" },
    { code: "NAI", name: "NAD (acidic form)" },
    { code: "NAP", name: "NADP nicotinamide-adenine-dinucleotide phosphate" },
    { code: "NDP", name: "NADPH (dihydro-nicotinamide-adenine-dinucleotide phosphate)" },
    { code: "FAD", name: "Flavin adenine dinucleotide" },
    { code: "FMN", name: "Flavin mononucleotide" },
    // Coenzyme A
    { code: "COA", name: "Coenzyme A" },
    { code: "ACO", name: "Acetyl coenzyme A" },
    { code: "COZ", name: "Oxidized coenzyme A" },
    // Heme variants
    { code: "HEM", name: "Protoporphyrin IX containing Fe (Heme B)" },
    { code: "HEC", name: "Heme C" },
    { code: "HEA", name: "Heme A" },
    { code: "HEB", name: "Heme B (alternate)" },
    { code: "HAS", name: "Heme A (alternate)" },
    // Chlorophylls
    { code: "CLA", name: "Chlorophyll A" },
    { code: "CL0", name: "Chlorophyll A (CL0)" },
    { code: "BCL", name: "Bacteriochlorophyll A" },
    { code: "BCB", name: "Bacteriochlorophyll B" },
    { code: "BPH", name: "Bacteriopheophytin A" },
    // Retinoids / Carotenoids
    { code: "RET", name: "Retinal" },
    { code: "RTL", name: "Retinol (Vitamin A)" },
    { code: "BCR", name: "Beta-carotene" },
    { code: "LYC", name: "Lycopene" },
    // Cofactors
    { code: "PLP", name: "Pyridoxal-5'-phosphate (Vitamin B6)" },
    { code: "P5P", name: "Pyridoxal-5'-phosphate (alternate)" },
    { code: "TPP", name: "Thiamine diphosphate (Vitamin B1)" },
    { code: "TDP", name: "Thiamine diphosphate (alternate)" },
    { code: "SAM", name: "S-adenosylmethionine" },
    { code: "SAH", name: "S-adenosyl-L-homocysteine" },
    { code: "THF", name: "Tetrahydrofolate" },
    { code: "FOL", name: "Folic acid" },
    { code: "B12", name: "Cobalamin (Vitamin B12)" },
    { code: "BLA", name: "Biliverdin" },
    { code: "BLD", name: "Bilirubin" },
    { code: "FMN", name: "Flavin mononucleotide" },
    { code: "MQ7", name: "Menaquinone (Vitamin K2)" },
    { code: "UQ",  name: "Ubiquinone (Coenzyme Q)" },
    { code: "U10", name: "Ubiquinone-10" },
    // Sugars
    { code: "NAG", name: "N-acetyl-D-glucosamine" },
    { code: "NDG", name: "N-acetyl-D-glucosamine (alternate)" },
    { code: "BMA", name: "Beta-D-mannose" },
    { code: "MAN", name: "Alpha-D-mannose" },
    { code: "GAL", name: "Beta-D-galactose" },
    { code: "GLA", name: "Alpha-D-galactose" },
    { code: "GLC", name: "Alpha-D-glucose" },
    { code: "BGC", name: "Beta-D-glucose" },
    { code: "FUC", name: "Alpha-L-fucose" },
    { code: "FUL", name: "Beta-L-fucose" },
    { code: "XYS", name: "Xylose" },
    { code: "SIA", name: "N-acetylneuraminic acid (Sialic acid)" },
    // Lipids / Fatty acids
    { code: "PLM", name: "Palmitic acid" },
    { code: "OLA", name: "Oleic acid" },
    { code: "STE", name: "Stearic acid" },
    { code: "MYR", name: "Myristic acid" },
    { code: "PAM", name: "Palmitoleic acid" },
    { code: "LNL", name: "Linoleic acid" },
    { code: "LDA", name: "Lauric acid" },
    { code: "DHA", name: "Docosahexaenoic acid" },
    // Lipids — phospholipids
    { code: "PCW", name: "1,2-Distearoyl-sn-glycerophosphatidylcholine" },
    { code: "PEE", name: "1,2-Distearoyl-sn-glycerophosphatidylethanolamine" },
    { code: "LPP", name: "1-Palmitoyl-2-oleoyl-sn-glycero-3-phosphocholine" },
    // Steroids
    { code: "CLR", name: "Cholesterol" },
    { code: "EST", name: "Estradiol" },
    { code: "TES", name: "Testosterone" },
    { code: "STR", name: "Staurosporine" },
    // Common buffers & cryoprotectants
    { code: "GOL", name: "Glycerol" },
    { code: "EDO", name: "1,2-Ethanediol" },
    { code: "PEG", name: "Polyethylene glycol" },
    { code: "EPE", name: "HEPES" },
    { code: "MES", name: "MES buffer" },
    { code: "TRS", name: "Tris buffer" },
    { code: "ACT", name: "Acetate ion" },
    { code: "FMT", name: "Formic acid" },
    { code: "CIT", name: "Citric acid" },
    { code: "EOH", name: "Ethanol" },
    { code: "DMS", name: "Dimethyl sulfoxide" },
    // Signaling
    { code: "CMP", name: "Cyclic AMP" },
    { code: "CGP", name: "Cyclic GMP" },
    { code: "IP3", name: "Inositol 1,4,5-trisphosphate" },
    { code: "PIP", name: "Phosphatidylinositol" },
    // Drugs / Toxins
    { code: "TXS", name: "Taxol (Paclitaxel)" },
    { code: "VBL", name: "Vinblastine" },
    { code: "MTX", name: "Methotrexate" },
    { code: "RFP", name: "Rifampicin" },
    { code: "IMD", name: "Imidazole" },
  ],

  // ── Ions ──
  IONS: [
    { code: "MG", name: "Magnesium (Mg²⁺)" },
    { code: "CA", name: "Calcium (Ca²⁺)" },
    { code: "NA", name: "Sodium (Na⁺)" },
    { code: "K",  name: "Potassium (K⁺)" },
    { code: "LI", name: "Lithium (Li⁺)" },
    { code: "RB", name: "Rubidium (Rb⁺)" },
    { code: "CS", name: "Cesium (Cs⁺)" },
    { code: "SR", name: "Strontium (Sr²⁺)" },
    { code: "BA", name: "Barium (Ba²⁺)" },
    { code: "ZN", name: "Zinc (Zn²⁺)" },
    { code: "FE", name: "Iron (Fe²⁺/Fe³⁺)" },
    { code: "FE2", name: "Iron (Fe²⁺)" },
    { code: "MN", name: "Manganese (Mn²⁺)" },
    { code: "CO", name: "Cobalt (Co²⁺)" },
    { code: "CU", name: "Copper (Cu²⁺)" },
    { code: "CU1", name: "Copper (Cu⁺)" },
    { code: "NI", name: "Nickel (Ni²⁺)" },
    { code: "CD", name: "Cadmium (Cd²⁺)" },
    { code: "HG", name: "Mercury (Hg²⁺)" },
    { code: "PT", name: "Platinum (Pt²⁺/Pt⁴⁺)" },
    { code: "AU", name: "Gold (Au⁺/Au³⁺)" },
    { code: "AG", name: "Silver (Ag⁺)" },
    { code: "TL", name: "Thallium (Tl⁺)" },
    { code: "PB", name: "Lead (Pb²⁺)" },
    { code: "CR", name: "Chromium (Cr³⁺)" },
    { code: "MO", name: "Molybdenum (Mo)" },
    { code: "V",  name: "Vanadium (V)" },
    { code: "W",  name: "Tungsten (W)" },
    { code: "CL", name: "Chloride (Cl⁻)" },
    { code: "F",  name: "Fluoride (F⁻)" },
    { code: "BR", name: "Bromide (Br⁻)" },
    { code: "IOD", name: "Iodide (I⁻)" },
    { code: "PO4", name: "Phosphate (PO₄³⁻)" },
    { code: "SO4", name: "Sulfate (SO₄²⁻)" },
    { code: "NO3", name: "Nitrate (NO₃⁻)" },
    { code: "CO3", name: "Carbonate (CO₃²⁻)" },
    { code: "ACT", name: "Acetate (CH₃COO⁻)" },
    { code: "SF4", name: "Iron-sulfur cluster (SF4)" },
    { code: "FES", name: "Iron-sulfur cluster (FES)" },
    { code: "F3S", name: "Iron-sulfur cluster (F3S)" },
  ],

  // ── Mount ──
  mount() {
    this.entityCounter = 0;
    const el = document.getElementById("panel-submit");
    el.innerHTML = `
      <div class="mb-4">
        <h5 style="font-weight:500;margin:0;">Input molecules</h5>
        <small style="color:var(--text-secondary)">Add protein, DNA, RNA, ligand, or ion entities to your prediction.</small>
      </div>

      <!-- Entity selector row -->
      <div class="entity-selector-row">
        <select class="form-select" id="entityTypeSelect" style="width:180px;">
          <option value="">-- Select entity type --</option>
          <option value="protein"><i class="bi bi-circle-fill"></i> Protein</option>
          <option value="dna">DNA</option>
          <option value="rna">RNA</option>
          <option value="ligand">Ligand</option>
          <option value="ion">Ion</option>
        </select>
        <button class="btn btn-primary btn-sm" id="addEntityBtn">
          <i class="bi bi-plus-lg"></i> Add entity
        </button>
      </div>

      <!-- Entity list -->
      <div id="entityList"></div>

      <!-- Job name & bonded pairs -->
      <div class="row mt-3" style="align-items:flex-start;">
        <div class="col-md-6">
          <label class="form-label">Job name</label>
          <input class="form-control" id="jobName" placeholder="My prediction" style="width:100%;">
        </div>
        <div class="col-md-6">
          <div id="bondedSection" class="d-none">
            <label class="form-label">Bonded atom pairs</label>
            <small style="color:var(--text-secondary);display:block;margin-bottom:4px;">Format: chain_id residue_number atom_name</small>
            <div id="bondedPairsList"></div>
            <button class="btn btn-outline-secondary btn-sm mt-1" id="addBondBtn" style="font-size:11px;">
              + Add bond
            </button>
          </div>
        </div>
      </div>

      <!-- Advanced settings -->
      <details class="mt-4" style="color:var(--text-secondary);">
        <summary style="cursor:pointer;font-size:13px;font-weight:500;">Advanced settings</summary>
        <div class="row mt-3">
          <div class="col-md-4 mb-3">
            <label class="form-label">Model Seeds</label>
            <input class="form-control" id="advSeeds" value="1" placeholder="e.g. 1,2,3">
            <small style="color:var(--text-secondary)">Comma-separated</small>
          </div>
          <div class="col-md-4 mb-3">
            <label class="form-label">Diffusion Samples</label>
            <input class="form-control" id="advSamples" type="number" value="" placeholder="Default">
          </div>
          <div class="col-md-4 mb-3">
            <label class="form-label">Flash Attention</label>
            <select class="form-select" id="advFlash">
              <option value="">Default</option>
              <option value="triton">Triton</option>
              <option value="cudnn">cuDNN</option>
              <option value="xla">XLA</option>
            </select>
          </div>
        </div>
      </details>

      <!-- Submit & Reset -->
      <div class="d-flex gap-2 mt-4">
        <button class="btn btn-primary" id="submitJobBtn">
          <i class="bi bi-play-fill"></i> Submit job
        </button>
        <button class="btn btn-outline-secondary" id="resetFormBtn">Reset</button>
      </div>
      <div id="submitError" class="alert alert-danger mt-2 d-none"></div>`;

    document.getElementById("addEntityBtn").addEventListener("click", () => {
      const type = document.getElementById("entityTypeSelect").value;
      if (!type) {
        document.getElementById("submitError").textContent = "Please select an entity type first.";
        document.getElementById("submitError").classList.remove("d-none");
        return;
      }
      this.addEntity(type);
      document.getElementById("entityTypeSelect").value = "";
    });

    document.getElementById("addBondBtn").addEventListener("click", () => this.addBondRow());
    document.getElementById("submitJobBtn").addEventListener("click", () => this.submit());
    document.getElementById("resetFormBtn").addEventListener("click", () => this.mount());
  },

  // ── Add entity ──
  addEntity(type) {
    this.entityCounter++;
    const id = `entity-${this.entityCounter}`;
    const labels = { protein: "Protein", dna: "DNA", rna: "RNA", ligand: "Ligand", ion: "Ion" };
    const chainId = String.fromCharCode(64 + this.entityCounter);
    const typeClass = type === "protein" ? "protein" : type === "rna" ? "rna" : type === "dna" ? "dna" : type === "ligand" ? "ligand" : "ion";

    let body = "";
    if (type === "protein" || type === "dna" || type === "rna") {
      const bases = type === "rna" ? "A/U/G/C" : type === "dna" ? "A/T/G/C" : "";
      const ph = type === "protein" ? "MADQLTEEQIAEFKEAF..." : type === "rna" ? "GCAUGC..." : "GCTAGC...";
      body = `
        <div class="sequence-editor" style="padding:12px 16px;">
          <div class="sequence-ruler ${id}-ruler"></div>
          <textarea class="form-control sequence-textarea ${id}-sequence" rows="2"
            placeholder="${ph}"
            style="width:100%;min-height:60px;"
            data-seq-type="${type}"></textarea>
          <div class="sequence-display ${id}-display" style="font-family:var(--mono);font-size:14px;color:var(--text-secondary);white-space:pre-wrap;word-break:break-all;margin-top:6px;display:none;line-height:1.7;"></div>
        </div>`;
    } else if (type === "ligand") {
      const ligOptions = this.LIGANDS.map(l =>
        `<option value="${l.code}">${l.name} [${l.code}]</option>`
      ).join("");
      body = `
        <div style="padding:12px 16px;">
          <select class="form-select ${id}-sequence" style="width:100%;">
            <option value="">-- Select a ligand --</option>
            <optgroup label="Nucleotides">${this._ligGroup(/^(ATP|ADP|AMP|GTP|GDP|GMP|CTP|CDP|CMP|UTP|UDP|UMP|TTP|TMP|ANP)$/)}</optgroup>
            <optgroup label="Nicotinamide / Flavins">${this._ligGroup(/^(NAD|NAI|NAP|NDP|FAD|FMN)$/)}</optgroup>
            <optgroup label="Coenzyme A">${this._ligGroup(/^(COA|ACO|COZ)$/)}</optgroup>
            <optgroup label="Hemes">${this._ligGroup(/^(HEM|HEC|HEA|HEB|HAS)$/)}</optgroup>
            <optgroup label="Chlorophylls">${this._ligGroup(/^(CLA|CL0|BCL|BCB|BPH)$/)}</optgroup>
            <optgroup label="Retinoids / Carotenoids">${this._ligGroup(/^(RET|RTL|BCR|LYC)$/)}</optgroup>
            <optgroup label="Cofactors">${this._ligGroup(/^(PLP|P5P|TPP|TDP|SAM|SAH|THF|FOL|B12|BLA|BLD|MQ7|UQ|U10)$/)}</optgroup>
            <optgroup label="Sugars">${this._ligGroup(/^(NAG|NDG|BMA|MAN|GAL|GLA|GLC|BGC|FUC|FUL|XYS|SIA)$/)}</optgroup>
            <optgroup label="Lipids">${this._ligGroup(/^(PLM|OLA|STE|MYR|PAM|LNL|LDA|DHA|PCW|PEE|LPP)$/)}</optgroup>
            <optgroup label="Steroids">${this._ligGroup(/^(CLR|EST|TES|STR)$/)}</optgroup>
            <optgroup label="Buffers / Solvents">${this._ligGroup(/^(GOL|EDO|PEG|EPE|MES|TRS|ACT|FMT|CIT|EOH|DMS)$/)}</optgroup>
            <optgroup label="Signaling">${this._ligGroup(/^(CMP|CGP|IP3|PIP)$/)}</optgroup>
            <optgroup label="Drugs / Toxins">${this._ligGroup(/^(TXS|VBL|MTX|RFP|IMD)$/)}</optgroup>
          </select>
        </div>`;
    } else if (type === "ion") {
      const ionOptions = this.IONS.map(ion =>
        `<option value="${ion.code}">${ion.name} [${ion.code}]</option>`
      ).join("");
      body = `
        <div style="padding:12px 16px;">
          <select class="form-select ${id}-sequence" style="width:100%;">
            <option value="">-- Select an ion --</option>
            <optgroup label="Group 1 & 2">${this._ionGroup(/^(MG|CA|NA|K|LI|RB|CS|SR|BA)$/)}</optgroup>
            <optgroup label="Transition metals">${this._ionGroup(/^(ZN|FE|FE2|MN|CO|CU|CU1|NI|CD|HG|PT|AU|AG|TL|PB|CR|MO|V|W)$/)}</optgroup>
            <optgroup label="Anions">${this._ionGroup(/^(CL|F|BR|IOD)$/)}</optgroup>
            <optgroup label="Polyatomic">${this._ionGroup(/^(PO4|SO4|NO3|CO3|ACT)$/)}</optgroup>
            <optgroup label="Cofactors">${this._ionGroup(/^(SF4|FES|F3S)$/)}</optgroup>
          </select>
        </div>`;
    }

    const card = document.createElement("div");
    card.className = "entity-card";
    card.id = id;
    card.setAttribute("data-entity-type", type);
    card.innerHTML = `
      <div class="entity-header-row">
        <span class="entity-type-badge ${typeClass}">${labels[type]}</span>
        <input class="chain-id-input ${id}-chainId" value="${chainId}" maxlength="4" title="Chain ID">
        <div class="flex-fill"></div>
        <div class="copies-group">
          <label>Copies</label>
          <input class="${id}-copies" type="number" value="1" min="1" max="99">
        </div>
        <button class="btn btn-sm remove-entity" title="Remove entity" style="border:none;background:none;font-size:18px;line-height:1;padding:0 4px;">&times;</button>
      </div>
      ${body}`;
    document.getElementById("entityList").appendChild(card);

    card.querySelector(".remove-entity").addEventListener("click", () => {
      card.remove();
      this.updateBondedSection();
    });

    // Sequence formatting for protein/DNA/RNA
    if (type === "protein" || type === "dna" || type === "rna") {
      const textarea = card.querySelector(`.${id}-sequence`);
      const ruler = card.querySelector(`.${id}-ruler`);
      const display = card.querySelector(`.${id}-display`);

      textarea.addEventListener("input", () => {
        this._updateRuler(textarea, ruler);
      });

      textarea.addEventListener("blur", () => {
        this._formatSequence(textarea, ruler, display);
      });

      textarea.addEventListener("focus", () => {
        if (display.style.display !== "none") {
          textarea.value = textarea.value.replace(/\s/g, "");
          display.style.display = "none";
        }
      });
    }

    this.updateBondedSection();
  },

  // ── Sequence formatting ──
  _updateRuler(textarea, rulerEl) {
    const raw = textarea.value.replace(/\s/g, "");
    if (!raw.length) { rulerEl.textContent = ""; return; }
    // Build ruler: show position numbers every 10 residues
    let r = "";
    for (let i = 0; i < raw.length; i++) {
      if ((i + 1) % 10 === 0) {
        const n = String(i + 1);
        r += n + " ".repeat(Math.max(0, 10 - n.length));
      } else {
        r += " ";
      }
    }
    rulerEl.textContent = r;
  },

  _formatSequence(textarea, rulerEl, displayEl) {
    const raw = textarea.value.replace(/\s/g, "").replace(/[^A-Za-z]/g, "").toUpperCase();
    if (!raw) { rulerEl.textContent = ""; displayEl.style.display = "none"; return; }
    // Update textarea with clean sequence
    textarea.value = raw;
    // Build ruler
    let r = "";
    for (let i = 0; i < raw.length; i++) {
      if ((i + 1) % 10 === 0) {
        const n = String(i + 1);
        r += n + " ".repeat(Math.max(0, 10 - n.length));
      } else {
        r += " ";
      }
    }
    rulerEl.textContent = r;
    // Build chunked display
    const chunks = [];
    for (let i = 0; i < raw.length; i += 10) {
      chunks.push(raw.substring(i, i + 10));
    }
    displayEl.textContent = chunks.join(" ");
    displayEl.style.display = "block";
  },

  _ligGroup(rx) {
    return this.LIGANDS.filter(l => rx.test(l.code)).map(l =>
      `<option value="${l.code}">${l.name} [${l.code}]</option>`
    ).join("");
  },

  _ionGroup(rx) {
    return this.IONS.filter(i => rx.test(i.code)).map(i =>
      `<option value="${i.code}">${i.name} [${i.code}]</option>`
    ).join("");
  },

  // ── Bonded pairs ──
  updateBondedSection() {
    const count = document.querySelectorAll(".entity-card").length;
    document.getElementById("bondedSection").classList.toggle("d-none", count < 2);
  },

  addBondRow() {
    const row = document.createElement("div");
    row.className = "bond-row d-flex gap-1 align-items-center mb-1";
    row.innerHTML = `
      <input class="bond-c1" placeholder="Chain" style="width:52px;font-size:12px;">
      <input class="bond-r1" placeholder="Res#" style="width:56px;font-size:12px;">
      <input class="bond-n1" placeholder="Atom" style="width:72px;font-size:12px;">
      <span style="color:var(--text-secondary);">&mdash;</span>
      <input class="bond-c2" placeholder="Chain" style="width:52px;font-size:12px;">
      <input class="bond-r2" placeholder="Res#" style="width:56px;font-size:12px;">
      <input class="bond-n2" placeholder="Atom" style="width:72px;font-size:12px;">
      <button class="btn btn-sm remove-bond" style="border:none;background:none;color:var(--text-secondary);">&times;</button>`;
    document.getElementById("bondedPairsList").appendChild(row);
    row.querySelector(".remove-bond").addEventListener("click", () => row.remove());
  },

  // ── Submit ──
  async submit() {
    const errorEl = document.getElementById("submitError");
    errorEl.classList.add("d-none");

    const name = document.getElementById("jobName").value.trim() || "Unnamed";
    const seedsStr = document.getElementById("advSeeds").value.trim() || "1";
    const seeds = seedsStr.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (!seeds.length) {
      errorEl.textContent = "Invalid model seeds";
      errorEl.classList.remove("d-none");
      return;
    }

    const sequences = [];
    document.querySelectorAll(".entity-card").forEach(card => {
      const badge = card.querySelector(".entity-type-badge");
      const chainInput = card.querySelector(".chain-id-input");
      if (!badge || !chainInput) return;
      const type = badge.textContent.trim().toLowerCase();
      const chainIdBase = chainInput.value.trim() || "X";

      const seqEl = card.querySelector(".sequence-textarea, input[class*='-sequence'], select[class*='-sequence']");
      const copiesEl = card.querySelector("[class*='-copies']");
      const value = seqEl ? seqEl.value.trim() : "";
      const copies = copiesEl ? parseInt(copiesEl.value) || 1 : 1;

      if (!value) return;

      for (let c = 0; c < copies; c++) {
        const chainId = copies > 1 ? `${chainIdBase}${c + 1}` : chainIdBase;
        const entity = {};
        if (type === "protein") {
          entity.protein = { id: chainId, sequence: value };
        } else if (type === "rna") {
          entity.rna = { id: chainId, sequence: value };
        } else if (type === "dna") {
          entity.dna = { id: chainId, sequence: value };
        } else if (type === "ligand" || type === "ion") {
          entity.ligand = { id: chainId, ccdCodes: [value] };
        }
        sequences.push(entity);
      }
    });

    if (!sequences.length) {
      errorEl.textContent = "Please add at least one entity with input data.";
      errorEl.classList.remove("d-none");
      return;
    }

    // Bonded atom pairs
    const bondedAtomPairs = [];
    document.querySelectorAll(".bond-row").forEach(row => {
      const c1 = row.querySelector(".bond-c1").value.trim();
      const r1 = parseInt(row.querySelector(".bond-r1").value);
      const n1 = row.querySelector(".bond-n1").value.trim();
      const c2 = row.querySelector(".bond-c2").value.trim();
      const r2 = parseInt(row.querySelector(".bond-r2").value);
      const n2 = row.querySelector(".bond-n2").value.trim();
      if (c1 && !isNaN(r1) && n1 && c2 && !isNaN(r2) && n2) {
        bondedAtomPairs.push([[c1, r1, n1], [c2, r2, n2]]);
      }
    });

    const payload = { name, modelSeeds: seeds, sequences };
    if (bondedAtomPairs.length) payload.bondedAtomPairs = bondedAtomPairs;

    const samples = parseInt(document.getElementById("advSamples").value);
    if (samples > 0) payload.numSamples = samples;

    document.getElementById("submitJobBtn").disabled = true;
    try {
      await API.submitJob(payload);
      window.location.hash = "#queue";
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.classList.remove("d-none");
    } finally {
      document.getElementById("submitJobBtn").disabled = false;
    }
  },
};
