import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Globe2,
  Link2,
  Menu as MenuIcon,
  Search,
  Settings2,
  UserRoundCheck,
  Users2,
  X,
} from "lucide-react";
import { orgTreeApi } from "../../api/orgTreeApi";
import { staffApi } from "../../api/staffApi";
import type { CreateAppNoteRequest, AppNoteTargetRequest } from "../../models/appNoteModels";
import type { LookupDto } from "../../models/lookupModels";
import type { MenuDto } from "../../models/menuModels";
import type { OrgNode, StaffDto } from "../../types";

interface Props {
  sourceTypeCode: "ADMIN" | "USER";
  menus: MenuDto[];
  getLookup: (lookupTypeCode: string) => LookupDto[];
  getDefault: (lookupTypeCode: string) => string;
  currentMenuCode?: string | null;
  currentEntityType?: string | null;
  currentEntityId?: string | null;
  onCancel: () => void;
  onSubmit: (request: CreateAppNoteRequest) => void;
}

const INP = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50";
const LBL = "mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400";
const PANEL = "rounded-xl border border-slate-200 bg-white p-4";

type AudienceMode = "ALL" | "STAFF";
type PlacementMode = "EVERYWHERE" | "MENU" | "RECORD";

function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values", "data", "items"]) if (Array.isArray(o[k])) return o[k] as T[];
  }
  return [];
}

function norm(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function sortOrgNodes(nodes: OrgNode[]) {
  return [...nodes].sort((a, b) => a.name.localeCompare(b.name));
}

function isLabel(node: OrgNode, label: string) {
  return norm(node.label) === norm(label);
}

function isDescendantOf(node: OrgNode, ancestorId: number, byId: Map<number, OrgNode>) {
  let parentId = node.parentId;
  while (parentId !== null && parentId !== undefined) {
    if (parentId === ancestorId) return true;
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return false;
}

export function NoteForm({
  sourceTypeCode,
  menus,
  getLookup,
  getDefault,
  currentMenuCode,
  currentEntityType,
  currentEntityId,
  onCancel,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteTypeCode, setNoteTypeCode] = useState("");
  const [priorityCode, setPriorityCode] = useState("");
  const [visibilityTypeCode, setVisibility] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [menuCode, setMenuCode] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [requireAck, setRequireAck] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [audienceMode, setAudienceMode] = useState<AudienceMode>("ALL");
  const [placementMode, setPlacementMode] = useState<PlacementMode>("EVERYWHERE");
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [allStaff, setAllStaff] = useState<StaffDto[]>([]);
  const [targetDataLoading, setTargetDataLoading] = useState(false);
  const [targetDataError, setTargetDataError] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState("");

  useEffect(() => {
    setNoteTypeCode(sourceTypeCode === "ADMIN" ? "INSTRUCTION" : "USER_NOTE");
    setPriorityCode(getDefault("PRIORITY") || "NORMAL");
    setVisibility(sourceTypeCode === "ADMIN" ? "GENERAL" : "PRIVATE");
    setCategoryCode(getDefault("CATEGORY") || "GENERAL");
    setMenuCode(currentMenuCode || "");
    setEntityType(sourceTypeCode === "USER" ? (currentEntityType || "") : "");
    setEntityId(sourceTypeCode === "USER" ? (currentEntityId || "") : "");
    setRequireAck(sourceTypeCode === "ADMIN");
    setAudienceMode("ALL");
    setPlacementMode("EVERYWHERE");
    resetStaffTarget();
  }, [sourceTypeCode]);

  useEffect(() => {
    if (sourceTypeCode !== "ADMIN") return;

    let ignore = false;
    const loadTargetData = async () => {
      try {
        setTargetDataLoading(true);
        setTargetDataError(null);
        const [orgData, staffData] = await Promise.all([
          orgTreeApi.getAll(),
          staffApi.getAll(),
        ]);
        if (ignore) return;
        setOrgNodes(toArr<OrgNode>(orgData));
        setAllStaff(toArr<StaffDto>(staffData));
      } catch {
        if (!ignore) setTargetDataError("Unable to load staff target options.");
      } finally {
        if (!ignore) setTargetDataLoading(false);
      }
    };

    loadTargetData();
    return () => { ignore = true; };
  }, [sourceTypeCode]);

  useEffect(() => {
    if (sourceTypeCode !== "ADMIN") return;
    if (audienceMode === "STAFF") {
      setVisibility("STAFF");
      return;
    }
    if (placementMode === "MENU") setVisibility("MENU");
    else if (placementMode === "RECORD") setVisibility("RECORD");
    else setVisibility("GENERAL");
  }, [audienceMode, placementMode, sourceTypeCode]);

  const orgById = useMemo(() => new Map(orgNodes.map(node => [node.id, node])), [orgNodes]);
  const selectedCountry = selectedCountryId ? orgById.get(Number(selectedCountryId)) ?? null : null;
  const selectedCompany = selectedCompanyId ? orgById.get(Number(selectedCompanyId)) ?? null : null;
  const selectedBranch = selectedBranchId ? orgById.get(Number(selectedBranchId)) ?? null : null;

  const countries = useMemo(
    () => sortOrgNodes(orgNodes.filter(node => isLabel(node, "Country"))),
    [orgNodes]
  );

  const companies = useMemo(
    () => sortOrgNodes(
      orgNodes.filter(node =>
        isLabel(node, "Company") &&
        (!selectedCountry || isDescendantOf(node, selectedCountry.id, orgById))
      )
    ),
    [orgNodes, orgById, selectedCountry]
  );

  const branches = useMemo(
    () => sortOrgNodes(
      orgNodes.filter(node =>
        isLabel(node, "Branch") &&
        (!selectedCompany || isDescendantOf(node, selectedCompany.id, orgById))
      )
    ),
    [orgNodes, orgById, selectedCompany]
  );

  const staffInSelectedOrg = useMemo(
    () => allStaff.filter(staff => {
      const countryOk = !selectedCountry || norm(staff.countryName) === norm(selectedCountry.name);
      const companyOk = !selectedCompany || norm(staff.companyName) === norm(selectedCompany.name);
      const branchOk = !selectedBranch || norm(staff.branchName) === norm(selectedBranch.name);
      return countryOk && companyOk && branchOk;
    }),
    [allStaff, selectedCountry, selectedCompany, selectedBranch]
  );

  const roles = useMemo(
    () => selectedBranch
      ? Array.from(new Set(staffInSelectedOrg.map(staff => staff.jobTitle?.trim()).filter(Boolean) as string[]))
        .sort((a, b) => a.localeCompare(b))
      : [],
    [staffInSelectedOrg, selectedBranch]
  );

  const staffOptions = useMemo(
    () => selectedRole
      ? staffInSelectedOrg
        .filter(staff => norm(staff.jobTitle) === norm(selectedRole))
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
      : [],
    [staffInSelectedOrg, selectedRole]
  );

  const filteredStaffOptions = useMemo(
    () => staffOptions.filter(staff => {
      const query = norm(staffSearch);
      if (!query) return true;
      return norm(staff.fullName).includes(query) || norm(staff.loginId).includes(query);
    }),
    [staffOptions, staffSearch]
  );

  const selectedStaff = useMemo(
    () => allStaff
      .filter(staff => selectedStaffIds.includes(staff.staffId))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [allStaff, selectedStaffIds]
  );

  const visibleStaffIds = filteredStaffOptions.map(staff => staff.staffId);
  const allVisibleSelected = visibleStaffIds.length > 0 && visibleStaffIds.every(id => selectedStaffIds.includes(id));

  function resetStaffTarget() {
    setSelectedCountryId("");
    setSelectedCompanyId("");
    setSelectedBranchId("");
    setSelectedRole("");
    setSelectedStaffIds([]);
    setStaffSearch("");
  }

  const setAudience = (mode: AudienceMode) => {
    setAudienceMode(mode);
    if (mode === "ALL") resetStaffTarget();
  };

  const setPlacement = (mode: PlacementMode) => {
    setPlacementMode(mode);
    if (mode !== "MENU") setMenuCode("");
    if (mode !== "RECORD") {
      setEntityType("");
      setEntityId("");
    }
  };

  const toggleStaffTarget = (staffId: string) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const selectVisibleStaff = () => {
    setSelectedStaffIds(prev => Array.from(new Set([...prev, ...visibleStaffIds])));
  };

  const clearVisibleStaff = () => {
    setSelectedStaffIds(prev => prev.filter(id => !visibleStaffIds.includes(id)));
  };

  const buildTargets = (): AppNoteTargetRequest[] => {
    if (sourceTypeCode !== "ADMIN") return [{ targetTypeCode: "ALL", targetValue: "*" }];

    const targets: AppNoteTargetRequest[] = [];
    if (audienceMode === "ALL") {
      targets.push({ targetTypeCode: "ALL", targetValue: "*" });
    } else {
      targets.push(...selectedStaffIds.map(staffId => ({ targetTypeCode: "STAFF", targetValue: staffId })));
    }

    if (placementMode === "MENU" && menuCode) {
      targets.push({ targetTypeCode: "MENU", targetValue: menuCode });
    }
    if (placementMode === "RECORD" && entityType && entityId) {
      targets.push({ targetTypeCode: "RECORD", targetValue: `${entityType}:${entityId}` });
    }

    return targets;
  };

  const submit = () => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!noteBody.trim()) { setError("Message body is required."); return; }
    if (!noteTypeCode) { setError("Note type is required."); return; }
    if (!priorityCode) { setError("Priority is required."); return; }
    if (!visibilityTypeCode) { setError("Visibility is required."); return; }
    if (sourceTypeCode === "ADMIN" && audienceMode === "STAFF") {
      if (!selectedCountryId) { setError("Country is required."); return; }
      if (!selectedCompanyId) { setError("Company is required."); return; }
      if (!selectedBranchId) { setError("Branch is required."); return; }
      if (!selectedRole) { setError("Role is required."); return; }
      if (selectedStaffIds.length === 0) { setError("Select at least one staff member."); return; }
    }
    if (sourceTypeCode === "ADMIN" && placementMode === "MENU" && !menuCode) {
      setError("Menu is required.");
      return;
    }
    if (sourceTypeCode === "ADMIN" && placementMode === "RECORD" && (!entityType.trim() || !entityId.trim())) {
      setError("Entity type and entity ID are required.");
      return;
    }
    setError(null);

    onSubmit({
      title: title.trim(),
      noteBody: noteBody.trim(),
      noteTypeCode,
      sourceTypeCode,
      categoryCode: categoryCode || null,
      priorityCode,
      visibilityTypeCode,
      menuCode: placementMode === "MENU" ? menuCode || null : null,
      moduleName: null,
      entityType: placementMode === "RECORD" ? entityType || null : null,
      entityId: placementMode === "RECORD" ? entityId || null : null,
      startDateUtc: startDate || null,
      endDateUtc: endDate || null,
      isPublished: true,
      isPinned,
      isPopup,
      requireAcknowledgement: requireAck,
      allowDismiss: true,
      targets: buildTargets(),
    });
  };

  const menuOptions: LookupDto[] = menus.map(x => ({
    lookupTypeCode: "MENU",
    valueCode: x.menuCode,
    displayText: x.menuName,
    sortOrder: x.sortOrder,
    isDefault: false,
  }));

  const audienceOptions = [
    { mode: "ALL" as const, label: "Everyone", count: "All users", Icon: Users2 },
    { mode: "STAFF" as const, label: "Selected staff", count: `${selectedStaffIds.length} selected`, Icon: UserRoundCheck },
  ];

  const placementOptions = [
    { mode: "EVERYWHERE" as const, label: "Everywhere", Icon: Globe2 },
    { mode: "MENU" as const, label: "Menu", Icon: MenuIcon },
    { mode: "RECORD" as const, label: "Record", Icon: Link2 },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className={PANEL}>
        <div className="mb-3 flex items-center gap-2">
          <FileText size={16} className="text-blue-500" />
          <div className="text-sm font-black text-slate-800">Instruction</div>
        </div>
        <div className="space-y-3">
          <div>
            <label className={LBL}>Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter title..."
              className={INP}
            />
          </div>
          <div>
            <label className={LBL}>Message *</label>
            <textarea
              value={noteBody}
              onChange={e => setNoteBody(e.target.value)}
              rows={4}
              placeholder="Write the instruction here..."
              className={`${INP} resize-none`}
            />
          </div>
        </div>
      </div>

      {sourceTypeCode === "ADMIN" && (
        <div className={PANEL}>
          <div className="mb-3 flex items-center gap-2">
            <UserRoundCheck size={16} className="text-blue-500" />
            <div className="text-sm font-black text-slate-800">Delivery</div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={LBL}>Audience</label>
              <div className="grid grid-cols-2 gap-2">
                {audienceOptions.map(({ mode, label, count, Icon }) => {
                  const selected = audienceMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAudience(mode)}
                      className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        selected
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">{label}</span>
                        <span className="block truncate text-[11px] font-bold text-slate-400">{count}</span>
                      </span>
                      {selected && <CheckCircle2 size={16} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {audienceMode === "STAFF" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <label className={`${LBL} mb-0`}>Choose Staff</label>
                  {targetDataLoading && <span className="text-[10px] font-bold text-blue-500">Loading...</span>}
                </div>

                {targetDataError && (
                  <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                    {targetDataError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div>
                    <label className={LBL}>Country *</label>
                    <select
                      value={selectedCountryId}
                      onChange={e => {
                        setSelectedCountryId(e.target.value);
                        setSelectedCompanyId("");
                        setSelectedBranchId("");
                        setSelectedRole("");
                        setSelectedStaffIds([]);
                        setStaffSearch("");
                      }}
                      className={INP}
                      disabled={targetDataLoading}
                    >
                      <option value="">Select country...</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>{country.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={LBL}>Company *</label>
                    <select
                      value={selectedCompanyId}
                      onChange={e => {
                        setSelectedCompanyId(e.target.value);
                        setSelectedBranchId("");
                        setSelectedRole("");
                        setSelectedStaffIds([]);
                        setStaffSearch("");
                      }}
                      className={INP}
                      disabled={!selectedCountryId || targetDataLoading}
                    >
                      <option value="">Select company...</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={LBL}>Branch *</label>
                    <select
                      value={selectedBranchId}
                      onChange={e => {
                        setSelectedBranchId(e.target.value);
                        setSelectedRole("");
                        setSelectedStaffIds([]);
                        setStaffSearch("");
                      }}
                      className={INP}
                      disabled={!selectedCompanyId || targetDataLoading}
                    >
                      <option value="">Select branch...</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={LBL}>Role *</label>
                    <select
                      value={selectedRole}
                      onChange={e => {
                        setSelectedRole(e.target.value);
                        setSelectedStaffIds([]);
                        setStaffSearch("");
                      }}
                      className={INP}
                      disabled={!selectedBranchId || targetDataLoading}
                    >
                      <option value="">Select role...</option>
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-2">
                    <div className="relative min-w-52 flex-1">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={staffSearch}
                        onChange={e => setStaffSearch(e.target.value)}
                        placeholder="Search staff..."
                        disabled={!selectedRole}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {staffSearch && (
                        <button
                          type="button"
                          onClick={() => setStaffSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={allVisibleSelected ? clearVisibleStaff : selectVisibleStaff}
                      disabled={!selectedRole || visibleStaffIds.length === 0}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {allVisibleSelected ? "Clear shown" : "Select shown"}
                    </button>
                  </div>

                  <div className="max-h-44 overflow-y-auto p-2">
                    {!selectedRole ? (
                      <div className="px-2 py-5 text-center text-xs font-semibold text-slate-400">Select a role to see staff.</div>
                    ) : filteredStaffOptions.length === 0 ? (
                      <div className="px-2 py-5 text-center text-xs font-semibold text-slate-400">No staff found.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {filteredStaffOptions.map(staff => (
                          <label
                            key={staff.staffId}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStaffIds.includes(staff.staffId)}
                              onChange={() => toggleStaffTarget(staff.staffId)}
                              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {staff.fullName} {staff.loginId ? `(${staff.loginId})` : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedStaff.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedStaff.slice(0, 8).map(staff => (
                      <button
                        key={staff.staffId}
                        type="button"
                        onClick={() => toggleStaffTarget(staff.staffId)}
                        className="inline-flex max-w-48 items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        <span className="truncate">{staff.fullName}</span>
                        <X size={11} className="shrink-0" />
                      </button>
                    ))}
                    {selectedStaff.length > 8 && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                        +{selectedStaff.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={LBL}>Where</label>
              <div className="grid grid-cols-3 gap-2">
                {placementOptions.map(({ mode, label, Icon }) => {
                  const selected = placementMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPlacement(mode)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition-all ${
                        selected
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon size={14} />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {placementMode === "MENU" && (
              <div>
                <label className={LBL}>Menu *</label>
                <select value={menuCode} onChange={e => setMenuCode(e.target.value)} className={INP}>
                  <option value="">Select menu...</option>
                  {menuOptions.map(x => (
                    <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
                  ))}
                </select>
              </div>
            )}

            {placementMode === "RECORD" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={LBL}>Entity Type *</label>
                  <input
                    value={entityType}
                    onChange={e => setEntityType(e.target.value)}
                    placeholder="Patient, Claim, Appointment..."
                    className={INP}
                  />
                </div>
                <div>
                  <label className={LBL}>Entity ID *</label>
                  <input
                    value={entityId}
                    onChange={e => setEntityId(e.target.value)}
                    placeholder="101"
                    className={INP}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={PANEL}>
        <div className="mb-3 flex items-center gap-2">
          <Settings2 size={16} className="text-blue-500" />
          <div className="text-sm font-black text-slate-800">Settings</div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LBL}>Note Type *</label>
            <select value={noteTypeCode} onChange={e => setNoteTypeCode(e.target.value)} className={INP}>
              <option value="">Select type...</option>
              {getLookup("NOTE_TYPE").map(x => (
                <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LBL}>Priority *</label>
            <select value={priorityCode} onChange={e => setPriorityCode(e.target.value)} className={INP}>
              <option value="">Select priority...</option>
              {getLookup("PRIORITY").map(x => (
                <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LBL}>Category</label>
            <select value={categoryCode} onChange={e => setCategoryCode(e.target.value)} className={INP}>
              <option value="">Select category...</option>
              {getLookup("CATEGORY").map(x => (
                <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
              ))}
            </select>
          </div>

          {sourceTypeCode === "USER" && (
            <div>
              <label className={LBL}>Menu Link</label>
              <select value={menuCode} onChange={e => setMenuCode(e.target.value)} className={INP}>
                <option value="">No menu</option>
                {menuOptions.map(x => (
                  <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={LBL}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INP} />
          </div>

          <div>
            <label className={LBL}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={INP} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          {[
            { label: "Require acknowledgement", value: requireAck, set: setRequireAck },
            { label: "Pin to top", value: isPinned, set: setIsPinned },
            { label: "Show as popup", value: isPopup, set: setIsPopup },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={value}
                onChange={e => set(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700"
        >
          Save Note
        </button>
      </div>
    </div>
  );
}
