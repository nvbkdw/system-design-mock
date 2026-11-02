// Diagram panel shell. Small and always available; the React Flow canvas is a
// separate chunk that loads when the panel first opens.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useRecordSlice, type RecordStore } from "../practice/RecordStore";
import { fencedBlocks, mermaidBlocks } from "./mermaid";
import { isWritten } from "./sequence";
import { SequenceView } from "./SequenceView";
import type { Diagram } from "./types";
import "./panel.css";

const DiagramCanvas = lazy(() => import("./DiagramCanvas"));

const VIEWS = { canvas: "Canvas", sequence: "Sequence", mermaid: "Mermaid" } as const;
type View = keyof typeof VIEWS;

interface DiagramPanelProps {
  store: RecordStore;
  /** Docked in the side column (sticky, full height) rather than inline. */
  docked: boolean;
  onClose(): void;
}

export function DiagramPanel({ store, docked, onClose }: DiagramPanelProps) {
  // Open on the sequences when they are all this question has.
  const [view, setView] = useState<View>(() => {
    const { diagram, sequences } = store.get();
    return !diagram.nodes.length && sequences.some(isWritten) ? "sequence" : "canvas";
  });
  const [expanded, setExpanded] = useState(false);
  const [sequenceId, setSequenceId] = useState<string | null>(null);
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
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className="diagram-tab" onClick={() => setView(v)}>
              {VIEWS[v]}
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
        {view === "sequence" && <SequenceView store={store} selectedId={sequenceId} onSelect={setSequenceId} />}
        {view === "mermaid" && <MermaidView store={store} />}
      </div>
    </section>
  );
}

function MermaidView({ store }: { store: RecordStore }) {
  const diagram = useRecordSlice(store, (r) => r.diagram);
  const sequences = useRecordSlice(store, (r) => r.sequences);
  const [status, setStatus] = useState("");
  const markdown = fencedBlocks(mermaidBlocks(diagram, sequences));

  if (!markdown) return <p className="diagram-empty">Nothing drawn yet. Add boxes on the Canvas tab or write a sequence diagram.</p>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setStatus("Copied");
    } catch {
      setStatus("Copy failed; select the text instead");
    }
  }

  return (
    <div className="mermaid-view">
      <pre className="mermaid-code">{markdown}</pre>
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
        <span>{hasDiagram ? "Your diagram is saved. Open it to keep drawing." : "Sketch boxes and arrows, or sequence diagrams, next to your answers."}</span>
      </div>
      <button type="button" className="btn" onClick={onOpen}>
        {hasDiagram ? "Show diagram" : "Open diagram"}
      </button>
    </div>
  );
}
