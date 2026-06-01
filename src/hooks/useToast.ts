import { useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(null), 2500);
  };

  return { message, showToast };
}
