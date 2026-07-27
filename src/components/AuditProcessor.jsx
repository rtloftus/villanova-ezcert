import React, { useState, useMemo, useEffect } from 'react';
import './AuditProcessor.css';
import * as XLSX from 'xlsx-js-style';
import {
  REQUIREMENTS,
  NUMERIC_FIELDS,
  REVIEW_STATUSES
} from "../reactconstants";

export default function AuditProcessor() {
  const [folderPath, setFolderPath] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedStudentClasses, setSelectedStudentClasses] = useState([]);

  // Sort and Filter State
  const [filterDept, setFilterDept] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReviewStatus, setFilterReviewStatus] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [splitByDept, setSplitByDept] = useState(false);

  // Multi-Cell Highlight & Context Menu State
  const [highlightedCells, setHighlightedCells] = useState({});
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleContextMenu = (e, student) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, student });
  };

  const toggleCellHighlight = (vuid, colIndex) => {
    setHighlightedCells(prev => {
      const key = `${vuid}-${colIndex}`;
      const newSet = { ...prev };
      if (newSet[key]) delete newSet[key];
      else newSet[key] = true;
      return newSet;
    });
  };

  useEffect(() => {
    async function loadStudents() {
      const students = await window.electronAPI.getStudents();
      if (students.length > 0) {
        setStudentData(students);
        setStatus("success");
      }
    }
    loadStudents();
  }, []);

  const handleSelectFolder = async () => {
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setFolderPath(path);
      setStudentData(null);
      setStatus('idle');
      setFilterDept('');
      setFilterMajor('');
      setFilterStatus('');
      setFilterReviewStatus('');
      setSortConfig({ key: null, direction: 'asc' });
      setHighlightedCells({});
    }
  };

  const handleProcessAudits = async () => {
    if (!folderPath) return;
    setStatus('processing');
    setErrorMessage('');
    const result = await window.electronAPI.processAudits(folderPath);

    if (result.success) {
      setStudentData(result.data);
      setStatus('success');
    } else {
      setErrorMessage(result.error);
      setStatus('error');
    }
  };

  const handleExportXLSX = () => {
    if (!studentData) return;

    const dataForExcel = processedData.map(s => ({
      "Review Status": s.review_status, "Grad Status": s.status, "VUID": s.vuid, "Last": s.last_name, "First": s.first_name,
      "Class Code": s.clas, "Catalog Term": s.catalog_term, "Exp Grad Date": s.exp_grad_date,
      "Program": s.program, "Dept": s.dept, "Major1": s.major1, "Major2": s.major2,
      "Major3": s.major3, "Major4": s.major4, "Minor1": s.minor1, "Minor2": s.minor2,
      "Minor3": s.minor3, "Minor4": s.minor4, "Conc1": s.conc1, "Conc2": s.conc2,
      "Conc3": s.conc3, "Conc4": s.conc4, "Overall Hours Earned": s.overall_hours,
      "Core Humanities": s.core_humanities, "Core Philosophy": s.core_philosophy,
      "Core Ethics": s.core_ethics, "Core Math": s.core_math, "Core Natural Science": s.core_nat_sci,
      "Core Lit": s.core_lit, "Core History": s.core_history, "Core Soc Sci": s.core_soc_sci,
      "Core Fine Arts": s.core_fine_arts, "Core Theology": s.core_theology,
      "Core Language": s.core_language, "Core Diversity": s.core_diversity,
      "1st Major": s.first_major, "Free Electives": s.free_electives, "Total": s.total,
      "NOTES": s.notes, "Missing Requirements": s.missing_requirements
    }));

    const workbook = XLSX.utils.book_new();

    const applyStylesToSheet = (worksheet, sourceData) => {
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      let statusColIndex = -1;
      let reviewColIndex = -1;
      
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ c: C, r: 0 })];
        if (headerCell && headerCell.v === 'Grad Status') statusColIndex = C;
        if (headerCell && headerCell.v === 'Review Status') reviewColIndex = C;
      }

      for (let R = 1; R <= range.e.r; ++R) {
        const rowVUID = sourceData[R - 1].VUID; 

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
          let cell = worksheet[cellAddress];
          
          let bgColor = null;
          let textColor = null;
          let isBold = false;

          if (C === statusColIndex && cell) {
            if (cell.v === 'OK') { bgColor = '006000'; textColor = 'C5EFCD'; isBold = true; }
            else if (cell.v === 'DELETE') { bgColor = 'FFC7CE'; textColor = '9C0006'; isBold = true; }
            else if (cell.v === 'HOLD') { bgColor = 'FFEB9C'; textColor = '9C5700'; isBold = true; }
            else if (cell.v === 'ON TRACK') { bgColor = 'C6EFCE'; textColor = '006100'; isBold = true; }
          }

          if (C === reviewColIndex && cell && cell.v === 'Needs Attention') {
            bgColor = 'FFD54F';
          }

          if (highlightedCells[`${rowVUID}-${C}`]) {
            bgColor = 'FFFF00'; 
          }

          if (bgColor || textColor || isBold) {
            if (!cell) {
              worksheet[cellAddress] = { v: "", t: "s" };
              cell = worksheet[cellAddress];
            }
            cell.s = cell.s || {};
            if (bgColor) cell.s.fill = { patternType: 'solid', fgColor: { rgb: bgColor } };
            if (textColor || isBold) {
              cell.s.font = { 
                ...(cell.s.font || {}), 
                ...(textColor ? { color: { rgb: textColor } } : {}),
                ...(isBold ? { bold: true } : {})
              };
            }
          }
        }
      }
      return worksheet;
    };

    if (splitByDept) {
      const groupedData = {};
      dataForExcel.forEach(row => {
        const deptName = row.Dept && row.Dept !== "-" ? row.Dept : "Uncategorized";
        if (!groupedData[deptName]) groupedData[deptName] = [];
        groupedData[deptName].push(row);
      });

      Object.keys(groupedData).sort().forEach(deptName => {
        let worksheet = XLSX.utils.json_to_sheet(groupedData[deptName]);
        worksheet = applyStylesToSheet(worksheet, groupedData[deptName]);
        const safeSheetName = deptName.replace(/[\\/?*[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
      });
    } else {
      let worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      worksheet = applyStylesToSheet(worksheet, dataForExcel);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Report");
    }

    XLSX.writeFile(workbook, "Audit_Report.xlsx");
  };

  const handleRowClick = async (student) => {
    setSelectedStudent(student);
    const classes = await window.electronAPI.getStudentClasses(student.unique_id);
    setSelectedStudentClasses(classes || []);

    const emptyFields = Object.fromEntries(NUMERIC_FIELDS.map(field => [field, ""]));
    setEditData({ ...student, ...emptyFields });
  };

  const handleClearDatabase = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear the database?\n\nThis will permanently delete all review data, notes, statuses, and edits. This action cannot be undone."
    );
    if (!confirmed) return;

    await window.electronAPI.clearDatabase();
    setStudentData(null);
    setStatus("idle");
    setSelectedStudent(null);
    setHighlightedCells({});
    alert("Database cleared successfully.");
  };

  const handleSaveDetails = async () => {
    const updated = { ...selectedStudent, ...editData };

    NUMERIC_FIELDS.forEach(field => {
      if (updated[field] === "") updated[field] = selectedStudent[field];
      else updated[field] = Number(updated[field]);
    });

    updated.total = NUMERIC_FIELDS.reduce((sum, field) => sum + updated[field], 0);

    const missing = [];
    REQUIREMENTS.forEach(({ label, field }) => {
      if (updated[field] > 0) missing.push(`${updated[field]} ${label}`);
    });

    updated.missing_requirements = missing.join(", ");
    await window.electronAPI.updateStudent(updated);

    setStudentData(prev =>
      prev.map(student =>
        student.unique_id === selectedStudent.unique_id ? updated : student
      )
    );
    setSelectedStudent(null);
  };

  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const { uniqueDepts, uniqueMajors, uniqueStatuses } = useMemo(() => {
    if (!studentData) return { uniqueDepts: [], uniqueMajors: [], uniqueStatuses: [] };

    const students = Object.values(studentData);
    return {
      uniqueDepts: [...new Set(students.map(s => s.dept))].filter(Boolean).sort(),
      uniqueMajors: [...new Set(students.map(s => s.major1))].filter(Boolean).sort(),
      uniqueStatuses: [...new Set(students.map(s => s.status))].filter(Boolean).sort()
    };
  }, [studentData]);

  const processedData = useMemo(() => {
    if (!studentData) return [];
    let data = Object.values(studentData);

    if (filterDept) data = data.filter(s => s.dept === filterDept);
    if (filterMajor) data = data.filter(s => s.major1 === filterMajor);
    if (filterStatus) data = data.filter(s => s.status === filterStatus);
    if (filterReviewStatus) data = data.filter(s => s.review_status === filterReviewStatus);

    if (sortConfig.key) {
      data = [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [studentData, filterDept, filterMajor, filterStatus, filterReviewStatus, sortConfig]);

  return (
    <div className="audit-container">
      <h2>Villanova EzCert</h2>

      <div className="button-row">
        <button className="button" onClick={handleSelectFolder}>Select Folder</button>
        <button
          className={`button primary ${!folderPath ? 'disabled' : ''}`}
          onClick={handleProcessAudits}
          disabled={!folderPath || status === 'processing'}
        >
          {status === 'processing' ? 'Processing XML...' : 'Run Processor'}
        </button>

        {status === 'success' && studentData && (
          <div className="export-controls">
            <button className="button export" onClick={handleExportXLSX}>Export to XLSX</button>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={splitByDept}
                onChange={(e) => setSplitByDept(e.target.checked)}
              />
              Split into Department Tabs
            </label>
          </div>
        )}
      </div>

      {folderPath && (
        <p className="folder-display"><strong>Selected Directory:</strong> {folderPath}</p>
      )}

      {status === 'error' && (
        <div className="error-box"><strong>Error:</strong> {errorMessage}</div>
      )}

      {status === 'success' && studentData && (
        <div className="table-wrapper">
          
          <div className="table-header-controls">
            <h3 className="success-text">
              Showing {processedData.length} of {Object.keys(studentData).length} student records.
              
              <div 
                className="tooltip-container"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <span className="tooltip-icon">ⓘ</span>

                {showTooltip && (
                  <div className="tooltip-content">
                    Click a cell to highlight or return to its original color.<br/>
                    Right-click any cell in a row to open the student's record.
                    <div className="tooltip-arrow" />
                  </div>
                )}
              </div>
            </h3>

            <div className="filter-controls">
              <select value={filterReviewStatus} onChange={(e) => setFilterReviewStatus(e.target.value)}>
                <option value="">All Review Statuses</option>
                {REVIEW_STATUSES.map(stat => <option key={stat} value={stat}>{stat}</option>)}
              </select>

              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Grad Statuses</option>
                {uniqueStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}
              </select>

              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>

              <select value={filterMajor} onChange={(e) => setFilterMajor(e.target.value)}>
                <option value="">All Majors</option>
                {uniqueMajors.map(major => <option key={major} value={major}>{major}</option>)}
              </select>
            </div>
          </div>

          <div className="scrollable-table">
            <table>
              <thead>
                <tr>
                  <th onClick={() => requestSort('review_status')} className="sortable-header">Review Status {sortConfig.key === 'review_status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                  <th onClick={() => requestSort('status')} className="sortable-header">Grad Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                  <th>VUID</th>
                  <th onClick={() => requestSort('last_name')} className="sortable-header">Last {sortConfig.key === 'last_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                  <th>First</th><th>Class Code</th>
                  <th>Catalog Term</th><th>Exp Grad Date</th><th>Program</th>
                  <th onClick={() => requestSort('dept')} className="sortable-header">Dept {sortConfig.key === 'dept' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                  <th onClick={() => requestSort('major1')} className="sortable-header">Major1 {sortConfig.key === 'major1' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                  <th>Major2</th><th>Major3</th><th>Major4</th>
                  <th>Minor1</th><th>Minor2</th><th>Minor3</th><th>Minor4</th>
                  <th>Conc1</th><th>Conc2</th><th>Conc3</th><th>Conc4</th>
                  <th>Overall Hours Earned</th>
                  <th>Core Humanities</th><th>Core Philosophy</th><th>Core Ethics</th>
                  <th>Core Math</th><th>Core Natural Science</th><th>Core Literature</th>
                  <th>Core History</th><th>Core Social Science</th><th>Core Fine Arts</th>
                  <th>Core Theology</th><th>Core Language</th><th>Core Diversity</th>
                  <th>1st Major</th><th>Free Electives</th>
                  <th onClick={() => requestSort('total')} className="sortable-header">Total {sortConfig.key === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                  <th>NOTES</th><th>Missing Requirements</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((s, idx) => {
                  const rowId = s.unique_id || idx;

                  const cells = [
                    { val: s.review_status, style: { backgroundColor: s.review_status === 'Needs Attention' ? '#FFF9C4' : s.review_status === 'Completed' ? '#E8F5E9' : 'transparent' } },
                    { val: s.status, style: { fontWeight: 'bold', color: s.status === 'OK' ? '#C5EFCD' : s.status === 'DELETE' ? '#9C0006' : s.status === 'HOLD' ? '#9C5700' : '#006100', backgroundColor: s.status === 'OK' ? '#006000' : s.status === 'DELETE' ? '#FFC7CE' : s.status === 'HOLD' ? '#FFEB9C' : '#C6EFCE' } },
                    { val: s.vuid }, { val: s.last_name }, { val: s.first_name },
                    { val: s.clas }, { val: s.catalog_term }, { val: s.exp_grad_date }, { val: s.program }, { val: s.dept },
                    { val: s.major1 }, { val: s.major2 }, { val: s.major3 }, { val: s.major4 },
                    { val: s.minor1 }, { val: s.minor2 }, { val: s.minor3 }, { val: s.minor4 },
                    { val: s.conc1 }, { val: s.conc2 }, { val: s.conc3 }, { val: s.conc4 },
                    { val: s.overall_hours },
                    { val: s.core_humanities }, { val: s.core_philosophy }, { val: s.core_ethics },
                    { val: s.core_math }, { val: s.core_nat_sci }, { val: s.core_lit },
                    { val: s.core_history }, { val: s.core_soc_sci }, { val: s.core_fine_arts },
                    { val: s.core_theology }, { val: s.core_language }, { val: s.core_diversity },
                    { val: s.first_major }, { val: s.free_electives },
                    { val: <strong>{s.total}</strong> },
                    { val: s.notes },
                    { val: s.missing_requirements, className: "missing-reqs" }
                  ];

                  return (
                    <tr
                      key={rowId}
                      className="clickable-row"
                      onContextMenu={(e) => handleContextMenu(e, s)}
                    >
                      {cells.map((col, colIdx) => {
                        const isHighlighted = highlightedCells[`${s.vuid}-${colIdx}`];
                        const baseStyle = col.style || {};
                        const combinedStyle = { ...baseStyle };

                        if (isHighlighted) {
                          combinedStyle.backgroundColor = '#FFFF00'; 
                        }

                        return (
                          <td
                            key={colIdx}
                            className={col.className || ""}
                            style={combinedStyle}
                            onClick={() => toggleCellHighlight(s.vuid, colIdx)}
                          >
                            {col.val}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedStudent.first_name} {selectedStudent.last_name} ({selectedStudent.vuid})</h3>
              <button className="close-button" onClick={() => setSelectedStudent(null)}>X</button>
            </div>

            <div className="modal-grid">
              <div className="modal-section">
                <h4>Student Information</h4>
                <p><strong>Class:</strong> {selectedStudent.clas}</p>
                <p><strong>Exp Grad Date:</strong> {selectedStudent.exp_grad_date}</p>
                <p>
                  <strong>Credits Completed:</strong>
                  <input
                    type="number"
                    style={{ marginLeft: '8px', width: '70px' }}
                    value={editData.overall_hours ?? ""}
                    placeholder={selectedStudent.overall_hours}
                    onChange={(e) => setEditData({ ...editData, overall_hours: e.target.value })}
                  />
                </p>
                <p><strong>Total Courses Needed:</strong> {editData.total}</p>
              </div>

              <div className="modal-section">
                <h4>Degree Program(s)</h4>
                <p><strong>Program Code:</strong> {selectedStudent.program}</p>
                {selectedStudent.major1 && <p><strong>Majors:</strong> {[selectedStudent.major1, selectedStudent.major2, selectedStudent.major3, selectedStudent.major4].filter(Boolean).join(", ")}</p>}
                {selectedStudent.minor1 && <p><strong>Minors:</strong> {[selectedStudent.minor1, selectedStudent.minor2, selectedStudent.minor3, selectedStudent.minor4].filter(Boolean).join(", ")}</p>}
                {selectedStudent.conc1 && <p><strong>Concentrations:</strong> {[selectedStudent.conc1, selectedStudent.conc2, selectedStudent.conc3, selectedStudent.conc4].filter(Boolean).join(", ")}</p>}
              </div>
            </div>
            
            <div className="modal-section" style={{ gridColumn: "1 / -1" }}>
              <h4>Class History</h4>
              <div className="class-history-container">
                <table className="class-history-table">
                  <thead style={{ position: "sticky", top: 0, backgroundColor: "#f4f4f4" }}>
                    <tr>
                      <th>Term</th>
                      <th>Course</th>
                      <th>Title</th>
                      <th>Grade</th>
                      <th className="text-right">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudentClasses.length > 0 ? (
                      selectedStudentClasses.map((cls, idx) => (
                        <tr key={idx}>
                          <td>{cls.term}</td>
                          <td>{cls.discipline} {cls.number}</td>
                          <td>{cls.title}</td>
                          <td>{cls.grade}</td>
                          <td className="text-right">{cls.credits}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-history">
                          No class history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-section">
              <h4>Missing Requirements</h4>
              {REQUIREMENTS.map(({ label, field }) => (
                <div key={field} className="missing-reqs-item">
                  <label>{label}</label>
                  <input
                    type="number"
                    min="0"
                    style={{ width: "70px" }}
                    value={editData[field] ?? ""}
                    placeholder={selectedStudent[field]}
                    onChange={(e) => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="modal-section edit-section">
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <h4>Graduation Status</h4>
                  <select
                    value={editData.status || ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                    className="status-dropdown"
                  >
                    <option value="OK">OK</option>
                    <option value="ON TRACK">ON TRACK</option>
                    <option value="HOLD">HOLD</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <h4>Review Status</h4>
                  <select
                    value={editData.review_status || ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, review_status: e.target.value }))}
                    className="status-dropdown"
                  >
                    <option value="Not Reviewed">Not Reviewed</option>
                    <option value="Needs Attention">Needs Attention</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <h4>Reviewer Notes</h4>
              <textarea
                value={editData.notes || ""}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="notes-textarea"
                placeholder="Add review notes here..."
              />
            </div>

            <div className="modal-footer">
              <button className="button" onClick={() => setSelectedStudent(null)}>Cancel</button>
              <button className="button primary" onClick={handleSaveDetails}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} 
        >
          <div
            className="context-menu-item"
            onClick={() => {
              handleRowClick(contextMenu.student);
              setContextMenu(null);
            }}
          >
            Open Record
          </div>
        </div>
      )}

      <div className="clear-database-container">
        <button className="button danger" onClick={handleClearDatabase}>
          Clear Database
        </button>
      </div>
    </div>
  );
}