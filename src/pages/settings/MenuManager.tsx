import { useState, useEffect } from 'react';
import { Loader2, Trash2, LayoutGrid, AlertCircle, Edit3, Plus } from 'lucide-react';
import { menuApi, type ApiMenuItem } from '../../api/menuApi';
import AddMenuModal from '../../components/layout/AddMenuModal';

export default function MenuManager() {
  const [menus, setMenus] = useState<ApiMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<ApiMenuItem | null>(null);

const fetchAllMenus = async () => {
    try {
      setLoading(true);
      const treeData = await menuApi.getSidebarTree();
      const flatList: ApiMenuItem[] = [];
      
      // 🌟 Logic: We pass the parentId through the recursion manually
      const flatten = (items: ApiMenuItem[], parentId: number | null = null, prefix = "") => {
        items.forEach(item => {
          const itemWithParent = { 
            ...item, 
            parentId: item.parentId ?? parentId, // 🌟 Inject parent context
            title: prefix + item.title 
          };
          
          flatList.push(itemWithParent);
          
          if (item.children && item.children.length > 0) {
            flatten(item.children, item.id, prefix + "— ");
          }
        });
      };

      if (Array.isArray(treeData)) flatten(treeData);
      setMenus(flatList);
    } catch (err) {
      setError("Failed to sync with navigation database.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAllMenus(); }, []);

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      setLoading(true);
      await menuApi.deleteMenu(id);
      await fetchAllMenus();
    window.dispatchEvent(new Event('navigation-updated'));  
    } catch (err) {
      alert("Failed to delete. Ensure it has no children first.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (menu: ApiMenuItem) => {
    // Strip the "— " prefix for the edit form
    const cleanMenu = { ...menu, title: menu.title.replace(/^[—\s]+/, '') };
    setSelectedMenu(cleanMenu);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedMenu(null);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Stretches Full Width */}
      <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/30">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
            <LayoutGrid size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Navigation Management</h1>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Configure dynamic sidebar hierarchy</p>
          </div>
        </div>
        
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
        >
          <Plus size={18} />
          Add New Menu
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="m-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 font-semibold animate-in fade-in duration-300">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Table Area - Fills Frame */}
      <div className="flex-1 overflow-auto custom-scrollbar px-6 py-4">
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-widest w-20">ID</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-widest">Display Title</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-widest">Route Path</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[11px] tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {!loading && menus.map((menu) => (
                <tr key={menu.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">#{menu.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{menu.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-mono ${menu.route ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400 italic'}`}>
                      {menu.route || 'Dropdown / Parent'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(menu)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit Menu"
                      >
                        <Edit3 size={17} />
                      </button>
                      <button
                        onClick={() => handleDelete(menu.id, menu.title)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Menu"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="animate-spin" size={30} />
              <p className="text-sm font-semibold">Syncing with database...</p>
            </div>
          )}

          {!loading && menus.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-medium">
              Your navigation is empty. Start by adding a root menu.
            </div>
          )}
        </div>
      </div>

      {/* Shared Modal for Add/Edit */}
      <AddMenuModal 
  isOpen={isModalOpen} // 🌟 Changed from isAddModalOpen
  onClose={() => setIsModalOpen(false)} // 🌟 Changed from setIsAddModalOpen
  onSuccess={fetchAllMenus}
  initialData={selectedMenu}
/>
    </div>
  );
}