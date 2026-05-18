import { useNavigate } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-white p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <ShieldX size={40} className="text-red-400" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-800">Access Denied</h1>
        <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm">
          You don't have permission to view this page. Contact your administrator to request access.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <ArrowLeft size={15} /> Go Back
        </button>
        <button onClick={() => navigate("/dashboard")}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
          Dashboard
        </button>
      </div>
    </div>
  );
}
