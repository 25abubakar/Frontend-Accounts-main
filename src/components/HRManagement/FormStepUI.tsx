import React from "react";
import { Check } from "lucide-react";
import type { VacancyDto } from "../../types";

export function StepIndicator({ current, steps }: { current: number, steps: { label: string, icon: React.ElementType }[] }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : active
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  active ? "text-indigo-600" : done ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mb-5 mx-1 transition-all duration-300 ${
                  i < current ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StepCard({ children, title, icon: Icon, selectedVacancy }: { children: React.ReactNode; title: string; icon: React.ElementType; selectedVacancy?: VacancyDto | null }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
          <Icon className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800">{title}</h2>
          {selectedVacancy && (
            <p className="text-xs font-semibold text-slate-400">
              {selectedVacancy.vacancyCode} · {selectedVacancy.jobTitle} · {selectedVacancy.branchName}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}