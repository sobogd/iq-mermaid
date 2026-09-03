import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import mermaid from "./mermaid-client";

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

let renderSeq = 0;

export default function TextEditor({ active, actionsSlot, code, onChange, themeSeq, t }) {
  const EXAMPLES = examples(t);
  const [error, setError] = useState("");
  const previewRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(render, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, themeSeq]);

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
    } catch (err) {
      // The preview keeps whatever last rendered; the message says why it did
      // not change. Blanking it on every keystroke mid-word is worse than
      // showing a diagram that is one edit out of date.
      setError(err.message || String(err));
      const stray = document.getElementById(id);
      if (stray) stray.remove();
    }
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
        <select onChange={onExampleChange} defaultValue="" aria-label={t.text.examplePlaceholder}>
          <option value="">{t.text.examplePlaceholder}</option>
          {Object.keys(EXAMPLES).map((key) => (
            <option key={key} value={key}>{t.examples[key]}</option>
          ))}
        </select>,
        actionsSlot
      )}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div className="editor-pane">
          <textarea
            className="code-input"
            spellCheck={false}
            aria-label={t.tabs.text}
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
