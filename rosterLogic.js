import React, { useState, useRef, useMemo } from 'react';
import { 
  Users, 
  Stethoscope, 
  Activity, 
  ClipboardCheck, 
  AlertCircle, 
  CheckCircle2,
  ChevronRight,
  Trash2,
  Clock,
  GripVertical,
  UserPlus,
  Upload,
  Download,
  FileText,
  Info,
  Calendar,
  LayoutGrid,
  Table as TableIcon,
  Printer
} from 'lucide-react';

// --- CONFIGURATION ---
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const AREAS = [
  { id: 'ot9', name: 'OT 9', slots: ['Scrub', 'Circulating', 'OTA'], skillRequired: 'Operating Theatre' },
  { id: 'ot10', name: 'OT 10', slots: ['Scrub', 'Circulating', 'OTA'], skillRequired: 'Operating Theatre' },
  { id: 'pacu', name: 'PACU (Recovery)', slots: ['Bay 1', 'Bay 2', 'In-Charge'], needsAPN: true, skillRequired: 'PACU' },
  { id: 'ward', name: 'Day Ward', slots: ['Admission', 'Discharge', 'General'], skillRequired: 'Day Ward' },
  { id: 'clinic', name: 'Assessment Clinic', slots: ['AM Slot', 'PM Slot'], skillRequired: 'Pre-Anaesthetic' },
];

const INITIAL_STAFF = [
  { id: 1, name: "Alice Wong", rank: "APN", primary: "Operating Theatre", secondary: "PACU" },
  { id: 2, name: "Bob Smith", rank: "RN", primary: "PACU", secondary: "Day Ward" },
  { id: 3, name: "Charlie Day", rank: "EN", primary: "Day Ward", secondary: "Pre-Anaesthetic" },
  { id: 4, name: "Diana Prince", rank: "RN", primary: "Operating Theatre", secondary: "Pre-Anaesthetic" },
  { id: 5, name: "Edward Norton", rank: "RN", primary: "Operating Theatre", secondary: "PACU" },
  { id: 6, name: "Fiona Gallagher", rank: "APN", primary: "Day Ward", secondary: "PACU" },
  { id: 7, name: "George Costanza", rank: "EN", primary: "Day Ward", secondary: "PACU" },
  { id: 8, name: "Helen Mirren", rank: "RN", primary: "PACU", secondary: "Day Ward" },
];

const App = () => {
  const [view, setView] = useState('board'); // 'board' or 'spreadsheet'
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [staffList, setStaffList] = useState(INITIAL_STAFF);
  
  // Weekly assignments structure: { Monday: { ot9: [staffId, ...], ... }, Tuesday: { ... } }
  const [weeklyAssignments, setWeeklyAssignments] = useState(
    DAYS.reduce((acc, day) => ({ 
      ...acc, 
      [day]: AREAS.reduce((areaAcc, area) => ({ ...areaAcc, [area.id]: [] }), {}) 
    }), {})
  );
  
  const [dragOverArea, setDragOverArea] = useState(null);
  const fileInputRef = useRef(null);

  const currentAssignments = weeklyAssignments[selectedDay];

  // --- ACTIONS ---
  const assignStaff = (areaId, staffId) => {
    if (isAssignedOnDay(staffId, selectedDay)) return;
    setWeeklyAssignments(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [areaId]: [...prev[selectedDay][areaId], staffId]
      }
    }));
    setDragOverArea(null);
  };

  const removeAssignment = (day, areaId, staffId) => {
    setWeeklyAssignments(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [areaId]: prev[day][areaId].filter(id => id !== staffId)
      }
    }));
  };

  const isAssignedOnDay = (staffId, day) => {
    return Object.values(weeklyAssignments[day]).some(list => list.includes(staffId));
  };

  // --- CSV LOGIC ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newStaff = lines.slice(1).filter(l => l.trim()).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const entry = {};
        headers.forEach((h, i) => entry[h.replace(/\s/g, '')] = values[i]);
        return {
          id: Date.now() + index,
          name: entry.staffname || entry.name || "Unknown",
          rank: entry.rank || "RN",
          primary: entry.primaryskillset || entry.primary || "General",
          secondary: entry.secondaryskillset || entry.secondary || "General"
        };
      });
      setStaffList(newStaff);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = ["Day", "Area", "Staff Name", "Rank", "Primary Skillset"];
    const rows = [headers.join(",")];
    DAYS.forEach(day => {
      Object.entries(weeklyAssignments[day]).forEach(([areaId, staffIds]) => {
        const area = AREAS.find(a => a.id === areaId);
        staffIds.forEach(id => {
          const staff = staffList.find(s => s.id === id);
          if (staff) rows.push([day, area.name, staff.name, staff.rank, staff.primary].join(","));
        });
      });
    });
    const blob = new Blob([rows.join("\n")], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Weekly_Roster_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  // --- VALIDATION ---
  const getValidation = (day, areaId) => {
    const area = AREAS.find(a => a.id === areaId);
    const assignedStaff = staffList.filter(s => weeklyAssignments[day][areaId].includes(s.id));
    const errors = [];
    const warnings = [];
    if (assignedStaff.length < area.slots.length) {
      warnings.push(`Needs ${area.slots.length} staff (Current: ${assignedStaff.length})`);
    }
    if (area.needsAPN && !assignedStaff.some(s => s.rank === 'APN')) {
      errors.push("Missing APN");
    }
    assignedStaff.forEach(s => {
      if (s.primary !== area.skillRequired && s.secondary !== area.skillRequired) {
        warnings.push(`${s.name}: Missing ${area.skillRequired} skill`);
      }
    });
    return { errors, warnings, isValid: errors.length === 0 };
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6 font-sans text-slate-900">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-900 flex items-center gap-2 tracking-tight">
            <ClipboardCheck className="w-7 h-7 text-indigo-600" />
            Ambulatory Surgery Services Duty Roster
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
              <button 
                onClick={() => setView('board')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'board' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <LayoutGrid className="w-4 h-4" /> Planning
              </button>
              <button 
                onClick={() => setView('spreadsheet')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'spreadsheet' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <TableIcon className="w-4 h-4" /> Spreadsheet View
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm">
            <Upload className="w-4 h-4" /> Import Staff
          </button>
          <button onClick={handleExportCSV} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </header>

      {/* DAY SELECTOR */}
      {view === 'board' && (
        <div className="max-w-7xl mx-auto mb-6 flex gap-2 overflow-x-auto pb-2">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-6 py-3 rounded-2xl font-black transition-all flex-shrink-0 border-2 ${
                selectedDay === day 
                ? 'bg-white border-indigo-600 text-indigo-900 shadow-md scale-105' 
                : 'bg-slate-200 border-transparent text-slate-500 hover:bg-slate-300'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      <main className="max-w-7xl mx-auto">
        {view === 'board' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* STAFF DRAWER */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h2 className="font-bold text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Available Staff
                </h2>
              </div>
              <div className="overflow-y-auto divide-y divide-slate-100">
                {staffList.map(staff => {
                  const assigned = isAssignedOnDay(staff.id, selectedDay);
                  return (
                    <div 
                      key={staff.id}
                      draggable={!assigned}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("staffId", staff.id.toString());
                      }}
                      className={`p-3 flex items-center gap-3 transition-all ${assigned ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-indigo-50 cursor-grab active:cursor-grabbing group'}`}
                    >
                      {!assigned && <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />}
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-800">{staff.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] px-1 rounded font-black border ${
                            staff.rank === 'APN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            staff.rank === 'RN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>{staff.rank}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{staff.primary}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AREA CARDS */}
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
              {AREAS.map(area => {
                const { errors, warnings, isValid } = getValidation(selectedDay, area.id);
                const assigned = currentAssignments[area.id];
                return (
                  <div 
                    key={area.id}
                    onDragOver={(e) => { e.preventDefault(); setDragOverArea(area.id); }}
                    onDragLeave={() => setDragOverArea(null)}
                    onDrop={(e) => {
                      const id = parseInt(e.dataTransfer.getData("staffId"));
                      assignStaff(area.id, id);
                    }}
                    className={`bg-white rounded-2xl border-2 transition-all min-h-[180px] flex flex-col ${
                      dragOverArea === area.id ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' :
                      !isValid ? 'border-red-200' : assigned.length > 0 ? 'border-emerald-200 shadow-sm' : 'border-slate-100 shadow-sm'
                    }`}
                  >
                    <div className="p-4 border-b border-slate-50 flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-slate-800">{area.name}</h3>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{area.skillRequired}</div>
                      </div>
                      {isValid && assigned.length > 0 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    </div>
                    
                    <div className="p-4 flex-1 space-y-2">
                      {assigned.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-50 rounded-xl">
                          <UserPlus className="w-5 h-5 opacity-20" />
                          <span className="text-[11px] font-bold">DROP STAFF HERE</span>
                        </div>
                      ) : (
                        assigned.map(sid => {
                          const staff = staffList.find(s => s.id === sid);
                          return (
                            <div key={sid} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg shadow-sm animate-in fade-in zoom-in-95">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${staff.rank === 'APN' ? 'bg-purple-500' : staff.rank === 'RN' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                <span className="text-sm font-bold text-slate-700">{staff.name}</span>
                                <span className="text-[10px] text-slate-400">({staff.rank})</span>
                              </div>
                              <button onClick={() => removeAssignment(selectedDay, area.id, sid)} className="text-slate-300 hover:text-red-500 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-2 px-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex flex-wrap gap-2">
                      {errors.map((e, i) => <span key={i} className="text-[10px] text-red-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {e}</span>)}
                      {warnings.map((w, i) => <span key={i} className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {w}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SPREADSHEET VIEW */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <TableIcon className="w-6 h-6 text-indigo-600" /> Departmental Master Roster
              </h2>
              <button 
                onClick={() => window.print()}
                className="bg-white border border-slate-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50"
              >
                <Printer className="w-4 h-4" /> Print Roster
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider">
                    <th className="p-3 border border-slate-700 w-40 sticky left-0 z-20 bg-slate-800">Unit / Area</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-3 border border-slate-700 text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {AREAS.map(area => (
                    <tr key={area.id} className="hover:bg-slate-50">
                      <td className="p-4 border border-slate-100 sticky left-0 z-10 bg-white font-black text-slate-700">
                        {area.name}
                        <div className="text-[9px] text-slate-400 font-normal uppercase mt-1">{area.skillRequired}</div>
                      </td>
                      {DAYS.map(day => {
                        const assignedIds = weeklyAssignments[day][area.id];
                        const { errors } = getValidation(day, area.id);
                        return (
                          <td key={day} className={`p-2 border border-slate-100 align-top h-40 ${errors.length > 0 ? 'bg-red-50/30' : ''}`}>
                            <div className="flex flex-col gap-1.5">
                              {assignedIds.map(sid => {
                                const staff = staffList.find(s => s.id === sid);
                                return (
                                  <div key={sid} className="bg-white border border-slate-200 p-1.5 rounded-md shadow-sm text-[11px]">
                                    <div className="flex justify-between items-center">
                                      <span className="font-black text-slate-800 truncate">{staff.name}</span>
                                      <span className={`text-[8px] px-1 rounded font-black ${
                                        staff.rank === 'APN' ? 'text-purple-600 bg-purple-50' : 
                                        staff.rank === 'RN' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50'
                                      }`}>{staff.rank}</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {assignedIds.length === 0 && (
                                <div className="text-[10px] text-slate-300 italic text-center mt-4">No Assignment</div>
                              )}
                              {errors.length > 0 && (
                                <div className="mt-2 text-[9px] text-red-500 font-black uppercase flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Error
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-between items-start text-slate-500 print:text-black">
              <div className="text-xs">
                <p className="font-black uppercase tracking-widest text-[10px] mb-2 text-slate-400">Legend</p>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded-full" /> APN</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full" /> RN</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> EN</span>
                </div>
              </div>
              <div className="text-[10px] font-bold text-right italic">
                Report Generated on {new Date().toLocaleString()}<br />
                Ambulatory Surgery Services • Nursing Administration
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER ACTION */}
      <div className="max-w-7xl mx-auto mt-8 print:hidden">
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
              <Activity className="w-10 h-10 text-indigo-200" />
            </div>
            <div>
              <h4 className="font-black text-xl tracking-tight">Finalize Weekly Plan</h4>
              <p className="text-indigo-200/80 text-sm max-w-sm font-medium">Once all units are staffed across the week, switch to Spreadsheet View to print and distribute the master roster.</p>
            </div>
          </div>
          <button 
            onClick={() => setView(view === 'board' ? 'spreadsheet' : 'board')}
            className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black hover:bg-indigo-50 shadow-xl flex items-center gap-3 transition-transform active:scale-95"
          >
            {view === 'board' ? 'View Final Spreadsheet' : 'Back to Planning'}
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
