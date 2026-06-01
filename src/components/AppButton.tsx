import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "light" | "danger" | "success" | "warning";
  disabled?: boolean;
}

export function AppButton({ children, onClick, type = "button", variant = "light", disabled = false }: Props) {
  const className =
    "px-3 py-2 rounded-xl text-sm font-bold border transition " +
    (variant === "primary"
      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
      : variant === "danger"
      ? "bg-red-100 text-red-700 border-red-200"
      : variant === "success"
      ? "bg-green-100 text-green-700 border-green-200"
      : variant === "warning"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50");

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}
