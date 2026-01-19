import React, { useState, useCallback } from "react";
import "../styles/NurseSchedule.css";

const initialNurses = [
  "Nurse A",
  "Nurse B",
  "Nurse C",
  "Nurse Titi",
  "Nurse Mary",
  "Nurse Rose",
  "Nurse Praise",
  "Nurse Maca",
  "Nurse Madein",
];
const totalDays = 31;
const dates = Array.from({ length: totalDays }, (_, i) => (i + 1).toString());
const shiftOptions = ["M", "N", "*"];

// Helper function to create an empty schedule for a single nurse.
const createEmptySchedule = () =>
  dates.reduce((acc, date) => ({ ...acc, [date]: "*" }), {});

const NurseSchedule = () => {
  // Manage nurse list as a separate state.
  const [nurseList, setNurseList] = useState(initialNurses);
  // Schedule state keyed by nurse name.
  const [schedule, setSchedule] = useState(
    initialNurses.reduce((acc, nurse) => {
      acc[nurse] = createEmptySchedule();
      return acc;
    }, {}),
  );
  // State for the new nurse name input.
  const [newNurse, setNewNurse] = useState("");

  // Update shift for a given nurse and day.
  const handleShiftChange = useCallback((nurse, date, newShift) => {
    setSchedule((prev) => ({
      ...prev,
      [nurse]: { ...prev[nurse], [date]: newShift },
    }));
  }, []);

  // Export to PDF via the browser print functionality.
  const exportToPDF = () => {
    window.print();
  };

  // Function to add a new nurse. It adds the nurse to the list and initializes their schedule.
  const addNurse = () => {
    if (!newNurse.trim()) {
      return; // prevent adding empty names
    }
    if (schedule[newNurse]) {
      alert("Nurse with this name already exists!");
      return;
    }
    setNurseList((prev) => [...prev, newNurse]);
    setSchedule((prev) => ({
      ...prev,
      [newNurse]: createEmptySchedule(),
    }));
    setNewNurse("");
  };

  // Function to remove a nurse (both from the nurse list and the schedule state).
  const removeNurse = (nurse) => {
    setNurseList((prev) => prev.filter((n) => n !== nurse));
    setSchedule((prev) => {
      const { [nurse]: _removed, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="container">
      <h1 className="title">Nurse Duty Schedule</h1>
      <button onClick={exportToPDF} className="export-button">
        Export to PDF
      </button>

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
              {/* Extra column header for actions */}
              <th className="header-cell actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {nurseList.map((nurse) => (
              <tr key={nurse}>
                <td className="sticky-left nurse-name">
                  <div className="nurse-text">{nurse}</div>
                </td>
                {dates.map((date) => (
                  <td key={date}>
                    <label>
                      <span className="print-only">
                        {schedule[nurse][date]}
                      </span>
                      <select
                        value={schedule[nurse][date]}
                        onChange={(e) =>
                          handleShiftChange(nurse, date, e.target.value)
                        }
                        className="shift-select screen-only"
                        aria-label={`Shift for ${nurse} on day ${date}`}
                      >
                        {shiftOptions.map((shift) => (
                          <option key={shift} value={shift}>
                            {shift}
                          </option>
                        ))}
                      </select>
                    </label>
                  </td>
                ))}
                <td className="actions-column">
                  <button
                    onClick={() => removeNurse(nurse)}
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
      {/* New Nurse addition input */}
      <div className="add-nurse">
        <input
          type="text"
          placeholder="Enter nurse name"
          value={newNurse}
          onChange={(e) => setNewNurse(e.target.value)}
        />
        <button onClick={addNurse}>Add Nurse</button>
      </div>
    </div>
  );
};

export default NurseSchedule;
