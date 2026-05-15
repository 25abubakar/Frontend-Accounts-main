import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import type { OrgFlatTreeNode, VacancyDto, CreatePositionDto, CreateOrgNodeDto } from "../types";
import { orgTreeApi } from "../api/orgTreeApi";
import { positionApi } from "../api/positionApi";
import { staffApi } from "../api/staffApi";
import AddNodeModal from "../components/AddNodeModal";
import EditRecordModal, { type EditTarget } from "../components/EditRecordModal";
import OrgToolbar, { type TableFilters } from "../components/OrgToolbar";
import OrgGridCard from "../components/OrgGridCard";
import OrgTable from "../components/OrgTable";
import { containerVariants } from "../utils/orgGroupTreeDesign";

import SimpleDeleteModal from "../components/DeleteModel/SimpleDeleteModal";
import TypeConfirmDeleteModal from "../components/DeleteModel/TypeConfirmDeleteModal";

const DEFAULT_FILTERS: TableFilters = {
  country: "",
  company: "",
  branch: "",
  jobTitle: "",
  status: "all",
};

export default function OrgTreeTable() {
  const [treeData, setTreeData] = useState<OrgFlatTreeNode[]>([]);
  const [positions, setPositions] = useState<VacancyDto[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<OrgFlatTreeNode[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [filters, setFilters] = useState<TableFilters>(DEFAULT_FILTERS);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string | number;
    type: "Entity" | "Position";
    name: string;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [orgData, posData, staffData] = await Promise.all([
        orgTreeApi.getFlatTree(),
        positionApi.getAll(),
        staffApi.getAll(),
      ]);

      const mergedPositions: VacancyDto[] = posData.map(pos => {
        const occupant = staffData.find(s => s.vacancyId === pos.vacancyId);
        if (occupant) {
          return {
            ...pos,
            isFilled: true, 
            employee: {
              staffId: occupant.staffId,
              fullName: occupant.fullName,
              email: occupant.email ?? "",
              phone: occupant.phone ?? "",
              vacancyId: pos.vacancyId,
              vacancyCode: pos.vacancyCode,
              jobTitle: pos.jobTitle,
              joiningDate: occupant.joiningDate ?? new Date().toISOString(),
            }
          } as VacancyDto;
        }
        return pos; 
      });

      setTreeData(orgData);
      setPositions(mergedPositions); 
    } catch {
      setError("Unable to connect to the server. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);
  useEffect(() => { setFilters(DEFAULT_FILTERS); }, [viewMode, breadcrumbs.length]);

  const currentParent = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : null;

  const gridNodes = treeData
    .filter(node => (currentParent ? node.parentId === currentParent.id : node.parentId === null))
    .filter(node => node.label !== "Staff");

  const mappedOldStaff: VacancyDto[] = treeData
    .filter(node => node.label === "Staff")
    .map(staff => {
      const path = staff.treePath?.split(" → ") || [];
      return {
        vacancyId: staff.id.toString(),
        organizationId: staff.parentId || 0,
        branchName: path[2] || "—",
        companyName: path[1] || "—",
        countryName: path[0] || "—",
        nodeLabel: "Staff",
        vacancyCode: staff.code || "LEGACY",
        jobTitle: staff.name.split(" - ")[1] || "Staff",
        department: "General",
        isFilled: true,
        createdDate: new Date().toISOString(),
        employee: {
          staffId: staff.id.toString(),
          fullName: staff.name.split(" - ")[0],
          email: `${staff.name.split(" - ")[0].toLowerCase().replace(/\s+/g, ".")}@lalgroup.com`,
          phone: "—",
          vacancyId: staff.id.toString(),
          vacancyCode: staff.code || "LEGACY",
          jobTitle: staff.name.split(" - ")[1] || "Staff",
          joiningDate: new Date().toISOString(),
        },
      };
    });

  const allCombinedData: VacancyDto[] = [...mappedOldStaff, ...positions];
  const openVacancies = allCombinedData.filter(v => !v.isFilled);

  const countryCodeMap = Object.fromEntries(
    treeData
      .filter(n => n.label === "Country" && n.code)
      .map(n => [n.name, n.code as string])
  );

  const scopedData = allCombinedData.filter(item => {
    if (!currentParent) return true;
    if (currentParent.label === "Country") return item.countryName === currentParent.name;
    if (currentParent.label === "Group" || currentParent.label === "Company")
      return item.companyName === currentParent.name;
    if (currentParent.label === "Branch") return item.branchName === currentParent.name;
    return item.organizationId === currentParent.id;
  });

  const filteredTableData = scopedData.filter(item => {
    if (filters.country && item.countryName !== filters.country) return false;
    if (filters.company && item.companyName !== filters.company) return false;
    if (filters.branch && item.branchName !== filters.branch) return false;
    if (filters.jobTitle && item.jobTitle !== filters.jobTitle) return false;
    if (filters.status === "active" && !item.isFilled) return false;
    if (filters.status === "vacant" && item.isFilled) return false;
    return true;
  });

  const handleCreateNode = async (data: CreateOrgNodeDto) => {
    await orgTreeApi.createNode(data);
    await fetchAllData();
  };

  /**
   * 🌟 FIXED: Single API call. Passes the count to the backend.
   */
  const handleCreatePosition = async (data: CreatePositionDto, count: number = 1) => {
    try {
      // 🌟 FIXED: Changed "count" to "vacancyCount" to match your C# DTO!
      await positionApi.create({ ...data, vacancyCount: count } as any);
      await fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create position(s).");
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "Entity") {
        await orgTreeApi.deleteNode(deleteTarget.id as number);
      } else {
        await positionApi.delete(deleteTarget.id as string);
      }
      await fetchAllData();
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to delete.";
      alert(msg);
    }
  };

  const handleEditEntity = (id: number) => {
    const entity = treeData.find(n => n.id === id);
    if (entity)
      setEditTarget({ type: "Entity", id: entity.id, name: entity.name, code: entity.code, label: entity.label });
  };

  const handleEditPosition = (id: string) => {
    const pos = allCombinedData.find(p => p.vacancyId === id);
    if (pos) {
      setEditTarget({
        type: "Position",
        id: pos.vacancyId,
        jobTitle: pos.jobTitle,
        department: pos.department,
        countryName: pos.countryName,
        companyName: pos.companyName,
        isLegacy: pos.vacancyCode === "LEGACY",
        employee: pos.employee
          ? {
              staffId: pos.employee.staffId,
              fullName: pos.employee.fullName,
              email: pos.employee.email,
              phone: pos.employee.phone,
            }
          : null,
      });
    }
  };

  const executeEditEntity = async (id: number, data: { name: string; code: string | null }) => {
    const entity = treeData.find(n => n.id === id);
    await orgTreeApi.updateNode(id, {
      name: data.name,
      code: data.code,
      label: entity?.label ?? "Company",
      parentId: entity?.parentId ?? null,
    });
    await fetchAllData();
  };

  const executeEditPosition = async (id: string, data: { jobTitle: string; department: string }) => {
    const pos = allCombinedData.find(p => p.vacancyId === id);
    await positionApi.update(id, {
      jobTitle: data.jobTitle,
      department: data.department,
      organizationId: pos?.organizationId ?? 0,
    });
    await fetchAllData();
  };

  const executeEditEmployee = async (
    staffId: string,
    data: { fullName: string; email: string; phone: string }
  ) => {
    await staffApi.update(staffId, data);
    await fetchAllData();
  };

  const executeTransferStaff = async (staffId: string, newVacancyId: string) => {
    try {
      await staffApi.transfer(staffId, { newVacancyId });
      await fetchAllData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to transfer employee.";
      throw new Error(msg);
    }
  };

  if (isLoading && treeData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 size={40} className="text-[#00A3FF] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <p className="text-sm font-semibold text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white p-4 lg:p-6 2xl:p-8 font-sans text-slate-900 overflow-y-auto custom-scrollbar">
      <div className="w-full">

        <OrgToolbar
          viewMode={viewMode}
          setViewMode={setViewMode}
          breadcrumbs={breadcrumbs}
          setBreadcrumbs={setBreadcrumbs}
          currentParent={currentParent}
          onAddClick={() => setIsAddModalOpen(true)}
          treeData={treeData}
          allData={scopedData}
          filters={filters}
          onFilterChange={setFilters}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={`${breadcrumbs.length}-${viewMode}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            {/* ── GRID VIEW ── */}
            {viewMode === "grid" && gridNodes.length > 0 && (
              <div className="mb-10 w-full">
                {currentParent && (
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">
                    Structure
                  </h3>
                )}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 w-full"
                >
                  {gridNodes.map(node => (
                    <OrgGridCard
                      key={node.id}
                      node={node}
                      onClick={() => setBreadcrumbs([...breadcrumbs, node])}
                      onEdit={() => handleEditEntity(node.id)}
                      onDelete={() =>
                        setDeleteTarget({ id: node.id, type: "Entity", name: node.name })
                      }
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {/* ── TABLE VIEW ── */}
            {viewMode === "table" && (
              <div className="w-full mb-10 overflow-hidden">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {currentParent ? `${currentParent.name} — Personnel` : "Global Directory"}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {filteredTableData.length} record{filteredTableData.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="relative w-full rounded-2xl shadow-sm border border-slate-200 bg-white">
                  <OrgTable
                    nodes={filteredTableData}
                    countryCodeMap={countryCodeMap}
                    onEdit={id => handleEditPosition(id)}
                    onDelete={id => {
                      const pos = allCombinedData.find(p => p.vacancyId === id);
                      setDeleteTarget({
                        id,
                        type: "Position",
                        name: pos ? pos.jobTitle : "This Position",
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Modals ── */}
        <AddNodeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          parentNode={currentParent}
          treeData={treeData} 
          onSubmitNode={handleCreateNode}
          onSubmitPosition={handleCreatePosition}
        />

        <EditRecordModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          target={editTarget}
          openVacancies={openVacancies}
          onSubmitEntity={executeEditEntity}
          onSubmitPosition={executeEditPosition}
          onSubmitEmployee={executeEditEmployee}
          onTransferStaff={executeTransferStaff}
        />

        <TypeConfirmDeleteModal
          isOpen={!!deleteTarget && deleteTarget.type === "Entity"}
          onClose={() => setDeleteTarget(null)}
          onConfirm={executeDelete}
          itemName={deleteTarget?.name || ""}
        />

        <SimpleDeleteModal
          isOpen={!!deleteTarget && deleteTarget.type === "Position"}
          onClose={() => setDeleteTarget(null)}
          onConfirm={executeDelete}
          itemName={deleteTarget?.name || ""}
        />
      </div>
    </div>
  );
}