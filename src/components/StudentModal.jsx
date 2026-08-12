import React, {useState} from 'react';
import { createPortal } from "react-dom";
import { REQUIREMENTS } from "../reactconstants";
import './AuditProcessor.css';
import Tooltip from "./Tooltip";

function TagInput({label, values, onChange, maxItems}) {
  const [input, setInput] = useState("");
  const addValue = () => {
    const value = input.trim().toUpperCase();

    if (!value) return;
    if (values.length >= maxItems) return;
    if (values.includes(value)) {
      setInput("");
      return;
    }

    onChange([...values,value]);
    setInput("");
  };

  const removeValue = (index) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue();
    }

    if (e.key === "Backspace" && !input && values.length > 0) {
      removeValue(values.length - 1);
    }
  };

  return (
    <div className = "program-field">
      <label>{label}</label>

      <div className="tag-input">
        {values.map((value, index) => (
          <span className = "tag" key={`${value}-${index}`}>
            {value}
            <button
              type="button"
              onClick={() => removeValue(index)}
              aria-label={`Remove ${value}`}
            >
              X
            </button>
          </span>
        ))}

        {values.length < maxItems && (
          <input
            type="text"
            value={input}
            placeholder={values.length === 0 ? `Enter ${label.toLowerCase()}...` : ""}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>
      <small>
        Press Enter to add, up to {maxItems}.
      </small>
    </div>
  );
}

export default function StudentModal({ 
  student, 
  editData, 
  setEditData, 
  classes, 
  programOptions,
  onClose, 
  onSave,
  onDelete
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

              <div className='program-field'>
                <label>Program Code</label>
                <select
                  value={editData.program || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      program: e.target.value
                    }))
                  }
                >
                  <option value="">Select Program</option>
                  {programOptions.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                  
                </select>
              </div>

              <TagInput
                label="Majors"
                values={[
                  editData.major1,
                  editData.major2,
                  editData.major3,
                  editData.major4
                ].filter(Boolean)}
                maxItems={4}
                onChange={(values) =>
                  setEditData((prev) => ({
                    ...prev,
                    major1: values[0] || "",
                    major2: values[1] || "",
                    major3: values[2] || "",
                    major4: values[3] || ""
                  }))
                }
              />

              <TagInput
                label="Minors"
                values={[
                  editData.minor1,
                  editData.minor2,
                  editData.minor3,
                  editData.minor4
                ].filter(Boolean)}
                maxItems={4}
                onChange={(values) =>
                  setEditData((prev) => ({
                    ...prev,
                    minor1: values[0] || "",
                    minor2: values[1] || "",
                    minor3: values[2] || "",
                    minor4: values[3] || ""
                  }))
                }
              />

              <TagInput
                label="Concentrations"
                values={[
                  editData.conc1,
                  editData.conc2,
                  editData.conc3,
                  editData.conc4
                ].filter(Boolean)}
                maxItems={4}
                onChange={(values) =>
                  setEditData((prev) => ({
                    ...prev,
                    conc1: values[0] || "",
                    conc2: values[1] || "",
                    conc3: values[2] || "",
                    conc4: values[3] || ""
                  }))
                }
              />
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
            <h4>Missing Requirements
              <Tooltip text="Missing requirements update after saving.">
  <span className="tooltip-icon">ⓘ</span>
</Tooltip>
            </h4>
  
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
              className="button danger"
              onClick={() => onDelete(student.unique_id)}
            >
              Delete Record
            </button>

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