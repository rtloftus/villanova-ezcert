import React from 'react';
import { createPortal } from "react-dom";
import { REQUIREMENTS } from "../reactconstants";
import './AuditProcessor.css';


export default function StudentModal({ 
  student, 
  editData, 
  setEditData, 
  classes, 
  onClose, 
  onSave 
}) {
  
  
  if (!student) return null;

  return createPortal(
      <div
        className="modal-overlay"
        onClick={onClose}
      >
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>
              {student.first_name} {student.last_name} ({student.vuid})
            </h3>
            <button
              className="close-button"
              onClick={onClose}
            >
              X
            </button>
          </div>
  
          <div className="modal-grid">
            <div className="modal-section">
              <h4>Student Information</h4>
              <p><strong>Class:</strong> {student.clas}</p>
              <p><strong>Exp Grad Date:</strong> {student.exp_grad_date}</p>
              <p>
                <strong>Credits Completed:</strong>
                <input
                  type="number"
                  style={{ marginLeft: "8px", width: "70px" }}
                  value={editData.overall_hours ?? ""}
                  placeholder={student.overall_hours}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      overall_hours: e.target.value,
                    })
                  }
                />
              </p>
              <p><strong>Total Courses Needed:</strong> {editData.total}</p>
            </div>
  
            <div className="modal-section">
              <h4>Degree Program(s)</h4>
              <p><strong>Program Code:</strong> {student.program}</p>
  
              {student.major1 && (
                <p>
                  <strong>Majors:</strong>{" "}
                  {[student.major1, student.major2, student.major3, student.major4]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
  
              {student.minor1 && (
                <p>
                  <strong>Minors:</strong>{" "}
                  {[student.minor1, student.minor2, student.minor3, student.minor4]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
  
              {student.conc1 && (
                <p>
                  <strong>Concentrations:</strong>{" "}
                  {[student.conc1, student.conc2, student.conc3, student.conc4]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
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
                  {classes.length > 0 ? (
                    classes.map((cls, idx) => (
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
                  placeholder={student[field]}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
  
          <div className="modal-section edit-section">
            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <h4>Graduation Status</h4>
  
                <select
                  className="status-dropdown"
                  value={editData.status || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
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
                  className="status-dropdown"
                  value={editData.review_status || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      review_status: e.target.value,
                    }))
                  }
                >
                  <option value="Not Reviewed">Not Reviewed</option>
                  <option value="Needs Attention">Needs Attention</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
  
            <h4>Reviewer Notes</h4>
  
            <textarea
              rows={4}
              className="notes-textarea"
              placeholder="Add review notes here..."
              value={editData.notes || ""}
              onChange={(e) =>
                setEditData((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
            />
          </div>
  
          <div className="modal-footer">
            <button
              className="button"
              onClick={onClose}
            >
              Cancel
            </button>
  
            <button
              className="button primary"
              onClick={onSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
}