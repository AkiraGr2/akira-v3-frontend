/**
 * AKIRA OBSIDIAN VAULT EXPORTER v1.0
 * Zero-Cost ($0.00 COP/USD) client-side Obsidian Vault generation engine.
 * Exports memory graph, verified knowledge, and Colmena specialists as Markdown with [[wikilinks]] in a PKZIP bundle.
 */
(function(){
  "use strict";

  // Pure vanilla CRC-32 calculation table
  const CRC_TABLE = (function(){
    const t = new Uint32Array(256);
    for(let i = 0; i < 256; i++){
      let c = i;
      for(let k = 0; k < 8; k++){
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[i] = c;
    }
    return t;
  })();

  function crc32(bytes){
    let crc = 0 ^ (-1);
    for(let i = 0; i < bytes.length; i++){
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function strToUtf8(str){
    return new TextEncoder().encode(str);
  }

  // Pure JavaScript PKZIP generator
  function createZip(files){
    const fileEntries = [];
    let localHeadersOffset = 0;

    for(let f of files){
      const nameBytes = strToUtf8(f.name);
      const dataBytes = strToUtf8(f.content);
      const crc = crc32(dataBytes);

      fileEntries.push({
        nameBytes,
        dataBytes,
        crc,
        offset: localHeadersOffset
      });

      localHeadersOffset += 30 + nameBytes.length + dataBytes.length;
    }

    let centralDirSize = 0;
    for(let fe of fileEntries){
      centralDirSize += 46 + fe.nameBytes.length;
    }

    const totalZipSize = localHeadersOffset + centralDirSize + 22;
    const buffer = new ArrayBuffer(totalZipSize);
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);

    let p = 0;
    // 1. Local headers + file data
    for(let fe of fileEntries){
      view.setUint32(p, 0x04034b50, true); p += 4;
      view.setUint16(p, 20, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint32(p, fe.crc, true); p += 4;
      view.setUint32(p, fe.dataBytes.length, true); p += 4;
      view.setUint32(p, fe.dataBytes.length, true); p += 4;
      view.setUint16(p, fe.nameBytes.length, true); p += 2;
      view.setUint16(p, 0, true); p += 2;

      u8.set(fe.nameBytes, p); p += fe.nameBytes.length;
      u8.set(fe.dataBytes, p); p += fe.dataBytes.length;
    }

    // 2. Central directory headers
    const centralDirOffset = p;
    for(let fe of fileEntries){
      view.setUint32(p, 0x02014b50, true); p += 4;
      view.setUint16(p, 20, true); p += 2;
      view.setUint16(p, 20, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint32(p, fe.crc, true); p += 4;
      view.setUint32(p, fe.dataBytes.length, true); p += 4;
      view.setUint32(p, fe.dataBytes.length, true); p += 4;
      view.setUint16(p, fe.nameBytes.length, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint16(p, 0, true); p += 2;
      view.setUint32(p, 0, true); p += 4;
      view.setUint32(p, fe.offset, true); p += 4;

      u8.set(fe.nameBytes, p); p += fe.nameBytes.length;
    }

    // 3. End of central directory record
    view.setUint32(p, 0x06054b50, true); p += 4;
    view.setUint16(p, 0, true); p += 2;
    view.setUint16(p, 0, true); p += 2;
    view.setUint16(p, fileEntries.length, true); p += 2;
    view.setUint16(p, fileEntries.length, true); p += 2;
    view.setUint32(p, centralDirSize, true); p += 4;
    view.setUint32(p, centralDirOffset, true); p += 4;
    view.setUint16(p, 0, true); p += 2;

    return new Blob([buffer], { type: "application/zip" });
  }

  /**
   * Export Akira Memory to Obsidian Vault ZIP
   */
  window.akiraExportObsidianVault = function(){
    const files = [];

    // 1. Root README.md
    files.push({
      name: "README.md",
      content: `# 🧠 Bóveda Obsidian de Akira

Exportación soberana de conocimiento, memoria y especialistas de **Akira**, colmena cognitiva personal de **Jhon Grimm**.

## 📂 Estructura de la Bóveda:
- **[[Cerebro_Neuronal/Indice_Membrana|🌐 Cerebro Neuronal]]**: Nodos interconectados de la membrana con enlaces bidireccionales.
- **[[Aprendizajes/Indice_Aprendizaje|🧠 Aprendizajes y Hechos]]**: Memoria verificada y consolidada con metadatos YAML.
- **[[Colmena_267/Indice_Colmena|🐝 Colmena 267]]**: Especialistas autónomos organizados por división táctica.
- **[[Radar_Tech/Indice_Radar|📡 Radar Tecnológico]]**: Artículos técnicos, tendencias y feeds asimilados.
- **[[Proyectos_Upwork/Indice_Proyectos|💼 Proyectos y Entregables]]**: Propuestas y contratos del pipeline CRM.

---
*Generado automáticamente por Akira Enterprise a costo estricto de $0.00 COP.*
`
    });

    // 2. Export Cytoscape Neuronal Nodes
    let membraneIndex = "# 🌐 Índice de Nodos Neuronales\n\n";
    try {
      if(window.cy && typeof window.cy.nodes === "function") {
        window.cy.nodes().forEach(node => {
          const d = node.data();
          const cleanName = (d.label || d.id || "Nodo").replace(/[/\\?%*:|"<>]/g, "_");
          const neighbors = node.neighborhood().nodes().map(n => n.data("label") || n.data("id"));

          const noteContent = `---
id: "${d.id}"
label: "${d.label || d.id}"
type: "${d.type || 'neuron'}"
tags: [akira, neurona, cerebro]
---

# ${d.label || d.id}

**Tipo:** \`${d.type || 'concepto'}\`

## 🔗 Sinapsis Conectadas:
${neighbors.map(nb => `- [[${nb.replace(/[/\\?%*:|"<>]/g, "_")}]]`).join("\n")}

## 📝 Detalles:
${d.title || d.content || "Nodo registrado en la membrana cognitiva de Akira."}
`;
          files.push({
            name: `Cerebro_Neuronal/${cleanName}.md`,
            content: noteContent
          });
          membraneIndex += `- [[${cleanName}]] (${d.type || 'neurona'})\n`;
        });
      }
    } catch(e){}

    files.push({
      name: "Cerebro_Neuronal/Indice_Membrana.md",
      content: membraneIndex
    });

    // 3. Export Learning Memories
    let learningIndex = "# 🧠 Índice de Aprendizajes de Akira\n\n";
    try {
      const candidates = JSON.parse(localStorage.getItem("akira_learning_candidates") || "[]");
      candidates.forEach((c, idx) => {
        const title = (c.summary || c.title || `Aprendizaje_${idx+1}`).replace(/[/\\?%*:|"<>]/g, "_");
        const noteContent = `---
id: "${c.id || idx}"
status: "${c.status || 'candidate'}"
confidence: ${c.confidence || 0.8}
topic: "${c.topic || 'General'}"
tags: [akira, memoria, ${c.status || 'candidate'}]
---

# ${c.summary || c.title || "Aprendizaje Verificado"}

- **Estado:** \`${c.status}\`
- **Confianza:** \`${(c.confidence || 0.8) * 100}%\`

## 💡 Contenido:
${c.content || c.summary || "Sin contenido detallado."}
`;
        files.push({
          name: `Aprendizajes/${title}.md`,
          content: noteContent
        });
        learningIndex += `- [[${title}]] - *${c.status} (${Math.round((c.confidence || 0.8)*100)}%)*\n`;
      });
    } catch(e){}

    files.push({
      name: "Aprendizajes/Indice_Aprendizaje.md",
      content: learningIndex
    });

    // 4. Export Colmena Specialists
    let colmenaIndex = "# 🐝 Índice de Especialistas de la Colmena (267 Agentes)\n\n";
    try {
      if(window.COLMENA_SPECIALISTS_REGISTRY && Array.isArray(window.COLMENA_SPECIALISTS_REGISTRY)) {
        window.COLMENA_SPECIALISTS_REGISTRY.forEach(sp => {
          const spName = (sp.name || "Especialista").replace(/[/\\?%*:|"<>]/g, "_");
          const noteContent = `---
id: "${sp.id || sp.name}"
name: "${sp.name}"
role: "${sp.role}"
division: "${sp.division}"
tags: [colmena, especialista, ${sp.division.toLowerCase()}]
---

# ${sp.name} - ${sp.role}

- **División:** \`${sp.division}\`
- **Comandante Relacionado:** [[${(sp.commander || "Nexo").replace(/[/\\?%*:|"<>]/g, "_")}]]

## 🎯 Directiva Principal:
${sp.directive || "Ejecución táctica con precisión y calidad."}

## 🛠️ Habilidades Clave:
${(sp.skills || []).map(s => `- ${s}`).join("\n")}
`;
          files.push({
            name: `Colmena_267/${spName}.md`,
            content: noteContent
          });
          colmenaIndex += `- [[${spName}]] - ${sp.role} (*${sp.division}*)\n`;
        });
      }
    } catch(e){}

    files.push({
      name: "Colmena_267/Indice_Colmena.md",
      content: colmenaIndex
    });

    // 5. Build ZIP and trigger download
    try {
      const zipBlob = createZip(files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Akira_Obsidian_Vault_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      alert(`¡Bóveda Obsidian exportada con éxito (${files.length} archivos Markdown con [[wikilinks]])!`);
    } catch(err) {
      alert("Error al generar el ZIP de la bóveda: " + err.message);
    }
  };

})();
