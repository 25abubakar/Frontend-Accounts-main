/**
 * AccessGroupsPage  /access/groups
 * Role-based access groups — create, edit, delete, assign staff, set features
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Layers, Shield, Plus, Search, Edit2, Trash2, X, Loader2,
  AlertCircle, Users, CheckSquare, Check, Save, ChevronDown,
  AlertTriangle, UserPlus, UserMinus, ExternalLink, Zap,
} from "lucide-react";
import { accessApi, type AccessGroupDto, type FeatureDto, type CreateGroupDto } from "../../api/accessApi";
import { menuApi, type ApiMenuItem } from "../../api/menuApi";
import { staffApi } from "../../api/staffApi";
import type { StaffDto } from "../../types";

// ── tiny helpers ──────────────────────────────────────────────────────────
function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values","data","items"]) if (Array.isArray(o[k])) return o[k] as T[];
  }
  return [];
}
function byModule(fs: FeatureDto[]) {
  return toArr<FeatureDto>(fs).reduce<Record<string,FeatureDto[]>>((a,f)=>{
    const m=f.module||"General";(a[m]??=[]).push(f);return a;
  },{});
}

// Flatten menu tree into FeatureDto list with module = "Menu"
function flattenMenuToFeatures(items: ApiMenuItem[], prefix = ""): FeatureDto[] {
  const result: FeatureDto[] = [];
  for (const item of items) {
    const key = `MENU_${item.id}`;
    const name = prefix ? `${prefix} › ${item.title}` : item.title;
    result.push({ featureKey: key, featureName: name, module: "Menu" });
    if (item.children?.length) result.push(...flattenMenuToFeatures(item.children, item.title));
  }
  return result;
}
const GRADS=["from-indigo-400 to-violet-500","from-sky-400 to-blue-500","from-emerald-400 to-teal-500","from-rose-400 to-pink-500","from-amber-400 to-orange-500"];
function grad(n:string){let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))&0xffffffff;return GRADS[Math.abs(h)%GRADS.length];}
const ROLE_CLR:Record<string,string>={agent:"bg-gray-100 text-gray-700",supervisor:"bg-blue-100 text-blue-700",manager:"bg-green-100 text-green-700",ceo:"bg-purple-100 text-purple-700",bellboy:"bg-orange-100 text-orange-700","bell boy":"bg-orange-100 text-orange-700"};
function roleBadge(n:string){const k=n.toLowerCase().replace(/\s+/g,"");return ROLE_CLR[k]??ROLE_CLR[n.toLowerCase()]??"bg-slate-100 text-slate-600";}
const INP="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all";
const LBL="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block";

// ── Group Modal (create / edit) ───────────────────────────────────────────
function GroupModal({ mode, group, allFeatures, onClose, onSaved }: {
  mode:"create"|"edit"; group?:AccessGroupDto; allFeatures:FeatureDto[];
  onClose:()=>void; onSaved:()=>void;
}) {
  const [name, setName]   = useState(group?.groupName??"");
  const [desc, setDesc]   = useState(group?.description??"");
  const [sel, setSel]     = useState<Set<string>>(()=>new Set(toArr<string>(group?.features)));
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState<string|null>(null);
  const safe    = toArr<FeatureDto>(allFeatures);
  const grouped = useMemo(()=>byModule(safe),[safe]);
  const mods    = Object.keys(grouped);

  const toggle = (k:string) => setSel(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});
  const toggleMod = (m:string) => {
    const keys=(grouped[m]??[]).map(f=>f.featureKey);
    const all=keys.every(k=>sel.has(k));
    setSel(p=>{const n=new Set(p);all?keys.forEach(k=>n.delete(k)):keys.forEach(k=>n.add(k));return n;});
  };

  const save = async () => {
    if (!name.trim()){setErr("Group name is required.");return;}
    try {
      setSaving(true);setErr(null);
      const payload:CreateGroupDto={groupName:name.trim(),description:desc.trim()||undefined,featureKeys:Array.from(sel)};
      if (mode==="create") await accessApi.createGroup(payload);
      else if (group){
        await accessApi.updateGroup(group.groupId,payload);
        await accessApi.updateGroupFeatures(group.groupId,{featureKeys:Array.from(sel)});
      }
      onSaved();onClose();
    } catch(e:unknown){
      const er=e as {response?:{data?:{message?:string}}};
      setErr(er.response?.data?.message??"Failed to save.");
    } finally{setSaving(false);}
  };

  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"/>
      <motion.div initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}}
        exit={{opacity:0,scale:0.95,y:20}}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Shield size={18} className="text-indigo-500"/>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                {mode==="create"?"Create Access Group":`Edit — ${group?.groupName}`}
              </h2>
              <p className="text-[10px] text-slate-400">{sel.size} features selected</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {err && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{err}</div>}
          <div><label className={LBL}>Group Name *</label>
            <input value={name} onChange={e=>setName(e.target.value)} className={INP} placeholder="e.g. Agent, Manager, Software Team"/>
          </div>
          <div><label className={LBL}>Description</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} className={`${INP} resize-none`} placeholder="What access does this group provide?"/>
          </div>
          <div>
            <label className={LBL}>Features ({sel.size} selected)</label>
            <div className="space-y-2">
              {mods.map(mod=>{
                const mf=grouped[mod]??[];
                const allSel=mf.every(f=>sel.has(f.featureKey));
                const someSel=mf.some(f=>sel.has(f.featureKey));
                return (
                  <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
                    <button onClick={()=>toggleMod(mod)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${allSel?"bg-indigo-500 border-indigo-500":someSel?"bg-indigo-200 border-indigo-400":"border-slate-300 bg-white"}`}>
                          {allSel&&<Check size={10} strokeWidth={3} className="text-white"/>}
                          {someSel&&!allSel&&<div className="h-1.5 w-1.5 rounded-sm bg-indigo-500"/>}
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">{mod}</span>
                        <span className="text-[10px] font-bold text-slate-400">({mf.filter(f=>sel.has(f.featureKey)).length}/{mf.length})</span>
                      </div>
                      <ChevronDown size={13} className="text-slate-400"/>
                    </button>
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {mf.map(f=>{
                        const checked=sel.has(f.featureKey);
                        return (
                          <button key={f.featureKey} onClick={()=>toggle(f.featureKey)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${checked?"bg-indigo-50 ring-1 ring-indigo-200":"bg-white hover:bg-slate-50"}`}>
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${checked?"bg-indigo-500 border-indigo-500":"border-slate-300"}`}>
                              {checked&&<Check size={10} strokeWidth={3} className="text-white"/>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">{f.featureKey}</p>
                              <p className="text-xs font-semibold text-slate-700 truncate">{f.featureName}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 shrink-0">
          <button onClick={onClose} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">
            {saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}
            {mode==="create"?"Create Group":"Save Changes"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Group Detail Panel ────────────────────────────────────────────────────
function GroupPanel({ group, allFeatures, allStaff, onClose, onRefresh }: {
  group:AccessGroupDto; allFeatures:FeatureDto[]; allStaff:StaffDto[];
  onClose:()=>void; onRefresh:()=>void;
}) {
  const navigate = useNavigate();
  const [assigned, setAssigned] = useState<StaffDto[]>([]);
  const [loadingS, setLoadingS] = useState(true);
  const [search, setSearch]     = useState("");
  const [assigning, setAssigning] = useState<string|null>(null);
  const [removing, setRemoving]   = useState<string|null>(null);

  const safeFeats = toArr<string>(group.features);
  const grouped   = useMemo(()=>byModule(toArr<FeatureDto>(allFeatures).filter(f=>safeFeats.includes(f.featureKey))),[allFeatures,safeFeats]);
  const mods      = Object.keys(grouped);

  const loadStaff = useCallback(async()=>{
    try{
      setLoadingS(true);
      const all=await staffApi.getAll();
      const inGroup:StaffDto[]=[];
      await Promise.all(all.map(async s=>{
        try{const gs=await accessApi.getStaffGroups(s.staffId);if(toArr(gs).some((g:unknown)=>(g as {groupId:number}).groupId===group.groupId))inGroup.push(s);}
        catch{/*skip*/}
      }));
      setAssigned(inGroup);
    }catch{/*silent*/}finally{setLoadingS(false);}
  },[group.groupId]);

  useEffect(()=>{loadStaff();},[loadStaff]);

  const assignedIds = useMemo(()=>new Set(assigned.map(s=>s.staffId)),[assigned]);
  const available   = useMemo(()=>allStaff.filter(s=>{
    if(assignedIds.has(s.staffId))return false;
    const q=search.toLowerCase();
    return !q||s.fullName.toLowerCase().includes(q)||(s.loginId??"").toLowerCase().includes(q)||s.jobTitle.toLowerCase().includes(q);
  }),[allStaff,assignedIds,search]);

  const assign = async(id:string)=>{try{setAssigning(id);await accessApi.addStaffToGroup(id,group.groupId);await loadStaff();onRefresh();}catch{/*silent*/}finally{setAssigning(null);}};
  const remove = async(id:string)=>{try{setRemoving(id);await accessApi.removeStaffFromGroup(id,group.groupId);await loadStaff();onRefresh();}catch{/*silent*/}finally{setRemoving(null);}};

  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"/>
      <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}}
        transition={{type:"spring",damping:30,stiffness:300}}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white bg-gradient-to-br ${grad(group.groupName)}`}>
              {group.groupName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">{group.groupName}</h2>
              {group.description&&<p className="text-xs text-slate-400 mt-0.5">{group.description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 p-5 pb-0">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-center">
              <p className="text-2xl font-black text-indigo-600">{safeFeats.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mt-0.5">Features</p>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-center">
              <p className="text-2xl font-black text-sky-600">{assigned.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mt-0.5">Staff</p>
            </div>
          </div>

          {/* Assigned staff */}
          <div className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Assigned Staff ({assigned.length})</p>
            {loadingS?(
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-indigo-400"/></div>
            ):assigned.length===0?(
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <Users size={28} className="mx-auto mb-2 text-slate-200"/>
                <p className="text-xs font-bold text-slate-400">No staff assigned yet</p>
              </div>
            ):(
              <div className="space-y-2">
                {assigned.map(s=>(
                  <div key={s.staffId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad(s.fullName)} text-xs font-black text-white`}>
                      {s.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{s.fullName}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{s.loginId} · {s.jobTitle}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={()=>navigate(`/access/staff/${s.staffId}`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-indigo-500 transition-colors" title="View permissions">
                        <ExternalLink size={13}/>
                      </button>
                      <button onClick={()=>remove(s.staffId)} disabled={removing===s.staffId}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50">
                        {removing===s.staffId?<Loader2 size={13} className="animate-spin"/>:<UserMinus size={13}/>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add staff */}
          <div className="px-5 pb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Add Staff to Group</p>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, ID, job title…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-4 text-xs font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none mb-2"/>
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {available.length===0?(
                <p className="text-xs text-slate-400 text-center py-4">{search?"No staff match":"All staff assigned"}</p>
              ):available.slice(0,25).map(s=>(
                <div key={s.staffId} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad(s.fullName)} text-[10px] font-black text-white`}>
                    {s.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{s.fullName}</p>
                    <p className="text-[10px] text-slate-400">{s.loginId} · {s.jobTitle}</p>
                  </div>
                  <button onClick={()=>assign(s.staffId)} disabled={assigning===s.staffId}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-50">
                    {assigning===s.staffId?<Loader2 size={11} className="animate-spin"/>:<UserPlus size={11}/>} Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="px-5 pb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Features ({safeFeats.length})</p>
            {mods.length===0?(
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <CheckSquare size={28} className="mx-auto mb-2 text-slate-200"/>
                <p className="text-xs font-bold text-slate-400">No features assigned — click Edit to add</p>
              </div>
            ):mods.map(mod=>(
              <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden mb-2">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{mod}</span>
                </div>
                <div className="p-3 space-y-1">
                  {(grouped[mod]??[]).map(f=>(
                    <div key={f.featureKey} className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-3 py-1.5">
                      <div className="h-3.5 w-3.5 rounded border-2 bg-indigo-500 border-indigo-500 flex items-center justify-center shrink-0">
                        <Check size={9} strokeWidth={3} className="text-white"/>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 flex-1">{f.featureName}</p>
                      <span className="text-[9px] font-mono text-slate-400">{f.featureKey}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function AccessGroupsPage() {
  const [groups, setGroups]         = useState<AccessGroupDto[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDto[]>([]);
  const [allStaff, setAllStaff]     = useState<StaffDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string|null>(null);
  const [query, setQuery]           = useState("");
  const [seeding, setSeeding]       = useState(false);
  const [seedMsg, setSeedMsg]       = useState<string|null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccessGroupDto|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessGroupDto|null>(null);
  const [viewTarget, setViewTarget] = useState<AccessGroupDto|null>(null);

  const fetchAll = useCallback(async()=>{
    try{
      setLoading(true);setError(null);
      const [g,f,s,menus]=await Promise.all([
        accessApi.getGroups(),
        accessApi.getAllFeatures(),
        staffApi.getAll(),
        menuApi.getSidebarTree().catch(()=>[] as ApiMenuItem[]),
      ]);
      setGroups(toArr<AccessGroupDto>(g));
      // Merge API features + menu features
      const menuFeats = flattenMenuToFeatures(menus);
      setAllFeatures([...toArr<FeatureDto>(f), ...menuFeats]);
      setAllStaff(toArr<StaffDto>(s));
    }catch{setError("Failed to load access groups.");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const seedFromJobTitles = async()=>{
    try{
      setSeeding(true);setSeedMsg(null);
      const titles=Array.from(new Set(allStaff.map(s=>s.jobTitle).filter(Boolean))) as string[];
      const existing=new Set(groups.map(g=>g.groupName.toLowerCase()));
      let created=0;
      for(const t of titles){
        if(existing.has(t.toLowerCase()))continue;
        try{await accessApi.createGroup({groupName:t,description:`Auto-created group for ${t} role`,featureKeys:[]});created++;}
        catch{/*skip*/}
      }
      await fetchAll();
      setSeedMsg(created>0?`✅ Created ${created} group${created!==1?"s":""} from job titles`:"ℹ️ All job title groups already exist");
      setTimeout(()=>setSeedMsg(null),4000);
    }catch{setSeedMsg("❌ Failed to seed groups");}
    finally{setSeeding(false);}
  };

  const handleDelete = async(group:AccessGroupDto)=>{
    try{await accessApi.deleteGroup(group.groupId);await fetchAll();setDeleteTarget(null);}
    catch(e:unknown){const er=e as {response?:{data?:{message?:string}}};alert(er.response?.data?.message??"Failed to delete group.");}
  };

  const filtered = useMemo(()=>groups.filter(g=>{
    const q=query.toLowerCase();
    return !q||g.groupName.toLowerCase().includes(q)||(g.description??"").toLowerCase().includes(q);
  }),[groups,query]);

  const unseeded = useMemo(()=>
    Array.from(new Set(allStaff.map(s=>s.jobTitle).filter(Boolean) as string[]))
      .filter(t=>!groups.some(g=>g.groupName.toLowerCase()===t.toLowerCase()))
  ,[allStaff,groups]);

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Layers size={18} className="text-indigo-500"/>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">Access Groups</h1>
              <p className="text-xs font-medium text-slate-400">{groups.length} groups · {allFeatures.length} total features</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unseeded.length>0&&(
              <button onClick={seedFromJobTitles} disabled={seeding}
                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                title={`Create groups for: ${unseeded.join(", ")}`}>
                {seeding?<Loader2 size={12} className="animate-spin"/>:<Zap size={12}/>}
                Seed from Job Titles ({unseeded.length})
              </button>
            )}
            <button onClick={()=>setCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-black text-white shadow-md hover:shadow-lg transition-all">
              <Plus size={15}/> Create Group
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-5 lg:px-8 py-5 flex flex-col">
        {/* Seed message */}
        {seedMsg&&(
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
            className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700 shrink-0">
            {seedMsg}
          </motion.div>
        )}

        {/* Unseeded hint */}
        {!loading&&unseeded.length>0&&(
          <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 shrink-0">
            <p className="text-xs font-black text-amber-700 mb-2">💡 {unseeded.length} job title{unseeded.length!==1?"s":""} without a group:</p>
            <div className="flex flex-wrap gap-1.5">
              {unseeded.map(t=>(
                <span key={t} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ${roleBadge(t)}`}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4 relative max-w-sm shrink-0">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search groups…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"/>
          {query&&<button onClick={()=>setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14}/></button>}
        </div>

        {error&&<div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-600 shrink-0"><AlertCircle size={15}/> {error}</div>}

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading?(
            <div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500"/></div>
          ):filtered.length===0?(
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Layers size={40} className="text-slate-200" strokeWidth={1.5}/>
              <p className="text-sm font-bold text-slate-500">{query?"No groups match":"No access groups yet"}</p>
              {!query&&<button onClick={()=>setCreateOpen(true)} className="rounded-xl bg-indigo-500 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-600">Create First Group</button>}
            </div>
          ):(
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-6 py-4 text-left">Group Name</th>
                  <th className="border-b border-slate-200 px-6 py-4 text-left">Description</th>
                  <th className="border-b border-slate-200 px-6 py-4 text-center">Features</th>
                  <th className="border-b border-slate-200 px-6 py-4 text-center">Staff</th>
                  <th className="border-b border-slate-200 px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g,idx)=>(
                  <motion.tr key={g.groupId} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                    transition={{delay:idx*0.02}} className="group transition-colors hover:bg-indigo-50/30">
                    <td className="border-b border-slate-100 px-6 py-3.5">
                      <button onClick={()=>setViewTarget(g)} className="flex items-center gap-3 hover:text-indigo-600 transition-colors">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black shrink-0 ${roleBadge(g.groupName)}`}>
                          {g.groupName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800 group-hover:text-indigo-600">{g.groupName}</span>
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-6 py-3.5 text-xs font-medium text-slate-500 max-w-[220px]">
                      <span className="truncate block">{g.description||"—"}</span>
                    </td>
                    <td className="border-b border-slate-100 px-6 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                        <CheckSquare size={11}/> {toArr<string>(g.features).length}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-6 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-600 ring-1 ring-inset ring-sky-500/10">
                        <Users size={11}/> {g.staffCount}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={()=>setEditTarget(g)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500"><Edit2 size={14} strokeWidth={2.5}/></button>
                        <button onClick={()=>setDeleteTarget(g)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} strokeWidth={2.5}/></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-right text-[11px] font-bold text-slate-400 shrink-0">
          Showing {filtered.length} of {groups.length} group{groups.length!==1?"s":""}
        </p>
      </div>

      <AnimatePresence>
        {createOpen&&<GroupModal mode="create" allFeatures={allFeatures} onClose={()=>setCreateOpen(false)} onSaved={fetchAll}/>}
        {editTarget&&<GroupModal mode="edit" group={editTarget} allFeatures={allFeatures} onClose={()=>setEditTarget(null)} onSaved={fetchAll}/>}
        {deleteTarget&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setDeleteTarget(null)} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"/>
            <motion.div initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:0.95,y:20}}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mx-auto mb-4"><AlertTriangle size={28} className="text-red-500"/></div>
              <h2 className="text-center text-lg font-black text-slate-800">Delete Group?</h2>
              <p className="mt-2 text-center text-sm font-medium text-slate-500"><strong>{deleteTarget.groupName}</strong> will be permanently removed.</p>
              {deleteTarget.staffCount>0&&(
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs font-semibold text-amber-700">
                  ⚠️ {deleteTarget.staffCount} staff will lose this group's access.
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button onClick={()=>setDeleteTarget(null)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
                <button onClick={()=>handleDelete(deleteTarget)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600">
                  <Trash2 size={15}/> Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
        {viewTarget&&(
          <GroupPanel group={viewTarget} allFeatures={allFeatures} allStaff={allStaff}
            onClose={()=>setViewTarget(null)} onRefresh={fetchAll}/>
        )}
      </AnimatePresence>
    </div>
  );
}
