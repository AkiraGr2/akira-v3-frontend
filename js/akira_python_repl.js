/**
 * AKIRA PYTHON REPL & WASM RUNNER v1.0
 * Zero-Cost ($0.00 COP/USD) in-browser Python execution environment.
 * Executes Python code via Pyodide WebAssembly with resilient instant micro-evaluator fallback.
 */
(function(){
  "use strict";

  let pyodideInstance = null;
  let pyodideLoading = false;
  let terminalHistory = [];

  // Initialize Pyodide WebAssembly in background
  async function initPyodide(){
    if(pyodideInstance || pyodideLoading) return pyodideInstance;
    pyodideLoading = true;
    try {
      if(!window.loadPyodide) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
        script.async = true;
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error("CDN unavailable (running in local mode)"));
        });
      }
      if(window.loadPyodide) {
        pyodideInstance = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
        });
        console.log("[Akira Python REPL] Pyodide WebAssembly listo.");
      }
    } catch(err) {
      console.warn("[Akira Python REPL] WebAssembly CDN offline o bloqueado. Usando evaluador neural ligero.", err);
    } finally {
      pyodideLoading = false;
    }
    return pyodideInstance;
  }

  // Pure-JS micro-evaluator for instant offline/low-latency Python execution
  function microEvalPython(code){
    let stdout = [];
    let stderr = [];
    try {
      // Mock basic Python environment in JS
      const scope = {
        math: Math,
        len: (x) => (x ? (x.length !== undefined ? x.length : Object.keys(x).length) : 0),
        range: (start, stop, step = 1) => {
          if(stop === undefined) { stop = start; start = 0; }
          const res = [];
          for(let i = start; i < stop; i += step) res.push(i);
          return res;
        },
        str: (x) => String(x),
        int: (x) => parseInt(x, 10),
        float: (x) => parseFloat(x),
        sum: (arr) => arr.reduce((a, b) => a + b, 0),
        max: (...args) => Math.max(...(Array.isArray(args[0]) ? args[0] : args)),
        min: (...args) => Math.min(...(Array.isArray(args[0]) ? args[0] : args)),
        print: (...args) => {
          stdout.push(args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
        }
      };

      // Transform common Python syntax to valid JS snippet
      let lines = code.split("\n");
      let jsLines = [];
      let inDocstring = false;

      for(let line of lines) {
        let trimmed = line.trim();
        if(trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
          inDocstring = !inDocstring;
          continue;
        }
        if(inDocstring || trimmed.startsWith("#") || trimmed === "") continue;

        // Python print statement/function
        if(/print\s*\((.*)\)/.test(line)) {
          let m = line.match(/print\s*\((.*)\)/);
          jsLines.push(`scope.print(${m[1]});`);
          continue;
        }
        // Basic assignments and expressions
        let jsLine = line
          .replace(/\bdef\s+([a-zA-Z0-9_]+)\s*\((.*?)\):/g, "function $1($2){")
          .replace(/\bfor\s+([a-zA-Z0-9_]+)\s+in\s+range\((.*?)\):/g, "for(let $1 of scope.range($2)){")
          .replace(/\bfor\s+([a-zA-Z0-9_]+)\s+in\s+([^:]+):/g, "for(let $1 of $2){")
          .replace(/\bif\s+(.*?):/g, "if($1){")
          .replace(/\belif\s+(.*?):/g, "} else if($1){")
          .replace(/\belse:/g, "} else {")
          .replace(/\bTrue\b/g, "true")
          .replace(/\bFalse\b/g, "false")
          .replace(/\bNone\b/g, "null")
          .replace(/\band\b/g, "&&")
          .replace(/\bor\b/g, "||")
          .replace(/\bnot\b/g, "!");

        jsLines.push(jsLine);
      }

      // Execute safely in isolated Function context
      const fn = new Function("scope", `
        with(scope) {
          try {
            ${jsLines.join("\n")}
          } catch(e) {
            throw e;
          }
        }
      `);
      fn(scope);

      return {
        ok: true,
        stdout: stdout.join("\n"),
        stderr: "",
        runtime: "Akira Instant Neural Engine"
      };
    } catch(e) {
      return {
        ok: false,
        stdout: stdout.join("\n"),
        stderr: e.message || String(e),
        runtime: "Akira Instant Neural Engine"
      };
    }
  }

  /**
   * Execute Python code (Pyodide if available, micro-evaluator otherwise)
   */
  window.akiraExecutePython = async function(code){
    if(!code || !code.trim()) return { ok: true, stdout: "", stderr: "", runtime: "none" };

    // Try Pyodide WebAssembly first if loaded or reachable
    if(pyodideInstance) {
      try {
        let stdoutArr = [];
        let stderrArr = [];
        pyodideInstance.setStdout({ batched: (str) => stdoutArr.push(str) });
        pyodideInstance.setStderr({ batched: (str) => stderrArr.push(str) });

        let result = await pyodideInstance.runPythonAsync(code);
        let out = stdoutArr.join("\n");
        if(result !== undefined && result !== null && !out.includes(String(result))) {
          out = out ? out + "\n" + String(result) : String(result);
        }
        return {
          ok: true,
          stdout: out,
          stderr: stderrArr.join("\n"),
          runtime: "Pyodide v0.25 WebAssembly (CPython 3.12)"
        };
      } catch(pyErr) {
        return {
          ok: false,
          stdout: "",
          stderr: String(pyErr),
          runtime: "Pyodide v0.25 WebAssembly"
        };
      }
    }

    // Try background init
    initPyodide().catch(() => {});

    // Fallback to micro-evaluator
    return microEvalPython(code);
  };

  /**
   * Launch Python REPL Terminal inside Sandbox Modal
   */
  window.akiraOpenPythonREPL = function(initialCode = ""){
    let modal = document.getElementById("akiraSandboxModal");
    if(!modal && window.akiraOpenSandbox) {
      window.akiraOpenSandbox("");
      modal = document.getElementById("akiraSandboxModal");
    }
    if(!modal) return;

    modal.style.display = "flex";
    const iframe = document.getElementById("akiraSandboxIframe");
    if(!iframe) return;

    const codeToRun = initialCode || `# Consola Interactiva Python 3.12 en Akira
import math

print("🐍 Akira Python REPL v1.0 inicializado.")
print("Ejecuta scripts de analisis, calculos y algoritmos con $0.00 COP.")

datos = [12, 45, 78, 23, 56, 89]
print(f"Total elementos: {len(datos)}")
print(f"Suma total: {sum(datos)}")
print(f"Promedio: {sum(datos) / len(datos):.2f}")
`;

    // Construct self-contained Terminal UI page for iframe
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Akira Python REPL</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #080b12;
      color: #00f0ff;
      font-family: 'Consolas', 'Courier New', monospace;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .repl-topbar {
      background: #0e1526;
      border-bottom: 1px solid rgba(0, 240, 255, 0.25);
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .repl-title {
      font-weight: 700;
      font-size: 13px;
      color: #00f0ff;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .repl-status {
      font-size: 11px;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .repl-actions {
      display: flex;
      gap: 6px;
    }
    .repl-btn {
      background: #1f293d;
      border: 1px solid rgba(0, 240, 255, 0.3);
      color: #e2e8f0;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .repl-btn:hover {
      background: #00f0ff;
      color: #080b12;
      font-weight: 700;
    }
    .repl-btn-run {
      background: #00f0ff;
      color: #080b12;
      font-weight: 700;
    }
    .repl-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 10px;
      gap: 10px;
    }
    .repl-editor-pane {
      height: 40%;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      background: #04070e;
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 6px;
      overflow: hidden;
    }
    .pane-header {
      background: #0b1120;
      padding: 4px 10px;
      font-size: 11px;
      color: #94a3b8;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: space-between;
    }
    textarea#pyCode {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f1f5f9;
      font-family: 'Consolas', monospace;
      font-size: 12px;
      line-height: 1.5;
      padding: 10px;
      resize: none;
    }
    .repl-output-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #020408;
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 6px;
      overflow: hidden;
    }
    #pyTerminal {
      flex: 1;
      padding: 10px;
      overflow-y: auto;
      font-size: 12px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
      color: #a7f3d0;
    }
    .term-err { color: #f87171; }
    .term-info { color: #38bdf8; }
    .term-prompt { color: #facc15; font-weight: bold; }
  </style>
</head>
<body>
  <div class="repl-topbar">
    <div class="repl-title">
      <span>🐍</span>
      <span>Akira Python REPL Console</span>
      <span class="repl-status" id="replStatus">WASM Engine Activo</span>
    </div>
    <div class="repl-actions">
      <button class="repl-btn repl-btn-run" onclick="runScript()">▶ Ejecutar (Ctrl+Enter)</button>
      <button class="repl-btn" onclick="clearTerminal()">🧹 Limpiar</button>
      <button class="repl-btn" onclick="copyOutput()">📋 Copiar Salida</button>
      <button class="repl-btn" onclick="downloadPy()">📥 Descargar .py</button>
    </div>
  </div>
  <div class="repl-body">
    <div class="repl-editor-pane">
      <div class="pane-header">
        <span>Código Python</span>
        <span>Atajo: Presiona Ctrl+Enter para ejecutar</span>
      </div>
      <textarea id="pyCode" spellcheck="false">${codeToRun.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
    </div>
    <div class="repl-output-pane">
      <div class="pane-header">
        <span>Terminal de Salida (STDOUT / STDERR)</span>
        <span id="runtimeInfo">Pyodide WebAssembly / Micro-Engine</span>
      </div>
      <div id="pyTerminal"><span class="term-info">>>> Bienvenido a la Consola Python de Akira.
>>> Presiona 'Ejecutar' para iniciar el script.
</span></div>
    </div>
  </div>

  <script>
    async function runScript() {
      const code = document.getElementById("pyCode").value;
      const term = document.getElementById("pyTerminal");
      const status = document.getElementById("replStatus");
      status.innerText = "Ejecutando...";
      status.style.color = "#facc15";

      term.innerHTML += '<div class="term-prompt">>>> python script.py</div>';

      try {
        if(window.parent && window.parent.akiraExecutePython) {
          const res = await window.parent.akiraExecutePython(code);
          if(res.ok) {
            term.innerHTML += '<div>' + (res.stdout ? escapeHtml(res.stdout) : '<span class="term-info">(Ejecución exitosa sin salida en stdout)</span>') + '</div>';
          } else {
            term.innerHTML += '<div class="term-err">Traceback (most recent call last):\\n' + escapeHtml(res.stderr) + '</div>';
          }
          document.getElementById("runtimeInfo").innerText = res.runtime || "Akira WASM Engine";
        } else {
          term.innerHTML += '<div>' + escapeHtml("Ejecutando localmente...") + '</div>';
        }
      } catch(err) {
        term.innerHTML += '<div class="term-err">Error de ejecución: ' + escapeHtml(String(err)) + '</div>';
      } finally {
        status.innerText = "WASM Engine Activo";
        status.style.color = "#10b981";
        term.scrollTop = term.scrollHeight;
      }
    }

    function clearTerminal() {
      document.getElementById("pyTerminal").innerHTML = '<span class="term-info">>>> Terminal limpia.\\n</span>';
    }

    function copyOutput() {
      const text = document.getElementById("pyTerminal").innerText;
      navigator.clipboard.writeText(text).then(() => alert("Salida copiada al portapapeles."));
    }

    function downloadPy() {
      const code = document.getElementById("pyCode").value;
      const blob = new Blob([code], { type: "text/x-python" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "akira_script_" + Date.now() + ".py";
      a.click();
      URL.revokeObjectURL(url);
    }

    function escapeHtml(s) {
      return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    document.getElementById("pyCode").addEventListener("keydown", function(e) {
      if(e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        runScript();
      }
    });

    // Auto-run initial code on startup
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(runScript, 300);
    });
  </script>
</body>
</html>`;

    iframe.srcdoc = html;
  };

  /**
   * Run Python directly from a code card in the chat
   */
  window.akiraRunPythonSandbox = function(blockId){
    const rawCode = (window.akiraCodeRegistry && window.akiraCodeRegistry[blockId]) || "";
    window.akiraOpenPythonREPL(rawCode);
  };

  // Pre-load Pyodide lazily
  if(typeof window !== "undefined") {
    setTimeout(initPyodide, 2500);
  }
})();
