// Sequence diagrams: Mermaid source on one side, a live preview on the other.
import { useEffect, useState } from "react";
import { useRecordSlice, type RecordStore } from "../practice/RecordStore";
import { ArmedButton } from "../ui/ArmedButton";
import { renderMermaid } from "./renderMermaid";
import { newSequence, sequenceTitle, type SequenceDiagram } from "./sequence";

const PREVIEW_DELAY_MS = 300;

interface SequenceViewProps {
  store: RecordStore;
  /** The open sequence; the first one when null or deleted. */
  selectedId: string | null;
  onSelect(id: string | null): void;
}

export function SequenceView({ store, selectedId, onSelect }: SequenceViewProps) {
  const sequences = useRecordSlice(store, (r) => r.sequences);
  const index = Math.max(0, sequences.findIndex((s) => s.id === selectedId));
  const active = sequences[index] as SequenceDiagram | undefined;

  function add() {
    const sequence = newSequence(sequences.length);
    store.setSequences([...sequences, sequence]);
    onSelect(sequence.id);
  }

  function update(patch: Partial<SequenceDiagram>) {
    store.setSequences(store.get().sequences.map((s) => (s.id === active?.id ? { ...s, ...patch } : s)));
  }

  function remove() {
    const rest = sequences.filter((s) => s.id !== active?.id);
    store.setSequences(rest);
    onSelect(rest[Math.min(index, rest.length - 1)]?.id ?? null);
  }

  return (
    <div className="sequence-view">
      <div className="sequence-bar">
        <div className="sequence-tabs" role="tablist" aria-label="Sequence diagrams">
          {sequences.map((s, i) => (
            <button key={s.id} type="button" role="tab" aria-selected={s === active} className="sequence-tab" onClick={() => onSelect(s.id)}>
              {sequenceTitle(s, i)}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" onClick={add}>
          + New sequence
        </button>
      </div>
      {active ? (
        <div className="sequence-work" role="tabpanel">
          <div className="sequence-source">
            <div className="sequence-meta">
              <input
                className="input"
                aria-label="Sequence title"
                placeholder={`Flow ${index + 1}, e.g. Write path`}
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
              />
              <ArmedButton label="Delete" armedLabel="Delete?" onConfirm={remove} />
            </div>
            <textarea
              className="sequence-code"
              aria-label="Mermaid source"
              spellCheck={false}
              value={active.code}
              onChange={(e) => update({ code: e.target.value })}
            />
            <p className="sequence-hint">
              <code>A -&gt;&gt; B: call</code> <code>B --&gt;&gt; A: reply</code> <code>A -) B: async</code>{" "}
              <code>Note over A,B: text</code> <code>alt … else … end</code> <code>loop … end</code>
            </p>
          </div>
          <MermaidPreview key={active.id} code={active.code} />
        </div>
      ) : (
        <div className="diagram-empty">
          <p>No sequence diagrams yet. Use one to walk a request through the system step by step.</p>
          <button type="button" className="btn" onClick={add}>
            New sequence diagram
          </button>
        </div>
      )}
    </div>
  );
}

type Preview = { svg: string; error: string };

/** Renders after typing pauses; on an error it keeps the last good picture, dimmed. */
function MermaidPreview({ code }: { code: string }) {
  const [preview, setPreview] = useState<Preview>({ svg: "", error: "" });

  useEffect(() => {
    if (!code.trim()) return;
    let live = true;
    const timeout = setTimeout(async () => {
      const result = await renderMermaid(code);
      if (!live) return;
      setPreview((p) => (result.ok ? { svg: result.svg, error: "" } : { ...p, error: result.error }));
    }, PREVIEW_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timeout);
    };
  }, [code]);

  if (!code.trim()) return <p className="sequence-preview diagram-empty">Write Mermaid to see the diagram.</p>;
  return (
    <div className="sequence-preview">
      {preview.error && (
        <p className="sequence-error" role="status">
          {preview.error}
        </p>
      )}
      <div
        className={"sequence-svg" + (preview.error ? " is-stale" : "")}
        role="img"
        aria-label="Diagram preview"
        dangerouslySetInnerHTML={{ __html: preview.svg }}
      />
    </div>
  );
}
