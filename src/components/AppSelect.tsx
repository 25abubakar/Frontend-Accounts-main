import type { LookupDto } from "../models/lookupModels";

interface Props {
  label?: string;
  value: string;
  options: LookupDto[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export function AppSelect({ label, value, options, placeholder = "Select", onChange }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-bold text-slate-600">{label}</span>}
      <select
        className="h-9 rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.valueCode} value={item.valueCode}>
            {item.displayText}
          </option>
        ))}
      </select>
    </label>
  );
}
