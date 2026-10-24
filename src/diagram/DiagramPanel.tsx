// Diagram panel shell. Small and always available; the React Flow canvas is a
// separate chunk that loads when the panel first opens.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useRecordSlice, type RecordStore } from "../practice/RecordStore";
import { toMermaid } from "./mermaid";
import type { Diagram } from "./types";
import "./panel.css";

const DiagramCanvas = lazy(() => import("./DiagramCanvas"));

type View = "canvas" | "mermaid";

interface DiagramPanelProps {
  store: RecordStore;
  /** Docked in the side column (sticky, full height) rather than inline. */
  docked: boolean;
  onClose(): void;
}

export function DiagramPanel({ store, docked, onClose }: DiagramPanelProps) {
  const [view, setView] = useState<View>("canvas");
  const [expanded, setExpanded] = useState(false);
  const [initial] = useState(() => store.get().diagram);
  const onChange = useCallback((diagram: Diagram) => store.setDiagram(diagram), [store]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    document.body.classList.add("no-scroll");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const classes = ["diagram-panel", docked && "is-docked", expanded && "is-expanded"].filter(Boolean).join(" ");
  return (
    <section className={classes} aria-labelledby="diagram-title">
      <header className="diagram-head">
        <div className="diagram-titles">
          <h2 id="diagram-title" className="diagram-title">
            Diagram
          </h2>
          <p className="diagram-sub">Shared by all phases · exported as Mermaid</p>
        </div>
        <div className="diagram-tabs" role="tablist" aria-label="Diagram view">
          {(["canvas", "mermaid"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className="diagram-tab" onClick={() => setView(v)}>
              {v === "canvas" ? "Canvas" : "Mermaid"}
            </button>
          ))}
        </div>
        <div className="diagram-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setExpanded((x) => !x)} aria-pressed={expanded}>
            {expanded ? "Exit full screen" : "Full screen"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Hide
          </button>
        </div>
      </header>
      <div className="diagram-body">
        {/* Kept mounted while viewing Mermaid so the canvas keeps its zoom and selection. */}
        <div className="diagram-canvas" hidden={view !== "canvas"}>
          <Suspense fallback={<p className="diagram-loading">Loading canvas…</p>}>
            <DiagramCanvas initial={initial} onChange={onChange} />
          </Suspense>
        </div>
        {view === "mermaid" && <MermaidView store={store} />}
      </div>
    </section>
  );
}

function MermaidView({ store }: { store: RecordStore }) {
  const diagram = useRecordSlice(store, (r) => r.diagram);
  const [status, setStatus] = useState("");
  const code = toMermaid(diagram);

  if (!diagram.nodes.length) return <p className="diagram-empty">Nothing drawn yet. Add boxes on the Canvas tab.</p>;

  async function copy() {
    try {
      await navigator.clipboard.writeText("```mermaid\n" + code + "\n```");
      setStatus("Copied");
    } catch {
      setStatus("Copy failed; select the text instead");
    }
  }

  return (
    <div className="mermaid-view">
      <pre className="mermaid-code">{code}</pre>
      <div className="mermaid-foot">
        <span className="dialog-status" role="status">
          {status || "Included in the Markdown export."}
        </span>
        <button type="button" className="btn" onClick={copy}>
          Copy as Markdown
        </button>
      </div>
    </div>
  );
}

/** Shown in place of the panel while it is hidden. */
export function DiagramLauncher({ hasDiagram, onOpen }: { hasDiagram: boolean; onOpen(): void }) {
  return (
    <div className="diagram-launcher">
      <span className="diagram-launcher-mark" aria-hidden="true" />
      <div className="diagram-launcher-text">
        <strong>Diagram</strong>
        <span>{hasDiagram ? "Your diagram is saved. Open it to keep drawing." : "Sketch boxes and arrows next to your answers. Shared by all phases."}</span>
      </div>
      <button type="button" className="btn" onClick={onOpen}>
        {hasDiagram ? "Show diagram" : "Open diagram"}
      </button>
    </div>
  );
}
