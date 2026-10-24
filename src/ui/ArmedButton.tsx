import { useEffect, useState } from "react";

interface ArmedButtonProps {
  label: string;
  armedLabel: string;
  onConfirm(): void;
  className?: string;
}

/** A destructive action that needs a second click within 3 seconds. */
export function ArmedButton({ label, armedLabel, onConfirm, className = "btn btn-ghost" }: ArmedButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timeout);
  }, [armed]);

  return (
    <button
      type="button"
      className={className + (armed ? " is-armed" : "")}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? armedLabel : label}
    </button>
  );
}
