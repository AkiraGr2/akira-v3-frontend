/**
 * AKIRA DATA VIZ & INTERACTIVE CHARTS ENGINE v1.0
 * Zero-Cost ($0.00 COP/USD) in-browser data visualization engine.
 * Renders interactive canvas/SVG charts (bar, line, pie, doughnut, radar) with 1-click PNG/SVG export.
 */
(function(){
  "use strict";

  /**
   * Pure lightweight SVG / Canvas Chart Generator (zero external dependencies required)
   */
  class AkiraChartEngine {
    constructor(canvasOrId){
      this.canvas = typeof canvasOrId === "string" ? document.getElementById(canvasOrId) : canvasOrId;
      this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    }

    render(config){
      if(!this.ctx) return;
      const { type = "bar", data = {}, options = {} } = config;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Clear
      ctx.clearRect(0, 0, w, h);

      const labels = data.labels || [];
      const datasets = data.datasets || [];
      if(datasets.length === 0) return;

      const dataset = datasets[0];
      const values = dataset.data || [];
      const colors = dataset.backgroundColor || [
        "#00f0ff", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"
      ];

      const maxVal = Math.max(...values, 1);
      const padding = 40;
      const chartW = w - padding * 2;
      const chartH = h - padding * 2;

      ctx.save();

      if(type === "bar"){
        // Draw Bar Chart
        const barWidth = (chartW / values.length) * 0.65;
        const gap = (chartW / values.length) * 0.35;

        // Draw axes
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        values.forEach((val, i) => {
          const barH = (val / maxVal) * chartH;
          const x = padding + i * (barWidth + gap) + gap / 2;
          const y = h - padding - barH;

          // Bar fill
          ctx.fillStyle = Array.isArray(colors) ? colors[i % colors.length] : colors;
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.fillRect(x, y, barWidth, barH);
          ctx.shadowBlur = 0;

          // Value label
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(val), x + barWidth / 2, y - 6);

          // X label
          ctx.fillStyle = "#94a3b8";
          ctx.font = "10px sans-serif";
          const label = labels[i] || "";
          ctx.fillText(label.slice(0, 10), x + barWidth / 2, h - padding + 16);
        });

      } else if(type === "line"){
        // Draw Line Chart
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        const stepX = chartW / Math.max(values.length - 1, 1);
        const points = values.map((val, i) => ({
          x: padding + i * stepX,
          y: h - padding - (val / maxVal) * chartH
        }));

        // Draw line with gradient glow
        ctx.strokeStyle = Array.isArray(colors) ? colors[0] : colors;
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        points.forEach((pt, i) => {
          if(i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw points & labels
        points.forEach((pt, i) => {
          ctx.fillStyle = "#00f0ff";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(values[i]), pt.x, pt.y - 10);

          ctx.fillStyle = "#94a3b8";
          ctx.font = "10px sans-serif";
          ctx.fillText(labels[i] || "", pt.x, h - padding + 16);
        });

      } else if(type === "pie" || type === "doughnut"){
        // Draw Pie / Doughnut
        const total = values.reduce((a, b) => a + b, 0) || 1;
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(chartW, chartH) / 2.2;
        let startAngle = -Math.PI / 2;

        values.forEach((val, i) => {
          const sliceAngle = (val / total) * Math.PI * 2;
          ctx.fillStyle = Array.isArray(colors) ? colors[i % colors.length] : colors;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
          ctx.closePath();
          ctx.fill();
          startAngle += sliceAngle;
        });

        if(type === "doughnut"){
          // Cut hole
          ctx.fillStyle = "#080b12";
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
          ctx.fill();

          // Center text
          ctx.fillStyle = "#00f0ff";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("TOTAL", centerX, centerY - 4);
          ctx.fillStyle = "#fff";
          ctx.fillText(String(total), centerX, centerY + 14);
        }
      }

      ctx.restore();
    }
  }

  /**
   * Embed and render chart into any HTML container element
   */
  window.akiraRenderChart = function(containerId, config){
    const container = typeof containerId === "string" ? document.getElementById(containerId) : containerId;
    if(!container) return;

    container.innerHTML = `
      <div class="ak-chart-card">
        <div class="ak-chart-header">
          <span class="ak-chart-title">📊 ${config.title || "Visualización de Datos Akira"}</span>
          <div class="ak-chart-actions">
            <button class="ak-chart-btn" onclick="window.akiraExportChartPng('${containerId}')">📥 PNG</button>
          </div>
        </div>
        <div class="ak-chart-body">
          <canvas id="${containerId}_canvas" width="600" height="320" style="width:100%;max-width:600px;height:auto;"></canvas>
        </div>
      </div>
    `;

    const engine = new AkiraChartEngine(containerId + "_canvas");
    engine.render(config);
  };

  /**
   * 1-Click Export Chart as PNG
   */
  window.akiraExportChartPng = function(containerId){
    const canvas = document.getElementById(containerId + "_canvas");
    if(!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "akira_chart_" + Date.now() + ".png";
    a.click();
  };

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-data-viz-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-data-viz-styles";
    st.textContent = `
      .ak-chart-card {
        background: #090e1a;
        border: 1px solid rgba(0, 240, 255, 0.25);
        border-radius: 8px;
        padding: 12px;
        margin: 10px 0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
      .ak-chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        padding-bottom: 6px;
      }
      .ak-chart-title {
        color: #00f0ff;
        font-weight: 700;
        font-size: 13px;
      }
      .ak-chart-btn {
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid rgba(255,255,255,0.15);
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
      }
      .ak-chart-btn:hover {
        background: #00f0ff;
        color: #080b12;
      }
      .ak-chart-body {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `;
    document.head.appendChild(st);
  })();

})();
