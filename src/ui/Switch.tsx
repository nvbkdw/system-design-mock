interface SwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}

export function Switch({ id, label, checked, onChange }: SwitchProps) {
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}
