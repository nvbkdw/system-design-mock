import { useEffect, useRef, useState } from "react";
import { downloadText } from "../lib/download";

interface ExportDialogProps {
  /** Called once when the dialog opens. */
  build(): { filename: string; markdown: string };
  onClose(): void;
}

export function ExportDialog({ build, onClose }: ExportDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [{ filename, markdown }] = useState(build);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setStatus("Copied to clipboard");
    } catch {
      textarea.current?.focus();
      textarea.current?.select();
      setStatus("Text selected. Press ⌘C or Ctrl+C to copy.");
    }
  }

  return (
    <dialog ref={dialog} className="export-dialog" aria-labelledby="export-title" onClose={onClose}>
      <div className="dialog-head">
        <div>
          <h2 id="export-title" className="dialog-title">
            Export answers
          </h2>
          <p className="dialog-sub">{filename}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <textarea ref={textarea} className="export-text" readOnly spellCheck={false} aria-label="Markdown export" value={markdown} />
      <div className="dialog-foot">
        <span className="dialog-status" role="status">
          {status}
        </span>
        <button type="button" className="btn" onClick={copy}>
          Copy
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            downloadText(filename, markdown);
            setStatus(`Downloaded ${filename}`);
          }}
        >
          Download .md
        </button>
      </div>
    </dialog>
  );
}
