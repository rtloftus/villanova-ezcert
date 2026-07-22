import React, { useState, useMemo, useEffect } from 'react';
import './AuditProcessor.css';
import * as XLSX from 'xlsx-js-style';

export default function AuditProcessor() {
  const [folderPath, setFolderPath] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [studentData, setStudentData] = useState(null);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editData, setEditData] = useState({});

  // Sort and Filter State
  const [filterDept, setFilterDept] = useState('');
  const [filterMajor, setFilterMajor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReviewStatus, setFilterReviewStatus] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [splitByDept, setSplitByDept] = useState(false);

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

    const applyStylesToSheet = (worksheet) => {
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      let statusColIndex = -1;
      let reviewColIndex = -1;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ c: C, r: 0 })];
        if (headerCell && headerCell.v === 'Grad Status') statusColIndex = C;
        if (headerCell && headerCell.v === 'Review Status') reviewColIndex = C;
      }

      // Color grad status
      if (statusColIndex !== -1) {
        for (let R = 1; R <= range.e.r; ++R) {
          const cell = worksheet[XLSX.utils.encode_cell({ c: statusColIndex, r: R })];
          if (!cell) continue;
          let bgColor = null;
let textColor = null;

if (cell.v === 'OK') {
  bgColor = '006000';
  textColor = 'C5EFCD';
} else if (cell.v === 'DELETE') {
  bgColor = 'FFC7CE';
  textColor = '9C0006';
} else if (cell.v === 'HOLD') {
  bgColor = 'FCE4D6';
  textColor = '9C5700';
} else if (cell.v === 'ON TRACK') {
  bgColor = 'C6EFCE';
  textColor = '006100';
}

if (bgColor) {
  cell.s = {
    fill: {
      patternType: 'solid',
      fgColor: { rgb: bgColor }
    },
    font: {
      color: { rgb: textColor },
      bold: true
    }
  };
}
        }
      }

      // Highlight "needs attention"
      if (reviewColIndex !== -1) {
        for (let R = 1; R <= range.e.r; ++R) {
          const cell = worksheet[XLSX.utils.encode_cell({ c: reviewColIndex, r: R })];
          if (cell && cell.v === 'Needs Attention') {
            cell.s = { fill: { patternType: 'solid', fgColor: { rgb: 'FFD54F' } } }; // Yellow warning
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
        worksheet = applyStylesToSheet(worksheet);
        const safeSheetName = deptName.replace(/[\\/?*[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
      });
    } else {
      let worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      worksheet = applyStylesToSheet(worksheet);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Report");
    }

    XLSX.writeFile(workbook, "Audit_Report.xlsx");
  };

  const handleRowClick = (student) => {
    setSelectedStudent(student);

    setEditData({
      ...student,

      overall_hours: "",

      core_humanities: "",
      core_philosophy: "",
      core_ethics: "",
      core_math: "",
      core_nat_sci: "",
      core_lit: "",
      core_history: "",
      core_soc_sci: "",
      core_fine_arts: "",
      core_theology: "",
      core_language: "",
      core_diversity: "",
      first_major: "",
      free_electives: ""
    });
  };

  const handleSaveDetails = async () => {
    const updated = {
      ...selectedStudent,
      ...editData
    };

    [
      "overall_hours",
      "core_humanities",
      "core_philosophy",
      "core_ethics",
      "core_math",
      "core_nat_sci",
      "core_lit",
      "core_history",
      "core_soc_sci",
      "core_fine_arts",
      "core_theology",
      "core_language",
      "core_diversity",
      "first_major",
      "free_electives"
    ].forEach(field => {
      if (updated[field] === "") {
        updated[field] = selectedStudent[field];
      } else {
        updated[field] = Number(updated[field]);
      }
    });

    updated.total =
      updated.core_humanities +
      updated.core_philosophy +
      updated.core_ethics +
      updated.core_math +
      updated.core_nat_sci +
      updated.core_lit +
      updated.core_history +
      updated.core_soc_sci +
      updated.core_fine_arts +
      updated.core_theology +
      updated.core_language +
      updated.core_diversity +
      updated.first_major +
      updated.free_electives;

    const missing = [];

    [
      ["Humanities", "core_humanities"],
      ["Philosophy", "core_philosophy"],
      ["Ethics", "core_ethics"],
      ["Math", "core_math"],
      ["Nat Sci", "core_nat_sci"],
      ["Lit", "core_lit"],
      ["History", "core_history"],
      ["Soc Sci", "core_soc_sci"],
      ["Fine Arts", "core_fine_arts"],
      ["Theology", "core_theology"],
      ["Language", "core_language"],
      ["Diversity", "core_diversity"],
      ["Major", "first_major"],
      ["Electives", "free_electives"],
    ].forEach(([label, field]) => {
      if (updated[field] > 0) {
        missing.push(`${updated[field]} ${label}`);
      }
    });

    updated.missing_requirements = missing.join(", ");
    await window.electronAPI.updateStudent(updated);

    setStudentData(prev =>
      prev.map(student =>
        student.unique_id === selectedStudent.unique_id
          ? updated
          : student
      )
    );

    setSelectedStudent(null);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const { processedData, uniqueDepts, uniqueMajors, uniqueStatuses, uniqueReviewStatuses } = useMemo(() => {
    if (!studentData) return { processedData: [], uniqueDepts: [], uniqueMajors: [], uniqueStatuses: [], uniqueReviewStatuses: [] };

    let sortableItems = Object.values(studentData);

    const depts = [...new Set(sortableItems.map(s => s.dept))].filter(Boolean).sort();
    const majors = [...new Set(sortableItems.map(s => s.major1))].filter(Boolean).sort();
    const statuses = [...new Set(sortableItems.map(s => s.status))].filter(Boolean).sort();
    const reviewStatuses = ["Not Reviewed", "Needs Attention", "Completed"];

    if (filterDept) sortableItems = sortableItems.filter(s => s.dept === filterDept);
    if (filterMajor) sortableItems = sortableItems.filter(s => s.major1 === filterMajor);
    if (filterStatus) sortableItems = sortableItems.filter(s => s.status === filterStatus);
    if (filterReviewStatus) sortableItems = sortableItems.filter(s => s.review_status === filterReviewStatus);

    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return { processedData: sortableItems, uniqueDepts: depts, uniqueMajors: majors, uniqueStatuses: statuses, uniqueReviewStatuses: reviewStatuses };
  }, [studentData, filterDept, filterMajor, filterStatus, filterReviewStatus, sortConfig]);

  return (
    <div className="audit-container">
      <h2>Villanova EzCert</h2>

      <div className="button-row">
        <button className="button" onClick={handleSelectFolder}>
          Select Folder
        </button>
        <button
          className={`button primary ${!folderPath ? 'disabled' : ''}`}
          onClick={handleProcessAudits}
          disabled={!folderPath || status === 'processing'}
        >
          {status === 'processing' ? 'Processing XML...' : 'Run Processor'}
        </button>

        {status === 'success' && studentData && (
          <div className="export-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="button export" onClick={handleExportXLSX}>
              Export to XLSX
            </button>
            <label style={{ fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            <h3 className="success-text">Showing {processedData.length} of {Object.keys(studentData).length} programs.</h3>

            <div className="filter-controls">
              <select value={filterReviewStatus} onChange={(e) => setFilterReviewStatus(e.target.value)}>
                <option value="">All Review Statuses</option>
                {uniqueReviewStatuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}
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
                  <th onClick={() => requestSort('review_status')} className="sortable-header">
                    Review Status {sortConfig.key === 'review_status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => requestSort('status')} className="sortable-header">
                    Grad Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>VUID</th>
                  <th onClick={() => requestSort('last_name')} className="sortable-header">
                    Last {sortConfig.key === 'last_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>First</th><th>Class Code</th>
                  <th>Catalog Term</th><th>Exp Grad Date</th><th>Program</th>
                  <th onClick={() => requestSort('dept')} className="sortable-header">
                    Dept {sortConfig.key === 'dept' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => requestSort('major1')} className="sortable-header">
                    Major1 {sortConfig.key === 'major1' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Major2</th><th>Major3</th><th>Major4</th>
                  <th>Minor1</th><th>Minor2</th><th>Minor3</th><th>Minor4</th>
                  <th>Conc1</th><th>Conc2</th><th>Conc3</th><th>Conc4</th>
                  <th>Overall Hours Earned</th>
                  <th>Core Humanities</th><th>Core Philosophy</th><th>Core Ethics</th>
                  <th>Core Math</th><th>Core Natural Science</th><th>Core Literature</th>
                  <th>Core History</th><th>Core Social Science</th><th>Core Fine Arts</th>
                  <th>Core Theology</th><th>Core Language</th><th>Core Diversity</th>
                  <th>1st Major</th><th>Free Electives</th>
                  <th onClick={() => requestSort('total')} className="sortable-header">
                    Total {sortConfig.key === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>NOTES</th><th>Missing Requirements</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((s, idx) => (
                  <tr
                    key={s.unique_id || idx}
                    onClick={() => handleRowClick(s)}
                    className="clickable-row"
                  >
                    <td style={{
                      backgroundColor: s.review_status === 'Needs Attention' ? '#FFF9C4' :
                        s.review_status === 'Completed' ? '#E8F5E9' : 'transparent',
                    }}>
                      {s.review_status}
                    </td>
                    <td
                      style={{
                        fontWeight: 'bold',
                        color:
                          s.status === 'OK' ? '#C5EFCD' :
                            s.status === 'DELETE' ? '#9C0006' :
                              s.status === 'HOLD' ? '#9C5700' :
                                '#006100',

                        backgroundColor:
                          s.status === 'OK' ? '#006000' :
                            s.status === 'DELETE' ? '#FFC7CE' :
                              s.status === 'HOLD' ? '#FFEB9C' :
                                '#C6EFCE'
                      }}
                    >
                      {s.status}
                    </td>
                    <td>{s.vuid}</td><td>{s.last_name}</td><td>{s.first_name}</td>
                    <td>{s.clas}</td><td>{s.catalog_term}</td>
                    <td>{s.exp_grad_date}</td><td>{s.program}</td><td>{s.dept}</td>
                    <td>{s.major1}</td><td>{s.major2}</td><td>{s.major3}</td><td>{s.major4}</td>
                    <td>{s.minor1}</td><td>{s.minor2}</td><td>{s.minor3}</td><td>{s.minor4}</td>
                    <td>{s.conc1}</td><td>{s.conc2}</td><td>{s.conc3}</td><td>{s.conc4}</td>
                    <td>{s.overall_hours}</td>
                    <td>{s.core_humanities}</td><td>{s.core_philosophy}</td><td>{s.core_ethics}</td>
                    <td>{s.core_math}</td><td>{s.core_nat_sci}</td><td>{s.core_lit}</td>
                    <td>{s.core_history}</td><td>{s.core_soc_sci}</td><td>{s.core_fine_arts}</td>
                    <td>{s.core_theology}</td><td>{s.core_language}</td><td>{s.core_diversity}</td>
                    <td>{s.first_major}</td><td>{s.free_electives}</td>
                    <td><strong>{s.total}</strong></td>
                    <td>{s.notes}</td>
                    <td className="missing-reqs">{s.missing_requirements}</td>
                  </tr>
                ))}
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
                    value={editData.overall_hours}
                    placeholder={selectedStudent.overall_hours}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        overall_hours: e.target.value
                      })
                    }
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

            <div className="modal-section">
              <h4>Missing Requirements</h4>

              {[
                ["Humanities", "core_humanities"],
                ["Philosophy", "core_philosophy"],
                ["Ethics", "core_ethics"],
                ["Math", "core_math"],
                ["Natural Science", "core_nat_sci"],
                ["Literature", "core_lit"],
                ["History", "core_history"],
                ["Social Science", "core_soc_sci"],
                ["Fine Arts", "core_fine_arts"],
                ["Theology", "core_theology"],
                ["Language", "core_language"],
                ["Diversity", "core_diversity"],
                ["Major", "first_major"],
                ["Free Electives", "free_electives"],
              ].map(([label, field]) => (
                <div
                  key={field}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    alignItems: "center"
                  }}
                >
                  <label>{label}</label>

                  <input
                    type="number"
                    min="0"
                    style={{ width: "70px" }}
                    value={editData[field]}
                    placeholder={selectedStudent[field]}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        [field]: e.target.value
                      })
                    }
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
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        status: e.target.value
                      })
                    }
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
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        review_status: e.target.value
                      })
                    }
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
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    notes: e.target.value
                  })
                }
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
    </div>
  );
}