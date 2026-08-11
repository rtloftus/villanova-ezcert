import React, { useState, useMemo, useEffect } from 'react';
import './AuditProcessor.css';
import * as XLSX from 'xlsx-js-style';
import {
  REQUIREMENTS,
  NUMERIC_FIELDS,
  REVIEW_STATUSES
} from "../reactconstants";
import StudentModal from './StudentModal';
import Tooltip from "./Tooltip";
import PasswordModal from './PasswordModal';
import AddStudentModal from './AddStudentModal';
import TutorialModal from "./TutorialModal";


export default function AuditProcessor() {
  const [folderPath, setFolderPath] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showClearDatabase, setShowClearDatabase] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

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

  const toggleCellHighlight = (vuid, colIndex) => {
    setHighlightedCells(prev => {
      const key = `${vuid}-${colIndex}`;
      const newSet = { ...prev };
      if (newSet[key]) delete newSet[key];
      else newSet[key] = true;
      return newSet;
    });
  };

  const handleDeleteStudent = async (unique_id) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete ${selectedStudent.first_name} ${selectedStudent.last_name}?\n\nThis will permanently delete this student's record and review data.`
  );
  if (!confirmed) return;

  const result = await window.electronAPI.deleteStudent(unique_id);
  if (!result.success) {
    alert(result.error || "Could not delete student.");
    return;
  }

  setStudentData(prev =>
    Object.fromEntries(
      Object.entries(prev).filter(
        ([, student]) => student.unique_id !== unique_id
      )
    )
  );

  setSelectedStudent(null);
};



  useEffect(() => {
    document.body.style.overflow = selectedStudent || showTutorial ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedStudent]);

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

  useEffect(() => {
    const tutorialCompleted = localStorage.getItem("tutorialCompleted");

    if(!tutorialCompleted) {
      setShowTutorial(true);
    }
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

  const handleAddStudent = async (student) => {
    const result = await window.electronAPI.addStudent(student);

    if (!result.success) {
      return result;
    }

    const students = await window.electronAPI.getStudents();

    setStudentData(students);
    setStatus("success");
    setShowAddStudent(false);

    return { success: true };
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
      "NOTES": s.notes, "Missing Requirements": s.missing_requirements, "Audit File": s.audit_file
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

  const handleClearDatabase = () => {
    setPasswordError('')
    setShowPasswordModal(true);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.shiftKey &&
        (e.ctrlKey | e.metaKey) &&
        e.key.toLowerCase() === "x") {
        setShowClearDatabase(true);
      }
    };
    const handleKeyUp = () => {
      if (!window.event?.shiftKey) {
        setShowClearDatabase(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handlePasswordSubmit = async (password) => {
    const result = await window.electronAPI.clearDatabase(password)

    if (!result.success) {
      setPasswordError(result.error);
      return;
    }

    setShowPasswordModal(false);
    setStudentData(null);
    setStatus("idle");
    setSelectedStudent(null);
    setHighlightedCells({});
    alert("Database cleared successfully.");
  };

  const handleSaveDetails = async () => {
    const updated = { ...selectedStudent, ...editData };

    NUMERIC_FIELDS.forEach(field => {
      if (updated[field] === "") {
        updated[field] = selectedStudent[field];
      } else {
        updated[field] = Number(updated[field]);
      }
    });
    updated.major1 = updated.major1 || "";
    updated.major2 = updated.major2 || "";
    updated.major3 = updated.major3 || "";
    updated.major4 = updated.major4 || "";
    updated.minor1 = updated.minor1 || "";
    updated.minor2 = updated.minor2 || "";
    updated.minor3 = updated.minor3 || "";
    updated.minor4 = updated.minor4 || "";
    updated.conc1 = updated.conc1 || "";
    updated.conc2 = updated.conc2 || "";
    updated.conc3 = updated.conc3 || "";
    updated.conc4 = updated.conc4 || "";

    updated.total = NUMERIC_FIELDS.reduce((sum, field) => sum + updated[field], 0);

    const missing = [];

    REQUIREMENTS.forEach(({ label, field }) => {
      if (updated[field] > 0) {
        missing.push(`${updated[field]} ${label}`);
      }
    });

    updated.missing_requirements = missing.join(", ");

    const result = await window.electronAPI.updateStudent(updated);

    if (!result?.success) {
      alert(result?.error || "Could not save record.");
      return;
    }

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

  const {
    uniqueDepts,
    uniqueMajors,
    uniqueStatuses,
    uniquePrograms
  } = useMemo(() => {
    if (!studentData) {
      return {
        uniqueDepts: [],
        uniqueMajors: [],
        uniqueStatuses: [],
        uniquePrograms: []
      };
    }
    const students = Object.values(studentData);
    
    return {
      uniqueDepts: [...new Set(students.map(s => s.dept))].filter(Boolean).sort(),
      uniqueMajors: [...new Set(students.map(s => s.major1))].filter(Boolean).sort(),
      uniqueStatuses: [...new Set(students.map(s => s.status))].filter(Boolean).sort(),
      uniquePrograms: [...new Set(students.map(s => s.program))].filter(Boolean).sort()
    };
  }, [studentData]);
  
  const handleViewAudit = async (filename) => {
    const result = await window.electronAPI.readAuditFile(filename);

    if (result.success) {
      // JSON data and filename to Main Process to open in new window
      window.electronAPI.openJsonViewer(result.data, filename);
    } else {
      alert("Could not load audit file: " + result.error);
    }
  };

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

  const tutorialSteps = [
    {
      title: "Welcome to Villanova EzCert",
      text: "This application processes student audit XML files and gives you a quick overview of each student's graduation requirements."
    },
    {
      title: "Select Your Audit Folder",
      text: "Click 'Select Folder' and choose the folder containing the XML audit files you want to process."
      },
  {
    title: "Run the Processor",
    text: "Once you have selected a folder, click Run Processor. The application will process the XML files and update the student records."
  },
  {
    title: "Student Records",
    text: "Click any student row to open their detailed record. You can review requirements, courses, notes, and other information there."
  },
  {
    title: "Editing Students",
    text: "You can manually adjust student information and requirement counts from the student modal. Changes are saved to the database."
  },
  {
    title: "Review Status",
    text: "Use Review Status to keep track of students that need additional attention or have already been reviewed."
  },
  {
    title: "Exporting",
    text: "Export the current student data to an Excel file. You can also split the report into separate department tabs."
  },
  {
    title: "Clear Database",
    text: "To clear the database, scroll to the bottom of the page, and press Ctrl/Cmd + Shift + X. Hold Shift while pressing the 'Clear Database' button, and enter the password to clear the database."
  },
  {
    title: "You're Ready!",
    text: "That's the basics. You can reopen this tutorial later from the Help button if you need a refresher."
  }
];

const openTutorial = () => {
  setTutorialStep(0);
  setShowTutorial(true);
}
const finishTutorial = () => {
  localStorage.setItem("tutorialCompleted", "true");
  setShowTutorial(false);
  setTutorialStep(0);
}

const nextTutorialStep = () => {
  if (tutorialStep >= tutorialSteps.length - 1) {
    finishTutorial();
  } else {
    setTutorialStep(prev => prev + 1);
  }
};

const previousTutorialStep = () => {
  setTutorialStep(prev => Math.max(prev - 1, 0));
};

  return (
    <div className="audit-container">
      <h2>Villanova EzCert</h2>

      <div className="button-row">
                 <button className="button" onClick={openTutorial}>
          Help
        </button>
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
            <div className='record-count-header'>
              <h3 className="success-text">
                Showing {processedData.length} of {Object.keys(studentData).length} student records.
              </h3>
              <button
                className="button add-student-button"
                onClick={() => setShowAddStudent(true)}
              >
                + Add Student
              </button>
              <Tooltip
                text={
                  "Left click a row to view a student's record.\nRight click a cell to highlight it or reset its color."
                }
              >
                <span className="tooltip-icon">ⓘ</span>
              </Tooltip>

            </div>
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
              <Tooltip
                text={
                  "Each requirement count is based on courses rather than credits."
                }
              >
                <span className="tooltip-icon">ⓘ</span>
              </Tooltip>
            </div>
          </div>

          <div className="scrollable-table">
            <table>
              <thead>
                <tr>
                  <th className="sticky-col-header" style={{ left: 0, minWidth: '40px', maxWidth: '40px' }}>#</th>
                  <th onClick={() => requestSort('review_status')} className="sortable-header sticky-col-header" style={{ left: '40px', minWidth: '125px', maxWidth: '125px' }}>Review Status {sortConfig.key === 'review_status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                  <th onClick={() => requestSort('status')} className="sortable-header sticky-col-header" style={{ left: '165px', minWidth: '100px', maxWidth: '100px' }}>Grad Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="sticky-col-header" style={{ left: '265px', minWidth: '85px', maxWidth: '85px' }}>VUID</th>
                  <th onClick={() => requestSort('last_name')} className="sortable-header sticky-col-header" style={{ left: '350px', minWidth: '120px', maxWidth: '120px', borderRight: '2px solid #bbb' }}>Last {sortConfig.key === 'last_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>

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
                  <th>NOTES</th><th>Missing Requirements</th><th>Audit File</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((s, idx) => {
                  const rowId = s.unique_id || idx;

                  const cells = [
                    { val: s.review_status, style: { backgroundColor: s.review_status === 'Needs Attention' ? '#FFF9C4' : s.review_status === 'Completed' ? '#E8F5E9' : '' } },
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
                    { val: s.missing_requirements, className: "missing-reqs" },
                    {
                      val: s.audit_file ? (
                        <button className="button" onClick={(e) => {
                          e.stopPropagation(); // Prevents the row click from opening the modal at the same time
                          handleViewAudit(s.audit_file);
                        }}>
                          View JSON
                        </button>
                      ) : "No File"
                    }
                  ];

                  return (
                    <tr
                      key={rowId}
                      className="clickable-row"
                      onClick={() => handleRowClick(s)}
                    >

                      <td
                        className="sticky-col default-sticky-bg"
                        style={{ left: 0, minWidth: '40px', maxWidth: '40px', textAlign: 'center', fontWeight: 'bold', color: '#888' }}
                      >
                        {idx + 1}
                      </td>

                      {cells.map((col, colIdx) => {
                        const isHighlighted = highlightedCells[`${s.vuid}-${colIdx}`];
                        const isSticky = colIdx < 4; // First 4 cells from array (Review, Status, VUID, Last)

                        let combinedClass = col.className || "";
                        const combinedStyle = { ...(col.style || {}) };


                        if (isSticky) {
                          combinedClass += " sticky-col";


                          const stickyConfigs = [
                            { left: '40px', minWidth: '125px', maxWidth: '125px' }, // Review
                            { left: '165px', minWidth: '100px', maxWidth: '100px' }, // Status
                            { left: '265px', minWidth: '85px', maxWidth: '85px' }, // VUID
                            { left: '350px', minWidth: '120px', maxWidth: '120px', borderRight: '2px solid #bbb' } // Last
                          ];
                          Object.assign(combinedStyle, stickyConfigs[colIdx]);

                          // If it doesn't have an explicit color give it the solid white default
                          if (!combinedStyle.backgroundColor) {
                            combinedClass += " default-sticky-bg";
                          }
                        }

                        // Override with highlight color if clicked
                        if (isHighlighted) {
                          combinedStyle.backgroundColor = '#FFFF00';
                        }

                        return (
                          <td
                            key={colIdx}
                            className={combinedClass.trim()}
                            style={combinedStyle}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              toggleCellHighlight(s.vuid, colIdx);
                            }}
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
        <StudentModal
          student={selectedStudent}
          editData={editData}
          setEditData={setEditData}
          classes={selectedStudentClasses}
          programOptions={uniquePrograms}
          onClose={() => setSelectedStudent(null)}
          onSave={handleSaveDetails}
          onDelete={handleDeleteStudent}
        />
      )}
      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onAdd={handleAddStudent}
          />
      )}
      {showPasswordModal && (
        <PasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handlePasswordSubmit}
          error={passwordError}
        />
      )}
      {showClearDatabase && (
        <div className="clear-database-container">
          <button className="button danger" onClick={handleClearDatabase}>
            Clear Database
          </button>
        </div>
      )}
      {showTutorial && (
  <TutorialModal
    steps={tutorialSteps}
    step={tutorialStep}
    onClose={finishTutorial}
    onNext={nextTutorialStep}
    onBack={previousTutorialStep}
  />
)}
    </div>
  );
}