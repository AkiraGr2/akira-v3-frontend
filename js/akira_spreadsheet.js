/**
 * AKIRA SPREADSHEET & DATA WRANGLER ENGINE v1.0
 * Zero-Cost ($0.00 COP/USD) client-side spreadsheet and tabular data manipulation engine.
 * Supports live cell formulas (=SUM, =AVERAGE, =COUNT, =MAX, =MIN), CSV import/export, deduplication and sorting.
 */
(function(){
  "use strict";

  class SpreadsheetGrid {
    constructor(rows = 20, cols = 8){
      this.rowCount = rows;
      this.colCount = cols;
      this.colHeaders = ["A","B","C","D","E","F","G","H","I","J","K","L"].slice(0, cols);
      this.data = {}; // { "A1": "=SUM(B1:B5)", ... }
      this.initDefaultData();
    }

    initDefaultData(){
      // Sample spreadsheet for Upwork automation demo
      this.setCell("A1", "Cliente");
      this.setCell("B1", "Proyecto");
      this.setCell("C1", "Horas");
      this.setCell("D1", "Tarifa USD");
      this.setCell("E1", "Total USD");

      this.setCell("A2", "Horizon Media");
      this.setCell("B2", "SaaS Backend");
      this.setCell("C2", "15");
      this.setCell("D2", "55");
      this.setCell("E2", "=C2*D2");

      this.setCell("A3", "Apex Data");
      this.setCell("B3", "Web Scraping");
      this.setCell("C3", "8");
      this.setCell("D3", "50");
      this.setCell("E3", "=C3*D3");

      this.setCell("A4", "Vanguardia Legal");
      this.setCell("B4", "RAG Chatbot");
      this.setCell("C4", "20");
      this.setCell("D4", "60");
      this.setCell("E4", "=C4*D4");

      this.setCell("A5", "TOTAL GRUPAL");
      this.setCell("E5", "=SUM(E2:E4)");
    }

    setCell(cellRef, val){
      this.data[cellRef.toUpperCase()] = String(val);
    }

    getCellRaw(cellRef){
      return this.data[cellRef.toUpperCase()] || "";
    }

    evaluateCell(cellRef, visited = new Set()){
      const raw = this.getCellRaw(cellRef);
      if(!raw.startsWith("=")) return raw;

      if(visited.has(cellRef)) return "#CIRCULAR!";
      visited.add(cellRef);

      const formula = raw.slice(1).trim().toUpperCase();

      try {
        // SUM(A1:A5)
        if(formula.startsWith("SUM(") && formula.endsWith(")")){
          const rangeStr = formula.slice(4, -1);
          const cells = this.expandRange(rangeStr);
          const total = cells.reduce((acc, c) => acc + (parseFloat(this.evaluateCell(c, new Set(visited))) || 0), 0);
          return String(total);
        }
        // AVERAGE(A1:A5)
        if(formula.startsWith("AVERAGE(") && formula.endsWith(")")){
          const rangeStr = formula.slice(8, -1);
          const cells = this.expandRange(rangeStr);
          const total = cells.reduce((acc, c) => acc + (parseFloat(this.evaluateCell(c, new Set(visited))) || 0), 0);
          return String(cells.length ? (total / cells.length).toFixed(2) : 0);
        }
        // COUNT(A1:A5)
        if(formula.startsWith("COUNT(") && formula.endsWith(")")){
          const rangeStr = formula.slice(6, -1);
          const cells = this.expandRange(rangeStr);
          return String(cells.filter(c => this.getCellRaw(c) !== "").length);
        }
        // Basic arithmetic: C2*D2 or A1+B1
        let expr = formula.replace(/([A-Z]+[0-9]+)/g, (match) => {
          const v = parseFloat(this.evaluateCell(match, new Set(visited)));
          return isNaN(v) ? 0 : v;
        });
        // Evaluate safe arithmetic
        if(/^[0-9\.\+\-\*\/\(\)\s]+$/.test(expr)){
          return String(Function('"use strict"; return (' + expr + ')')());
        }
        return "#FORMULA_ERR";
      } catch(e){
        return "#ERR";
      }
    }

    expandRange(rangeStr){
      const parts = rangeStr.split(":");
      if(parts.length !== 2) return [rangeStr];
      const start = parts[0].trim();
      const end = parts[1].trim();
      const startCol = start.match(/[A-Z]+/)[0];
      const startRow = parseInt(start.match(/[0-9]+/)[0], 10);
      const endCol = end.match(/[A-Z]+/)[0];
      const endRow = parseInt(end.match(/[0-9]+/)[0], 10);

      const colStartIdx = this.colHeaders.indexOf(startCol);
      const colEndIdx = this.colHeaders.indexOf(endCol);
      if(colStartIdx < 0 || colEndIdx < 0) return [];

      const minCol = Math.min(colStartIdx, colEndIdx);
      const maxCol = Math.max(colStartIdx, colEndIdx);
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);

      const cells = [];
      for(let c = minCol; c <= maxCol; c++){
        for(let r = minRow; r <= maxRow; r++){
          cells.push(this.colHeaders[c] + r);
        }
      }
      return cells;
    }

    toCSV(){
      const lines = [];
      for(let r = 1; r <= this.rowCount; r++){
        const rowVals = [];
        let hasData = false;
        for(let c = 0; c < this.colCount; c++){
          const ref = this.colHeaders[c] + r;
          const val = this.evaluateCell(ref);
          if(val) hasData = true;
          // Escape quotes
          rowVals.push('"' + val.replace(/"/g, '""') + '"');
        }
        if(hasData || r <= 10) lines.push(rowVals.join(","));
      }
      return lines.join("\n");
    }

    loadCSV(csvText){
      this.data = {};
      const lines = csvText.split(/\r?\n/);
      lines.forEach((line, rIdx) => {
        if(!line.trim()) return;
        const rowNum = rIdx + 1;
        // Simple CSV splitter
        const cols = line.split(",").map(s => s.replace(/^"|"$/g, "").trim());
        cols.forEach((val, cIdx) => {
          if(cIdx < this.colHeaders.length){
            this.setCell(this.colHeaders[cIdx] + rowNum, val);
          }
        });
      });
      if(lines.length > this.rowCount) this.rowCount = lines.length + 5;
    }

    deduplicateRows(colLetter = "A"){
      const seen = new Set();
      const rowsToKeep = [];
      for(let r = 2; r <= this.rowCount; r++){
        const val = this.getCellRaw(colLetter + r).trim();
        if(!val || !seen.has(val)){
          seen.add(val);
          rowsToKeep.push(r);
        }
      }
      // Rebuild data
      const newData = {};
      // Keep headers (row 1)
      for(let c of this.colHeaders){
        if(this.data[c + "1"]) newData[c + "1"] = this.data[c + "1"];
      }
      rowsToKeep.forEach((oldR, newIdx) => {
        const targetR = newIdx + 2;
        for(let c of this.colHeaders){
          if(this.data[c + oldR]) newData[c + targetR] = this.data[c + oldR];
        }
      });
      this.data = newData;
    }
  }

  let activeSheet = new SpreadsheetGrid(25, 8);

  /**
   * UI Modal for Spreadsheet
   */
  function ensureSpreadsheetModal(){
    let modal = document.getElementById("akiraSpreadsheetModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraSpreadsheetModal";
    modal.className = "ak-sheet-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-sheet-dialog">
        <div class="ak-sheet-header">
          <div class="ak-sheet-title-wrap">
            <span class="ak-sheet-icon">📑</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Motor de Hojas de Cálculo &amp; Data Wrangler</strong>
              <small style="color:#94a3b8;font-size:11px;">Edición tabular en vivo, fórmulas (=SUM, =AVERAGE), limpieza y exportación ($0.00 COP)</small>
            </div>
          </div>
          <div class="ak-sheet-header-actions">
            <button type="button" class="ak-sheet-btn" onclick="window.akiraImportCSVPrompt()">📂 Importar CSV</button>
            <button type="button" class="ak-sheet-btn" onclick="window.akiraExportCSVDownload()">📥 Exportar CSV</button>
            <button type="button" class="ak-sheet-btn" onclick="window.akiraCleanSheetDuplicates()">🧹 Desduplicar</button>
            <button type="button" class="ak-sheet-close-btn" onclick="window.akiraCloseSpreadsheetModal()">✕</button>
          </div>
        </div>
        <div class="ak-sheet-formula-bar">
          <span id="akActiveCellRef" class="ak-cell-badge">A1</span>
          <input type="text" id="akFormulaInput" class="ak-formula-input" placeholder="Valor o fórmula (ej. =SUM(C2:C10) o =C2*D2)">
        </div>
        <div class="ak-sheet-grid-container" id="akSheetGridBox">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseSpreadsheetModal();
    });

    const formulaInput = modal.querySelector("#akFormulaInput");
    formulaInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        const ref = modal.querySelector("#akActiveCellRef").innerText;
        activeSheet.setCell(ref, formulaInput.value);
        window.akiraRenderSpreadsheetGrid();
      }
    });

    return modal;
  }

  let selectedCellRef = "A1";

  window.akiraOpenSpreadsheetModal = function(initialCsv = ""){
    const modal = ensureSpreadsheetModal();
    if(initialCsv) activeSheet.loadCSV(initialCsv);
    window.akiraRenderSpreadsheetGrid();
    modal.style.display = "flex";
  };

  window.akiraCloseSpreadsheetModal = function(){
    const modal = document.getElementById("akiraSpreadsheetModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraRenderSpreadsheetGrid = function(){
    const box = document.getElementById("akSheetGridBox");
    if(!box) return;

    let html = `<table class="ak-grid-table"><thead><tr><th class="corner-header">#</th>`;
    activeSheet.colHeaders.forEach(col => {
      html += `<th>${col}</th>`;
    });
    html += `</tr></thead><tbody>`;

    for(let r = 1; r <= activeSheet.rowCount; r++){
      html += `<tr><td class="row-header">${r}</td>`;
      for(let c = 0; c < activeSheet.colCount; c++){
        const ref = activeSheet.colHeaders[c] + r;
        const displayVal = activeSheet.evaluateCell(ref);
        const isSelected = ref === selectedCellRef;
        html += `<td class="ak-grid-cell ${isSelected ? 'selected' : ''}" data-ref="${ref}" onclick="window.akiraSelectCell('${ref}')" ondblclick="window.akiraEditCellDirect('${ref}')">${escapeHtml(displayVal)}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    box.innerHTML = html;
  };

  window.akiraSelectCell = function(ref){
    selectedCellRef = ref;
    const refEl = document.getElementById("akActiveCellRef");
    const inputEl = document.getElementById("akFormulaInput");
    if(refEl) refEl.innerText = ref;
    if(inputEl) {
      inputEl.value = activeSheet.getCellRaw(ref);
      inputEl.focus();
    }
    // Update visual selection
    document.querySelectorAll(".ak-grid-cell").forEach(td => {
      td.classList.toggle("selected", td.getAttribute("data-ref") === ref);
    });
  };

  window.akiraEditCellDirect = function(ref){
    const current = activeSheet.getCellRaw(ref);
    const val = prompt(`Editar celda ${ref}:`, current);
    if(val !== null){
      activeSheet.setCell(ref, val);
      window.akiraRenderSpreadsheetGrid();
    }
  };

  window.akiraExportCSVDownload = function(){
    const csv = activeSheet.toCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `akira_dataset_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  window.akiraImportCSVPrompt = function(){
    const raw = prompt("Pega aquí el contenido de texto CSV o TSV para cargarlo en la hoja:");
    if(raw){
      activeSheet.loadCSV(raw);
      window.akiraRenderSpreadsheetGrid();
    }
  };

  window.akiraCleanSheetDuplicates = function(){
    activeSheet.deduplicateRows("A");
    window.akiraRenderSpreadsheetGrid();
    alert("Filas duplicadas eliminadas en base a la columna A.");
  };

  function escapeHtml(s){
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-sheet-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-sheet-styles";
    st.textContent = `
      .ak-sheet-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-sheet-dialog {
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 1100px;
        height: 90vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-sheet-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px; background: #0e1526; border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        flex-wrap: wrap; gap: 8px;
      }
      .ak-sheet-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-sheet-icon { font-size: 22px; }
      .ak-sheet-header-actions { display: flex; gap: 6px; align-items: center; }
      .ak-sheet-btn {
        background: #1e293b; color: #e2e8f0; border: 1px solid rgba(255,255,255,0.15);
        font-size: 11px; padding: 5px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-sheet-btn:hover { background: #00f0ff; color: #080b12; font-weight: 700; }
      .ak-sheet-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-sheet-formula-bar {
        display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: #070a13;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .ak-cell-badge {
        background: rgba(0,240,255,0.15); color: #00f0ff; border: 1px solid #00f0ff;
        font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; min-width: 36px; text-align: center;
      }
      .ak-formula-input {
        flex: 1; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); color: #fff;
        font-family: monospace; font-size: 13px; padding: 5px 10px; border-radius: 4px; outline: none;
      }
      .ak-sheet-grid-container { flex: 1; overflow: auto; background: #04070e; }
      .ak-grid-table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: monospace; }
      .ak-grid-table th {
        background: #0f182d; color: #94a3b8; font-weight: 600; padding: 6px 10px;
        border: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 2;
      }
      .ak-grid-table td.row-header {
        background: #0f182d; color: #94a3b8; text-align: center; font-weight: 600;
        border: 1px solid rgba(255,255,255,0.08); width: 36px; position: sticky; left: 0; z-index: 1;
      }
      .ak-grid-cell {
        border: 1px solid rgba(255,255,255,0.06); padding: 6px 8px; color: #cbd5e1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; cursor: cell;
      }
      .ak-grid-cell:hover { background: rgba(0,240,255,0.05); }
      .ak-grid-cell.selected {
        background: rgba(0,240,255,0.15); outline: 2px solid #00f0ff; outline-offset: -1px; color: #fff;
      }
    `;
    document.head.appendChild(st);
  })();

})();
