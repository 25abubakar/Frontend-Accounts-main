import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white p-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Construction size={36} strokeWidth={1.5} />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-slate-800">{title}</h1>
      <p className="mt-2 max-w-sm text-sm font-medium text-slate-400">
        {description ?? "This section is under construction. Check back soon."}
      </p>
      <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        Coming Soon
      </span>
    </div>
  );
}
