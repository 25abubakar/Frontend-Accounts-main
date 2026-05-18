/**
 * TriStateCheckbox
 * Cycles: INHERIT (gray) → ALLOW (blue ✓) → DENY (red ✗) → INHERIT
 *
 * Visual:
 *   INHERIT  — gray outline, empty
 *   ALLOW    — blue filled, white checkmark
 *   DENY     — red filled, white X
 */
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { PermissionState } from "../../api/accessApi";

interface TriStateCheckboxProps {
  state: PermissionState;
  onChange: (next: PermissionState) => void;
  disabled?: boolean;
  size?: number;
  title?: string;
  isDirty?: boolean;       // blue ring = unsaved change
  isOverride?: boolean;    // amber ring = differs from role default
}

// Cycle order
const CYCLE: PermissionState[] = ["INHERIT", "ALLOW", "DENY"];

function nextState(current: PermissionState): PermissionState {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

export function stateToBoolean(s: PermissionState): boolean {
  return s === "ALLOW";
}

export function booleanToState(b: boolean): PermissionState {
  return b ? "ALLOW" : "INHERIT";
}

export default function TriStateCheckbox({
  state,
  onChange,
  disabled = false,
  size = 20,
  title,
  isDirty = false,
  isOverride = false,
}: TriStateCheckboxProps) {
  const handleClick = () => {
    if (!disabled) onChange(nextState(state));
  };

  const baseClass = `
    flex items-center justify-center rounded-md border-2 transition-all cursor-pointer select-none
    ${disabled ? "cursor-not-allowed opacity-40" : "hover:scale-110 active:scale-95"}
    ${isDirty ? "ring-2 ring-offset-1 ring-sky-400" : ""}
    ${isOverride && !isDirty ? "ring-2 ring-offset-1 ring-amber-300" : ""}
  `;

  const stateClass =
    state === "ALLOW"
      ? "bg-indigo-500 border-indigo-500 text-white"
      : state === "DENY"
      ? "bg-red-500 border-red-500 text-white"
      : "border-slate-300 bg-white hover:border-slate-400";

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={title ?? (state === "ALLOW" ? "Granted — click to Deny" : state === "DENY" ? "Denied — click to Inherit" : "Inherit — click to Allow")}
      whileTap={disabled ? {} : { scale: 0.88 }}
      className={`${baseClass} ${stateClass}`}
      style={{ width: size, height: size }}
    >
      {state === "ALLOW" && <Check size={size * 0.55} strokeWidth={3} />}
      {state === "DENY"  && <X    size={size * 0.55} strokeWidth={3} />}
    </motion.button>
  );
}
