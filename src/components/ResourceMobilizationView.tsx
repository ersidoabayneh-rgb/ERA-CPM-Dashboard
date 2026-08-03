import React, { useState } from 'react';
import { Project, ResourceMobilizationItem, MaterialProductionItem } from '../types';
import { 
  Plus, 
  Trash2, 
  Truck, 
  Users, 
  Layers, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Save 
} from 'lucide-react';

interface AccountingInputProps {
  value: number;
  onChange?: (val: number) => void;
  disabled?: boolean;
  className?: string;
  focusColor?: string;
}

function AccountingInput({
  value,
  onChange,
  disabled = false,
  className = "",
  focusColor = "focus:ring-emerald-500"
}: AccountingInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value.toString());

  React.useEffect(() => {
    if (!isEditing) {
      setLocalVal(value === 0 ? '' : value.toString());
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (onChange) {
      let clean = localVal.replace(/,/g, '').trim();
      let isNegative = false;
      if (clean.startsWith('(') && clean.endsWith(')')) {
        isNegative = true;
        clean = clean.slice(1, -1);
      }
      let num = parseFloat(clean);
      if (isNegative) num = -num;
      onChange(isNaN(num) ? 0 : num);
    }
  };

  let displayVal = "";
  if (value === 0) {
    displayVal = "—";
  } else if (value < 0) {
    displayVal = `(${Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })})`;
  } else {
    displayVal = value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return (
    <input
      type="text"
      value={isEditing ? localVal : displayVal}
      disabled={disabled}
      onChange={(e) => setLocalVal(e.target.value)}
      onFocus={() => {
        setIsEditing(true);
        setLocalVal(value === 0 ? '' : value.toString());
      }}
      onBlur={handleBlur}
      className={`w-full bg-transparent text-right border-0 focus:ring-1 ${focusColor} focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold px-2 text-slate-800 dark:text-zinc-100 disabled:cursor-not-allowed ${className}`}
    />
  );
}

interface ResourceMobilizationViewProps {
  project: Project;
  onUpdateProject: (fields: Partial<Project>, section: string) => void;
  isReadonly?: boolean;
}

export default function ResourceMobilizationView({ 
  project, 
  onUpdateProject, 
  isReadonly = false 
}: ResourceMobilizationViewProps) {
  
  // Safe-initialize state for equipment and personnel from resourceMobilization list
  const rawList = project.resourceMobilization || [];
  
  // We divide the resourceMobilization list into equipment vs personnel based on description or index,
  // but to keep it robust and structured, we can save a type / category inside the item or just split items
  // containing Personnel keywords (like Engineer, Manager, Operator, Personnel, Staff) or we can implicitly 
  // partition them by adding a field, or simply partition them inside the lists!
  // To keep it 100% clean, let's add a "category" field or partition. Let's define:
  // equipment items vs personnel items.
  // If an item doesn't have a division, let's classify by checking if its description contains common personnel words (manager, engineer, chief, operator)
  // or add a property category: 'equipment' | 'personnel'.
  
  // Safe init
  const [activeTab, setActiveTab2] = useState<'mobilization' | 'materials'>('mobilization');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [productionSearch, setProductionSearch] = useState('');
  const [supplySearch, setSupplySearch] = useState('');

  // 1. Equipment Mobilization Items
  const equipmentItems = rawList.filter(item => {
    const desc = item.desc.toLowerCase();
    const isPersonnel = desc.includes('engineer') || desc.includes('manager') || desc.includes('operator') || desc.includes('personnel') || desc.includes('staff') || desc.includes('labor') || desc.includes('team');
    return !isPersonnel;
  });

  // 2. Key Personnel Mobilization Items
  const personnelItems = rawList.filter(item => {
    const desc = item.desc.toLowerCase();
    const isPersonnel = desc.includes('engineer') || desc.includes('manager') || desc.includes('operator') || desc.includes('personnel') || desc.includes('staff') || desc.includes('labor') || desc.includes('team');
    return isPersonnel;
  });

  // 3. Material Production vs Supply Items
  const materialList = project.materialProduction || [];
  
  // Partition materialList:
  // production vs supply. Let's consider things containing "production", "crush", "quarry", "mix" as Production, 
  // and things containing "supply", "reinforcement", "cement", "bitumen", "fuel" as Supply.
  // Or keep them fully structured. Let's split them by whether their description or scope implies production vs supply.
  const productionItems = materialList.filter(item => {
    const text = (item.desc + ' ' + item.scope).toLowerCase();
    return text.includes('produce') || text.includes('production') || text.includes('crush') || text.includes('aggregate') || text.includes('quarry');
  });

  const supplyItems = materialList.filter(item => {
    const text = (item.desc + ' ' + item.scope).toLowerCase();
    return !(text.includes('produce') || text.includes('production') || text.includes('crush') || text.includes('aggregate') || text.includes('quarry'));
  });

  // Action: update a Resource Mobilization Field
  const handleResourceChange = (id: string, field: keyof ResourceMobilizationItem, value: any) => {
    const updatedList = rawList.map(item => {
      if (item.id === id) {
        const draft = { ...item, [field]: value };
        // Auto calculate deficiency: Plan - Available
        const plan = draft.revisedPlan > 0 ? draft.revisedPlan : draft.originalPlan;
        draft.deficiency = Math.max(0, plan - draft.available);
        return draft;
      }
      return item;
    });
    onUpdateProject({ resourceMobilization: updatedList }, 'Resource Mobilization list modified');
  };

  // Action: Add Resource Row
  const handleAddResourceRow = (isPersonnel: boolean) => {
    const newId = 'res_' + Date.now();
    const newItem: ResourceMobilizationItem = {
      id: newId,
      desc: isPersonnel ? 'New Personnel Title' : 'New Equipment / Machine Description',
      originalPlan: 0,
      revisedPlan: 0,
      available: 0,
      deficiency: 0,
      breakdown: 'No remarks added'
    };
    onUpdateProject({ resourceMobilization: [...rawList, newItem] }, 'Added resource mobilization row');
  };

  // Action: Delete Resource Row
  const handleDeleteResourceRow = (id: string) => {
    const updatedList = rawList.filter(item => item.id !== id);
    onUpdateProject({ resourceMobilization: updatedList }, 'Deleted resource mobilization row');
  };

  // Action: Update a Material Field
  const handleMaterialChange = (id: string, field: keyof MaterialProductionItem, value: any) => {
    const updatedList = materialList.map(item => {
      if (item.id === id) {
        const draft = { ...item, [field]: value };
        // Auto calculate remaining balance as Contract Scope / Metric minus Total Todate
        const scopeStr = draft.scope || '';
        const scopeClean = scopeStr.replace(/,/g, '').match(/[\d\.]+/);
        const scopeNum = scopeClean ? parseFloat(scopeClean[0]) : 0;
        const totalNum = parseFloat(draft.totalToDate as any) || 0;
        draft.remainingBalance = scopeNum - totalNum;

        // Auto calculate used as Total Todate minus Available In Stock
        const availableStockNum = parseFloat(draft.availableStock as any) || 0;
        draft.used = totalNum - availableStockNum;
        return draft;
      }
      return item;
    });
    onUpdateProject({ materialProduction: updatedList }, 'Material production/supply modified');
  };

  // Action: Add Material Row
  const handleAddMaterialRow = (isProduction: boolean) => {
    const newId = 'mat_' + Date.now();
    const newItem: MaterialProductionItem = {
      id: newId,
      desc: isProduction ? 'New Production Material' : 'New Supply Material',
      scope: '0 M3',
      thisMonth: 0,
      totalToDate: 0,
      used: 0,
      availableStock: 0,
      remainingBalance: 0
    };
    onUpdateProject({ materialProduction: [...materialList, newItem] }, 'Added material row');
  };

  // Action: Delete Material Row
  const handleDeleteMaterialRow = (id: string) => {
    const updatedList = materialList.filter(item => item.id !== id);
    onUpdateProject({ materialProduction: updatedList }, 'Deleted material row');
  };

  return (
    <div className="space-y-6">
      {/* Upper Tab Navigation & Info */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-500" />
            Resource Mobilization, Material Production & Supply Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time logistical monitoring. All tables are in-place editable, self-calculating, and store changes immediately.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab2('mobilization')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'mobilization'
                ? 'bg-white dark:bg-slate-850 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Mobilization
          </button>
          <button
            onClick={() => setActiveTab2('materials')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'materials'
                ? 'bg-white dark:bg-slate-850 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Materials Info
          </button>
        </div>
      </div>

      {activeTab === 'mobilization' ? (
        <div className="space-y-8">
          
          {/* Section 1: Equipment Mobilization */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/10 rounded-xl text-teal-600 dark:text-teal-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Equipment Mobilization Status</h3>
                  <p className="text-2xs text-slate-400">Tracking machinery, vehicle logistics and active fleets across sites</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search machinery..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1 px-3 rounded-lg w-48"
                />
                {!isReadonly && (
                  <button
                    onClick={() => handleAddResourceRow(false)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-2xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm h-7"
                  >
                    <Plus className="w-3 h-3" /> Add Machinery Row
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <th className="p-3">Resource Description</th>
                    <th className="p-3 text-center w-24">Original Plan</th>
                    <th className="p-3 text-center w-24">Revised Plan</th>
                    <th className="p-3 text-center w-24">Available</th>
                    <th className="p-3 text-center w-24 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-bold">Deficiency</th>
                    <th className="p-3">Status / Breakdown Details</th>
                    {!isReadonly && <th className="p-3 text-center w-16">Remove</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {equipmentItems
                    .filter(item => item.desc.toLowerCase().includes(equipmentSearch.toLowerCase()))
                    .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-2 font-medium">
                        <input
                          type="text"
                          value={item.desc}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'desc', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 text-slate-800 dark:text-zinc-100 font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={item.originalPlan}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'originalPlan', parseInt(e.target.value) || 0)}
                          className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={item.revisedPlan}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'revisedPlan', parseInt(e.target.value) || 0)}
                          className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={item.available}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'available', parseInt(e.target.value) || 0)}
                          className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold text-teal-600 dark:text-teal-400"
                        />
                      </td>
                      <td className="p-2 text-center bg-rose-500/5">
                        <span className={`font-mono font-bold ${item.deficiency > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {item.deficiency}
                        </span>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.breakdown}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'breakdown', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 text-slate-505 dark:text-slate-400 text-2xs truncate"
                        />
                      </td>
                      {!isReadonly && (
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteResourceRow(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {equipmentItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No equipment mobilization data found. Click "Add Machinery Row" to add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Key Personnel Mobilization */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Key Personnel Mobilization (Human Resources)</h3>
                  <p className="text-2xs text-slate-400">Monitoring technical experts, administration officers and site engineers</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search personnel..."
                  value={personnelSearch}
                  onChange={(e) => setPersonnelSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1 px-3 rounded-lg w-48"
                />
                {!isReadonly && (
                  <button
                    onClick={() => handleAddResourceRow(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-2xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm h-7"
                  >
                    <Plus className="w-3 h-3" /> Add Personnel Row
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <th className="p-3">Personnel / Designation</th>
                    <th className="p-3 text-center w-24">Original Plan</th>
                    <th className="p-3 text-center w-24">Revised Plan</th>
                    <th className="p-3 text-center w-24">Available</th>
                    <th className="p-3 text-center w-24 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-bold">Deficiency</th>
                    <th className="p-3">Position / Duty Details</th>
                    {!isReadonly && <th className="p-3 text-center w-16">Remove</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {personnelItems
                    .filter(item => item.desc.toLowerCase().includes(personnelSearch.toLowerCase()))
                    .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-2 font-medium">
                        <input
                          type="text"
                          value={item.desc}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'desc', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 text-slate-800 dark:text-zinc-100 font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={item.originalPlan}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'originalPlan', parseInt(e.target.value) || 0)}
                          className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={item.revisedPlan}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'revisedPlan', parseInt(e.target.value) || 0)}
                          className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={item.available}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'available', parseInt(e.target.value) || 0)}
                          className="w-16 bg-transparent text-center border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded font-mono font-semibold text-blue-600 dark:text-blue-400"
                        />
                      </td>
                      <td className="p-2 text-center bg-rose-500/5">
                        <span className={`font-mono font-bold ${item.deficiency > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {item.deficiency}
                        </span>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.breakdown}
                          disabled={isReadonly}
                          onChange={(e) => handleResourceChange(item.id, 'breakdown', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 text-slate-505 dark:text-slate-400 text-2xs truncate"
                        />
                      </td>
                      {!isReadonly && (
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteResourceRow(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {personnelItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No key personnel data found. Click "Add Personnel Row" to create dynamic staff logs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Section 3: Material Production */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Own Material Production Tracking (Crushers/Plants)</h3>
                  <p className="text-2xs text-slate-400">Monitoring aggregates, sub-base material and asphalt concrete produced at stations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search production..."
                  value={productionSearch}
                  onChange={(e) => setProductionSearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1 px-3 rounded-lg w-48"
                />
                {!isReadonly && (
                  <button
                    onClick={() => handleAddMaterialRow(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm h-7"
                  >
                    <Plus className="w-3 h-3" /> Add Production Material
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <th className="p-3">Material Description</th>
                    <th className="p-3 w-40">Contract Scope / Metric</th>
                    <th className="p-3 text-right w-28">This Month</th>
                    <th className="p-3 text-right w-28">Total Todate</th>
                    <th className="p-3 text-right w-28 text-blue-600 dark:text-blue-400">Used</th>
                    <th className="p-3 text-right w-28">Available In Stock</th>
                    <th className="p-3 text-right w-28 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold">Remaining Bal.</th>
                    {!isReadonly && <th className="p-3 text-center w-16">Remove</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {productionItems
                    .filter(item => item.desc.toLowerCase().includes(productionSearch.toLowerCase()))
                    .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-2 font-medium">
                        <input
                          type="text"
                          value={item.desc}
                          disabled={isReadonly}
                          onChange={(e) => handleMaterialChange(item.id, 'desc', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 text-slate-800 dark:text-zinc-100 font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.scope}
                          disabled={isReadonly}
                          onChange={(e) => handleMaterialChange(item.id, 'scope', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 font-mono font-medium text-slate-700 dark:text-slate-350"
                        />
                      </td>
                      <td className="p-2">
                        <AccountingInput
                          value={item.thisMonth}
                          disabled={isReadonly}
                          onChange={(val) => handleMaterialChange(item.id, 'thisMonth', val)}
                          focusColor="focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-2">
                        <AccountingInput
                          value={item.totalToDate}
                          disabled={isReadonly}
                          onChange={(val) => handleMaterialChange(item.id, 'totalToDate', val)}
                          focusColor="focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-2">
                        {(() => {
                          const calculatedUsed = (item.totalToDate || 0) - (item.availableStock || 0);
                          return (
                            <AccountingInput
                              value={calculatedUsed}
                              disabled
                              className="text-blue-600 dark:text-blue-400 font-bold"
                            />
                          );
                        })()}
                      </td>
                      <td className="p-2">
                        <AccountingInput
                          value={item.availableStock}
                          disabled={isReadonly}
                          onChange={(val) => handleMaterialChange(item.id, 'availableStock', val)}
                          focusColor="focus:ring-emerald-500"
                          className="text-emerald-600 dark:text-emerald-400 font-semibold"
                        />
                      </td>
                      <td className="p-2 bg-amber-500/5">
                        {(() => {
                          const scopeClean = (item.scope || '').replace(/,/g, '').match(/[\d\.]+/);
                          const scopeNum = scopeClean ? parseFloat(scopeClean[0]) : 0;
                          const calculatedVal = scopeNum - (item.totalToDate || 0);
                          return (
                            <AccountingInput
                              value={calculatedVal}
                              disabled
                              className="text-amber-700 dark:text-amber-400 font-bold"
                            />
                          );
                        })()}
                      </td>
                      {!isReadonly && (
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteMaterialRow(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {productionItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No material production rows found. Click "Add Production Material" to append dynamic records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Material Supply */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">External Material Purchases & Supply Logistics</h3>
                  <p className="text-2xs text-slate-400">Monitoring reinforced bars, structural steel, chemical items and fuel supply streams</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search supplies..."
                  value={supplySearch}
                  onChange={(e) => setSupplySearch(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1 px-3 rounded-lg w-48"
                />
                {!isReadonly && (
                  <button
                    onClick={() => handleAddMaterialRow(false)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-2xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm h-7"
                  >
                    <Plus className="w-3 h-3" /> Add Supply Material
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <th className="p-3">Material Description</th>
                    <th className="p-3 w-40">Contract Scope / Metric</th>
                    <th className="p-3 text-right w-28">This Month</th>
                    <th className="p-3 text-right w-28">Total Todate</th>
                    <th className="p-3 text-right w-28 text-blue-600 dark:text-blue-400">Used</th>
                    <th className="p-3 text-right w-28">Available In Stock</th>
                    <th className="p-3 text-right w-28 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold">Remaining Bal.</th>
                    {!isReadonly && <th className="p-3 text-center w-16">Remove</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {supplyItems
                    .filter(item => item.desc.toLowerCase().includes(supplySearch.toLowerCase()))
                    .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-2 font-medium">
                        <input
                          type="text"
                          value={item.desc}
                          disabled={isReadonly}
                          onChange={(e) => handleMaterialChange(item.id, 'desc', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 text-slate-800 dark:text-zinc-100 font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.scope}
                          disabled={isReadonly}
                          onChange={(e) => handleMaterialChange(item.id, 'scope', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1 font-mono font-medium text-slate-700 dark:text-slate-350"
                        />
                      </td>
                      <td className="p-2">
                        <AccountingInput
                          value={item.thisMonth}
                          disabled={isReadonly}
                          onChange={(val) => handleMaterialChange(item.id, 'thisMonth', val)}
                          focusColor="focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-2">
                        <AccountingInput
                          value={item.totalToDate}
                          disabled={isReadonly}
                          onChange={(val) => handleMaterialChange(item.id, 'totalToDate', val)}
                          focusColor="focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-2">
                        {(() => {
                          const calculatedUsed = (item.totalToDate || 0) - (item.availableStock || 0);
                          return (
                            <AccountingInput
                              value={calculatedUsed}
                              disabled
                              className="text-blue-600 dark:text-blue-400 font-bold"
                            />
                          );
                        })()}
                      </td>
                      <td className="p-2">
                        <AccountingInput
                          value={item.availableStock}
                          disabled={isReadonly}
                          onChange={(val) => handleMaterialChange(item.id, 'availableStock', val)}
                          focusColor="focus:ring-indigo-500"
                          className="text-emerald-600 dark:text-emerald-400 font-semibold"
                        />
                      </td>
                      <td className="p-2 bg-amber-500/5">
                        {(() => {
                          const scopeClean = (item.scope || '').replace(/,/g, '').match(/[\d\.]+/);
                          const scopeNum = scopeClean ? parseFloat(scopeClean[0]) : 0;
                          const calculatedVal = scopeNum - (item.totalToDate || 0);
                          return (
                            <AccountingInput
                              value={calculatedVal}
                              disabled
                              className="text-amber-700 dark:text-amber-400 font-bold"
                            />
                          );
                        })()}
                      </td>
                      {!isReadonly && (
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteMaterialRow(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {supplyItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No logistical supply material rows. Click "Add Supply Material" to load critical variables.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
