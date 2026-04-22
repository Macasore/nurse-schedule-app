import React, { useState, useEffect, useCallback, useMemo } from "react";
import "../styles/NurseSchedule.css";
import { staffAPI, scheduleAPI } from "../api";

const shiftOptions = ["M", "N", "O", "L"];
const flexibleShiftOptions = ["M", "N", "O", "L", "M_FLEX", "N_FLEX"];

const ShiftDisplay = ({ shift }) => {
  if (shift === "M_FLEX") return <span className="flex-shift">Ⓜ</span>;
  if (shift === "N_FLEX") return <span className="flex-shift">Ⓝ</span>;
  return shift;
};

const NurseSchedule = () => {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [nurseList, setNurseList] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [savedScheduleId, setSavedScheduleId] = useState(null);
  
  const [newNurseName, setNewNurseName] = useState("");
  const [newNurseEmail, setNewNurseEmail] = useState("");
  const [newNursePhone, setNewNursePhone] = useState("");
  const [newNurseRole, setNewNurseRole] = useState("MATRON");
  const [isFlexible, setIsFlexible] = useState(false);
  const [isPermanentMorning, setIsPermanentMorning] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [currentScheduleName, setCurrentScheduleName] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [savedSchedulesList, setSavedSchedulesList] = useState([]);
  const [saveForm, setSaveForm] = useState({ name: "", mode: "overwrite" });
  
  const [warnings, setWarnings] = useState([]);
  
  const selectedYear = parseInt(currentDate.split('-')[0]);
  const selectedMonth = parseInt(currentDate.split('-')[1]);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

  // Convert array from BE into a mapping dict
  const formatEntriesToState = (entries) => {
    const newState = {};
    entries.forEach(entry => {
      const day = parseInt(entry.date.split('-')[2]).toString();
      if (!newState[entry.staff_id]) newState[entry.staff_id] = {};
      newState[entry.staff_id][day] = entry.shift;
    });
    return newState;
  };

  const loadBaseData = async () => {
    try {
      const staffs = await staffAPI.getAll();
      setNurseList(staffs);
      
      const schedules = await scheduleAPI.getAll();
      setSavedSchedulesList(schedules);
      const existing = savedScheduleId 
          ? schedules.find(s => s.id === savedScheduleId)
          : schedules.find(s => s.year === selectedYear && s.month === selectedMonth);
      
      if (existing) {
        setSavedScheduleId(existing.id);
        setCurrentScheduleName(existing.name || "");
        setSchedule(formatEntriesToState(existing.entries));
      } else {
        setSavedScheduleId(null);
        setCurrentScheduleName("");
        // Reset local schedule maps
        const blank = {};
        staffs.forEach(n => {
          blank[n.id] = {};
          dates.forEach(d => blank[n.id][d] = "O");
        });
        setSchedule(blank);
      }
      setWarnings([]);
    } catch (e) {
      console.error(e);
      alert("Failed to load generic data.");
    }
  };

  useEffect(() => {
    loadBaseData();
    // eslint-disable-next-line
  }, [currentDate]);

  const handleShiftChange = useCallback((staffId, day, newShift) => {
    setSchedule((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], [day]: newShift },
    }));
  }, []);

  const submitStaff = async () => {
    if (!newNurseName.trim()) return;
    try {
      const payload = {
        name: newNurseName,
        email: newNurseEmail || undefined,
        phone_number: newNursePhone || undefined,
        role: newNurseRole,
        qualifies_for_flexible_hours: isFlexible,
        is_permanent_morning: isPermanentMorning
      };
      
      if (editingStaffId) {
        await staffAPI.update(editingStaffId, payload);
      } else {
        await staffAPI.create(payload);
      }
      
      closeStaffModal();
      loadBaseData();
    } catch (e) {
      alert("Failed to save nurse: " + e.message);
    }
  };

  const closeStaffModal = () => {
    setNewNurseName("");
    setNewNurseEmail("");
    setNewNursePhone("");
    setNewNurseRole("MATRON");
    setIsFlexible(false);
    setIsPermanentMorning(false);
    setEditingStaffId(null);
    setIsAddStaffModalOpen(false);
  };

  const openEditModal = (nurse) => {
    setNewNurseName(nurse.name);
    setNewNurseEmail(nurse.email || "");
    setNewNursePhone(nurse.phone_number || "");
    setNewNurseRole(nurse.role);
    setIsFlexible(nurse.qualifies_for_flexible_hours);
    setIsPermanentMorning(nurse.is_permanent_morning || false);
    setEditingStaffId(nurse.id);
    setIsAddStaffModalOpen(true);
  };

  const removeNurse = async (id) => {
    try {
      await staffAPI.delete(id);
      loadBaseData();
    } catch (e) {
      alert("Failed to remove nurse: " + e.message);
    }
  };

  const buildEntriesArray = () => {
    const entries = [];
    Object.entries(schedule).forEach(([staffId, days]) => {
      Object.entries(days).forEach(([day, shift]) => {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        entries.push({
          staff_id: parseInt(staffId),
          date: dateStr,
          shift: shift
        });
      });
    });
    return entries;
  };

  const initiateSave = () => {
    setSaveForm({ name: currentScheduleName, mode: savedScheduleId ? "overwrite" : "fresh" });
    setIsSaveModalOpen(true);
  };

  const executeSave = async () => {
    if (!saveForm.name.trim()) {
      alert("Please enter a schedule name.");
      return;
    }
    const entries = buildEntriesArray();
    try {
      if (saveForm.mode === "overwrite" && savedScheduleId) {
        await scheduleAPI.update(savedScheduleId, { name: saveForm.name, entries });
        setCurrentScheduleName(saveForm.name);
      } else {
        const result = await scheduleAPI.create({ year: selectedYear, month: selectedMonth, name: saveForm.name, entries });
        setSavedScheduleId(result.id);
        setCurrentScheduleName(result.name);
      }
      setIsSaveModalOpen(false);
      alert("Schedule Saved successfully!");
      loadBaseData();
    } catch (e) {
      alert("Save failed: " + e.message);
    }
  };

  const openBrowseModal = async () => {
    try {
        const schedules = await scheduleAPI.getAll();
        setSavedSchedulesList(schedules);
        setIsBrowseModalOpen(true);
    } catch (e) {
        alert("Failed to load schedules: " + e.message);
    }
  };

  const loadSavedSchedule = (scheduleItem) => {
    setSavedScheduleId(scheduleItem.id);
    setCurrentScheduleName(scheduleItem.name || "");
    const [y, m] = [scheduleItem.year, scheduleItem.month].map(String);
    setCurrentDate(`${y}-${m.padStart(2, '0')}`);
    setIsBrowseModalOpen(false);
  };

  const validateSchedule = async () => {
    const entries = buildEntriesArray();
    try {
      const res = await scheduleAPI.validate({ year: selectedYear, month: selectedMonth, entries });
      setWarnings(res.messages);
      if (res.is_valid) alert("Schedule validates perfectly!");
    } catch (e) {
      alert("Validation error.");
    }
  };

  const generateAutoSchedule = async () => {
    try {
      const generatedEntries = await scheduleAPI.generate({ year: selectedYear, month: selectedMonth, algorithm: "flexible" });
      setSchedule(formatEntriesToState(generatedEntries));
    } catch (e) {
      alert("Generator failed.");
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="container">
      <h1 className="title">Dgreatark nurse scheduler</h1>
      
      <div className="header-actions print-override-hide">
        <input 
          type="month" 
          value={currentDate} 
          onChange={(e) => {
            setSavedScheduleId(null);
            setCurrentDate(e.target.value);
          }} 
          className="month-picker"
        />
        
        <div className="tool-buttons">
          <button onClick={openBrowseModal} className="browse-btn">Browse Saved</button>
          <button onClick={generateAutoSchedule} className="generate-btn">Generate</button>
          <button onClick={validateSchedule} className="validate-btn">Validate</button>
          <button onClick={initiateSave} className="save-btn">{savedScheduleId ? 'Save Options' : 'Save to DB'}</button>
          <button onClick={exportToPDF} className="export-button">Export to PDF</button>
        </div>
      </div>
      
      {warnings.length > 0 && (
        <div className="warnings-box print-override-hide">
          <h3>Validation Warnings/Errors:</h3>
          <ul>
            {warnings.map((w, idx) => (
              <li key={idx} style={{ color: w.level === 'error' ? 'red' : 'darkorange' }}>
                [{w.level.toUpperCase()}] {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isSaveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Save Schedule</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>Schedule Name *</label>
                <input
                  type="text"
                  placeholder="e.g. October Peak Schedule"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm({...saveForm, name: e.target.value})}
                />
              </div>
              
              {savedScheduleId && (
                <div className="form-group">
                  <label>Save Mode</label>
                  <label style={{display: 'flex', gap: '8px', cursor: 'pointer', fontWeight: 'normal'}}>
                    <input type="radio" value="overwrite" checked={saveForm.mode === "overwrite"} onChange={() => setSaveForm({...saveForm, mode: "overwrite"})} />
                    Overwrite current loaded schedule
                  </label>
                  <label style={{display: 'flex', gap: '8px', cursor: 'pointer', fontWeight: 'normal'}}>
                    <input type="radio" value="fresh" checked={saveForm.mode === "fresh"} onChange={() => setSaveForm({...saveForm, mode: "fresh"})} />
                    Save as new separate copy
                  </label>
                </div>
              )}
              
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setIsSaveModalOpen(false)}>Cancel</button>
                <button className="confirm-btn" onClick={executeSave}>Confirm Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBrowseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '600px'}}>
            <h2>Browse Saved Schedules</h2>
            <div className="schedule-list" style={{maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'}}>
              {savedSchedulesList.length === 0 ? <p>No saved schedules found.</p> : null}
              {savedSchedulesList.map(item => (
                <div key={item.id} style={{padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <strong>{item.name || "Unnamed Schedule"}</strong>
                    <div style={{fontSize: '0.85em', color: '#64748b'}}>{item.year} - {String(item.month).padStart(2, '0')}</div>
                  </div>
                  <button className="confirm-btn" style={{padding: '6px 12px', fontSize: '0.9em'}} onClick={() => loadSavedSchedule(item)}>Load</button>
                </div>
              ))}
            </div>
            <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setIsBrowseModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="header-actions print-override-hide">
        <button className="add-staff-btn" onClick={() => setIsAddStaffModalOpen(true)}>+ Add New Staff</button>
      </div>

      {isAddStaffModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingStaffId ? 'Edit Staff Details' : 'Add New Staff'}</h2>
            <div className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={newNurseName}
                  onChange={(e) => setNewNurseName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email (optional)</label>
                <input
                  type="email"
                  placeholder="e.g. jane@example.com"
                  value={newNurseEmail}
                  onChange={(e) => setNewNurseEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. +1234567890"
                  value={newNursePhone}
                  onChange={(e) => setNewNursePhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={newNurseRole} onChange={(e) => setNewNurseRole(e.target.value)}>
                  <option value="MATRON">Matron</option>
                  <option value="REGISTERED_NURSE">Registered Nurse</option>
                  <option value="JUNIOR_AUXILIARY_NURSE">Junior Auxiliary Nurse</option>
                  <option value="SENIOR_AUXILIARY_NURSE">Senior Auxiliary Nurse</option>
                  <option value="COMMUNITY_HEALTH_EXTENSION_WORKER">Community Health Extension Worker</option>
                </select>
              </div>
              <div className="form-group-checkbox">
                <label>
                  <input type="checkbox" checked={isFlexible} onChange={(e) => setIsFlexible(e.target.checked)} />
                  <span style={{marginLeft: '8px'}}>Qualifies for Flexible Hours?</span>
                </label>
              </div>
              {newNurseRole === "MATRON" && (
                <div className="form-group-checkbox">
                  <label>
                    <input type="checkbox" checked={isPermanentMorning} onChange={(e) => setIsPermanentMorning(e.target.checked)} />
                    <span style={{marginLeft: '8px'}}>Permanent Morning? (Only applicable to Matrons)</span>
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button className="cancel-btn" onClick={closeStaffModal}>Cancel</button>
                <button className="confirm-btn" onClick={submitStaff}>{editingStaffId ? 'Save Changes' : 'Add Staff'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="sticky-left header-cell">Nurse</th>
              {dates.map((date) => (
                <th key={date} className="header-cell">
                  {date}
                </th>
              ))}
              <th className="header-cell actions-column print-override-hide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {nurseList.map((nurse) => (
              <tr key={nurse.id}>
                <td className="sticky-left nurse-name" onClick={() => openEditModal(nurse)} title="Click to edit staff details">
                  <div className="nurse-text">
                    {nurse.name}
                  </div>
                </td>
                {dates.map((day) => {
                  const currentShift = schedule[nurse.id]?.[day] || "O";
                  const options = nurse.qualifies_for_flexible_hours ? flexibleShiftOptions : shiftOptions;
                  
                  return (
                    <td key={day}>
                      <span className="print-only" style={{fontWeight: 'bold'}}>
                        <ShiftDisplay shift={currentShift} />
                      </span>
                      <select
                        value={currentShift}
                        onChange={(e) => handleShiftChange(nurse.id, day, e.target.value)}
                        className={`shift-select screen-only shift-${currentShift}`}
                      >
                        {options.map((shift) => {
                          let display = shift;
                          if (shift === "M_FLEX") display = "Ⓜ";
                          if (shift === "N_FLEX") display = "Ⓝ";
                          return (
                            <option key={shift} value={shift}>
                              {display}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                  );
                })}
                <td className="actions-column print-override-hide">
                  <button
                    onClick={() => removeNurse(nurse.id)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NurseSchedule;
