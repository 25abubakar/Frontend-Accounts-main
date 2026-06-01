interface Props {
  message: string | null;
}

export function AppToast({ message }: Props) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
      {message}
    </div>
  );
}
