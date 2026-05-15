import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Copy, ExternalLink, Pencil, Trash2,
  CheckCircle2, XCircle, X, Globe, Phone, Mail,
  Building2, Save, Loader2, Link2, AlertTriangle, Check,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────
type AccessLevel = 'Read Only' | 'Editor' | 'Admin';
type PartnerStatus = 'Active' | 'Suspended';

interface Partner {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  portalUrl: string;
  accessLevel: AccessLevel;
  status: PartnerStatus;
  addedDate: string;
}

// ── Constants ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'lal-partners';

const SEED_PARTNERS: Partner[] = [
  {
    id: '1',
    name: 'Ahmed Raza',
    company: 'TechSoft',
    email: 'ahmed.raza@techsoft.com',
    phone: '+92 300 1234567',
    portalUrl: 'https://portal.techsoft.com',
    accessLevel: 'Admin',
    status: 'Active',
    addedDate: '2024-01-15',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    company: 'Global Ventures',
    email: 'sarah.j@globalventures.io',
    phone: '+1 415 9876543',
    portalUrl: 'https://partners.globalventures.io',
    accessLevel: 'Editor',
    status: 'Active',
    addedDate: '2024-03-08',
  },
  {
    id: '3',
    name: 'Khalid Mehmood',
    company: 'Pak Distributors',
    email: 'khalid@pakdist.pk',
    phone: '+92 321 7654321',
    portalUrl: 'https://portal.pakdist.pk',
    accessLevel: 'Read Only',
    status: 'Suspended',
    addedDate: '2024-05-22',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────
const INPUT =
  'w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all';
const LABEL = 'text-xs font-bold uppercase text-slate-500 mb-1.5 block';

function loadPartners(): Partner[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partner[];
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PARTNERS));
  return SEED_PARTNERS;
}

function savePartners(partners: Partner[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

// ── Access Level Badge ────────────────────────────────────────────────────
function AccessBadge({ level }: { level: AccessLevel }) {
  const map: Record<AccessLevel, string> = {
    Admin: 'bg-violet-50 text-violet-700 ring-violet-500/10',
    Editor: 'bg-sky-50 text-sky-700 ring-sky-500/10',
    'Read Only': 'bg-slate-100 text-slate-600 ring-slate-500/10',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ring-inset ${map[level]}`}>
      {level}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: PartnerStatus }) {
  return status === 'Active' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-600 ring-1 ring-inset ring-emerald-500/10">
      <CheckCircle2 size={10} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-black text-rose-600 ring-1 ring-inset ring-rose-500/10">
      <XCircle size={10} /> Suspended
    </span>
  );
}

// ── Partner Form (shared by Add & Edit modals) ────────────────────────────
interface FormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  portalUrl: string;
  accessLevel: AccessLevel;
  status: PartnerStatus;
}

const EMPTY_FORM: FormState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  portalUrl: '',
  accessLevel: 'Read Only',
  status: 'Active',
};

interface PartnerModalProps {
  mode: 'add' | 'edit';
  partner?: Partner;
  onClose: () => void;
  onSaved: (partner: Partner) => void;
}

function PartnerModal({ mode, partner, onClose, onSaved }: PartnerModalProps) {
  const [form, setForm] = useState<FormState>(
    partner
      ? {
          name: partner.name,
          company: partner.company,
          email: partner.email,
          phone: partner.phone,
          portalUrl: partner.portalUrl,
          accessLevel: partner.accessLevel,
          status: partner.status,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.company.trim()) { setError('Company is required.'); return; }
    setSaving(true);
    setError(null);
    // Simulate async save
    setTimeout(() => {
      const saved: Partner = {
        id: partner?.id ?? uid(),
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        portalUrl: form.portalUrl.trim(),
        accessLevel: form.accessLevel,
        status: form.status,
        addedDate: partner?.addedDate ?? new Date().toISOString().slice(0, 10),
      };
      onSaved(saved);
      setSaving(false);
      onClose();
    }, 300);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-100">
              <Globe size={18} className="text-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {mode === 'add' ? 'Add Partner' : 'Edit Partner'}
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                {mode === 'add' ? 'Create a new partner portal entry' : `Editing ${partner?.name}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className={LABEL}>Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type="text" value={form.name} onChange={set('name')}
                placeholder="Full name" className={INPUT}
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className={LABEL}>Company <span className="text-red-500">*</span></label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={form.company} onChange={set('company')}
                placeholder="Company name" className={`${INPUT} pl-9`}
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email" value={form.email} onChange={set('email')}
                  placeholder="email@example.com" className={`${INPUT} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Phone</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={form.phone} onChange={set('phone')}
                  placeholder="+1 234 567 8900" className={`${INPUT} pl-9`}
                />
              </div>
            </div>
          </div>

          {/* Portal URL */}
          <div>
            <label className={LABEL}>Portal URL</label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url" value={form.portalUrl} onChange={set('portalUrl')}
                placeholder="https://portal.example.com" className={`${INPUT} pl-9`}
              />
            </div>
          </div>

          {/* Access Level + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Access Level</label>
              <select value={form.accessLevel} onChange={set('accessLevel')} className={INPUT}>
                <option value="Read Only">Read Only</option>
                <option value="Editor">Editor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select value={form.status} onChange={set('status')} className={INPUT}>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={onClose} disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {mode === 'add' ? 'Add Partner' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────
interface DeleteModalProps {
  partner: Partner;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteModal({ partner, onClose, onDeleted }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    setDeleting(true);
    setTimeout(() => {
      onDeleted();
      setDeleting(false);
      onClose();
    }, 300);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h2 className="text-center text-lg font-black text-slate-800">Delete Partner?</h2>
        <p className="mt-2 text-center text-sm font-medium text-slate-500">
          <strong>{partner.name}</strong> from <strong>{partner.company}</strong> will be permanently removed.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose} disabled={deleting}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Partner Card ──────────────────────────────────────────────────────────
interface PartnerCardProps {
  partner: Partner;
  onEdit: (p: Partner) => void;
  onDelete: (p: Partner) => void;
  onToggleStatus: (p: Partner) => void;
}

function PartnerCard({ partner, onEdit, onDelete, onToggleStatus }: PartnerCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!partner.portalUrl) return;
    navigator.clipboard.writeText(partner.portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Top row: avatar + name/badges + contact */}
      <div className="flex items-start gap-4 p-5">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-lg font-black text-white shadow-md">
          {partner.name.charAt(0).toUpperCase()}
        </div>

        {/* Name + badges */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-slate-800 truncate">{partner.name}</h3>
            <AccessBadge level={partner.accessLevel} />
            <StatusBadge status={partner.status} />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Building2 size={11} className="shrink-0 text-slate-400" />
            <span className="truncate">{partner.company}</span>
          </div>
        </div>

        {/* Email + Phone */}
        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
          {partner.email && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Mail size={11} className="text-slate-400" />
              <span>{partner.email}</span>
            </div>
          )}
          {partner.phone && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Phone size={11} className="text-slate-400" />
              <span>{partner.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Email + Phone (mobile) */}
      {(partner.email || partner.phone) && (
        <div className="flex sm:hidden flex-col gap-1 px-5 pb-3">
          {partner.email && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Mail size={11} className="text-slate-400" />
              <span>{partner.email}</span>
            </div>
          )}
          {partner.phone && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Phone size={11} className="text-slate-400" />
              <span>{partner.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Portal URL row */}
      <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
        <Globe size={13} className="shrink-0 text-violet-400" />
        <span className="flex-1 truncate text-xs font-semibold text-slate-600">
          {partner.portalUrl || <span className="text-slate-400 italic">No URL set</span>}
        </span>
        {partner.portalUrl && (
          <>
            <button
              onClick={handleCopy}
              title="Copy URL"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-violet-600 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
            <a
              href={partner.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open portal"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-violet-600 transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          </>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
        <p className="text-[11px] font-bold text-slate-400">
          Added {formatDate(partner.addedDate)}
        </p>
        <div className="flex items-center gap-1">
          {/* Suspend / Activate toggle */}
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={() => onToggleStatus(partner)}
            title={partner.status === 'Active' ? 'Suspend partner' : 'Activate partner'}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-colors ${
              partner.status === 'Active'
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            {partner.status === 'Active' ? 'Suspend' : 'Activate'}
          </motion.button>

          {/* Edit */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(partner)}
            title="Edit partner"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-violet-600 transition-colors"
          >
            <Pencil size={14} strokeWidth={2.5} />
          </motion.button>

          {/* Delete */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(partner)}
            title="Delete partner"
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
type FilterTab = 'All' | 'Active' | 'Suspended';

export default function PartnerPortalsPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('All');

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Partner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setPartners(loadPartners());
  }, []);

  // Persist whenever partners change
  const updatePartners = (next: Partner[]) => {
    setPartners(next);
    savePartners(next);
  };

  // Handlers
  const handleSaved = (saved: Partner) => {
    const exists = partners.some(p => p.id === saved.id);
    if (exists) {
      updatePartners(partners.map(p => (p.id === saved.id ? saved : p)));
    } else {
      updatePartners([...partners, saved]);
    }
  };

  const handleDeleted = () => {
    if (!deleteTarget) return;
    updatePartners(partners.filter(p => p.id !== deleteTarget.id));
  };

  const handleToggleStatus = (partner: Partner) => {
    const next = partners.map(p =>
      p.id === partner.id
        ? { ...p, status: (p.status === 'Active' ? 'Suspended' : 'Active') as PartnerStatus }
        : p,
    );
    updatePartners(next);
  };

  // Filtered list
  const filtered = partners.filter(p => {
    const q = query.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q);
    const matchTab = tab === 'All' || p.status === tab;
    return matchSearch && matchTab;
  });

  // KPI counts
  const totalCount = partners.length;
  const activeCount = partners.filter(p => p.status === 'Active').length;
  const suspendedCount = partners.filter(p => p.status === 'Suspended').length;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'All', label: 'All', count: totalCount },
    { key: 'Active', label: 'Active', count: activeCount },
    { key: 'Suspended', label: 'Suspended', count: suspendedCount },
  ];

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Partner Portals</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-400">
            Manage partner access, portal links, and permissions
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={16} />
          Add Partner
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Partners</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{totalCount}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">All registered partners</p>
        </div>
        {/* Active */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Active</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{activeCount}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-500">Currently active partners</p>
        </div>
        {/* Suspended */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Suspended</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{suspendedCount}</p>
          <p className="mt-1 text-xs font-semibold text-rose-500">Access suspended</p>
        </div>
      </div>

      {/* ── Search + Filter Tabs ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, company, or email…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                tab === t.key
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Partner Cards ── */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div
            key="list"
            className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            {filtered.map(partner => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-24"
          >
            <Globe size={44} className="mb-4 text-slate-200" strokeWidth={1.5} />
            <h3 className="text-sm font-black text-slate-700">No partners found</h3>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {query ? 'Try a different search term.' : 'Add your first partner using the button above.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 text-right text-[11px] font-bold text-slate-400">
        Showing {filtered.length} of {totalCount} partner{totalCount !== 1 ? 's' : ''}
      </p>

      {/* ── Modals ── */}
      <AnimatePresence>
        {addOpen && (
          <PartnerModal
            key="add-modal"
            mode="add"
            onClose={() => setAddOpen(false)}
            onSaved={handleSaved}
          />
        )}
        {editTarget && (
          <PartnerModal
            key="edit-modal"
            mode="edit"
            partner={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={handleSaved}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            key="delete-modal"
            partner={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
