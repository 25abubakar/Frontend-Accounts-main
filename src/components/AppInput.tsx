interface Props {
  label?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function AppInput({ label, value, placeholder, onChange }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-bold text-slate-600">{label}</span>}
      <input
        className="h-9 rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
