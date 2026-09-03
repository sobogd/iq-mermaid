import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import mermaid from "mermaid";

// The six starter diagrams offered in the "Example…" picker. Mermaid keywords
// are identical in every language, so only the node labels are translated —
// via the locale dictionary (content/editor/<locale>.json, `sample.*`).
const examples = (t) => ({
  flowchart: `flowchart TD
    A[${t.sample.start}] --> B{${t.sample.condition}}
    B -->|${t.sample.yes}| C[${t.sample.action1}]
    B -->|${t.sample.no}| D[${t.sample.action2}]
    C --> E[${t.sample.end}]
    D --> E`,
  sequence: `sequenceDiagram
    participant User
    participant API
    participant DB
    User->>API: request
    API->>DB: query
    DB-->>API: result
    API-->>User: response`,
  class: `classDiagram
    class Animal {
      +String name
      +move()
    }
    class Dog {
      +bark()
    }
    Animal <|-- Dog`,
  state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Running: start
    Running --> Idle: stop
    Running --> [*]: finish`,
  er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    CUSTOMER {
      string name
      string email
    }`,
  gantt: `gantt
    title ${t.sample.project}
    dateFormat YYYY-MM-DD
    section ${t.sample.phase}
    ${t.sample.task1} :a1, 2026-01-01, 5d
    ${t.sample.task2} :after a1, 5d`,
});

mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });

let renderSeq = 0;

export default function TextEditor({ active, actionsSlot, code, onChange, t }) {
  const EXAMPLES = examples(t);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const previewRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(render, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function render() {
    const source = code.trim();
    if (!source) {
      if (previewRef.current) previewRef.current.innerHTML = "";
      setError("");
      return;
    }
    const id = "mermaid-graph-" + (++renderSeq);
    try {
      const { svg } = await mermaid.render(id, source);
      if (previewRef.current) previewRef.current.innerHTML = svg;
      setError("");
      setStatus(t.text.statusOk);
    } catch (err) {
      setError(err.message || String(err));
      setStatus(t.text.statusError);
      const stray = document.getElementById(id);
      if (stray) stray.remove();
    }
  }

  function getSvgElement() {
    return previewRef.current ? previewRef.current.querySelector("svg") : null;
  }

  async function copySvg() {
    const svg = getSvgElement();
    if (!svg) return;
    await navigator.clipboard.writeText(svg.outerHTML);
    setStatus(t.text.statusSvgCopied);
  }

  function downloadSvg() {
    const svg = getSvgElement();
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    const svg = getSvgElement();
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    const bbox = svg.getBoundingClientRect();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = (bbox.width || 800) * scale;
      canvas.height = (bbox.height || 600) * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "diagram.png";
        a.click();
        URL.revokeObjectURL(pngUrl);
      });
    };
    img.src = url;
  }

  async function copyMermaid() {
    await navigator.clipboard.writeText(code);
    setStatus(t.text.statusMermaidCopied);
  }

  function downloadMermaid() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.mmd";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadMarkdown() {
    const content = "```mermaid\n" + code + "\n```\n";
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onExampleChange(e) {
    const key = e.target.value;
    if (!key) return;
    onChange(EXAMPLES[key]);
    e.target.value = "";
  }

  return (
    <div className="text-editor" style={{ flexDirection: "column", flex: 1 }}>
      {active && actionsSlot && createPortal(
        <>
          <select onChange={onExampleChange} defaultValue="">
            <option value="">{t.text.examplePlaceholder}</option>
            {Object.keys(EXAMPLES).map((key) => (
              <option key={key} value={key}>{t.examples[key]}</option>
            ))}
          </select>
          <button onClick={copyMermaid}>{t.text.copyMermaid}</button>
          <button onClick={downloadMermaid}>{t.text.downloadMmd}</button>
          <button onClick={downloadMarkdown}>{t.text.downloadMd}</button>
          <button onClick={copySvg}>{t.text.copySvg}</button>
          <button onClick={downloadSvg}>{t.text.downloadSvg}</button>
          <button onClick={downloadPng}>{t.text.downloadPng}</button>
          <span className="status-line">{status}</span>
        </>,
        actionsSlot
      )}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div className="editor-pane">
          <textarea
            className="code-input"
            spellCheck={false}
            value={code}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <div className="preview-pane">
          {error && <div className="preview-error">{error}</div>}
          <div ref={previewRef} />
        </div>
      </div>
    </div>
  );
}
