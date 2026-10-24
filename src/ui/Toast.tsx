import { useEffect } from "react";

export interface ToastAction {
  label: string;
  primary?: boolean;
  run(): void;
}

export interface ToastMessage {
  text: string;
  actions?: ToastAction[];
  /** Hide automatically after this many ms; persistent when omitted. */
  autoHideMs?: number;
}

export function Toast({ message, onClose }: { message: ToastMessage | null; onClose(): void }) {
  useEffect(() => {
    if (!message?.autoHideMs) return;
    const timeout = setTimeout(onClose, message.autoHideMs);
    return () => clearTimeout(timeout);
  }, [message, onClose]);

  if (!message) return null;
  const actions = message.actions ?? [];
  return (
    <div className="toast" role={actions.length ? "alertdialog" : "status"} aria-live="assertive">
      <p className="toast-text">{message.text}</p>
      {actions.length > 0 && (
        <div className="toast-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={"btn " + (action.primary ? "btn-primary" : "btn-ghost")}
              onClick={() => {
                onClose();
                action.run();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
