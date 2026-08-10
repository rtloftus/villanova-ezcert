import React, {useState} from "react";
import { createPortal } from "react-dom";
import "./AuditProcessor.css"

function getNextMay() {
    const today = new Date();
    const year = today.getMonth() >= 4 ? today.getFullYear() + 1 : today.getFullYear();
    return `05/01/${year}`;
}

export default function AddStudentModal ( {onClose, onAdd}) {
    const [formData, setFormData] = useState( {
        first_name: "",
        last_name: "",
        vuid: "",
        clas: "SR",
        program: "",
        major1: "",
        exp_grad_date: getNextMay()
    });

    const [error, setError] = useState("");

    const updateField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError("First and last name are required.")
            return;
        }
        if (!formData.vuid.trim()) {
            setError("VUID is required.")
            return;
        }
        if (!formData.program.trim()) {
            setError("Program is required.");
            return;
        }
        if (!formData.major1.trim()) {
            setError("Major is required.");
            return;
        }

        const student = {
            unique_id: `${formData.vuid.trim()}-${formData.program.trim()}`,
            vuid: formData.vuid.trim(),
            last_name: formData.last_name.trim(),
            first_name: formData.first_name.trim(),
            clas: formData.clas,
            catalog_term: "",
            exp_grad_date: formData.exp_grad_date,
            program: formData.program.trim(),
            dept: "",
            major1: formData.major1.trim(),
            major2: "",
            major3: "",
            major4: "",
            minor1: "",
            minor2: "",
            minor3: "",
            minor4: "",
            conc1: "",
            conc2: "",
            conc3: "",
            conc4: "",
            overall_hours: 0,
            core_humanities: 0,
            core_philosophy: 0,
            core_ethics: 0,
            core_math: 0,
            core_nat_sci: 0,
            core_lit: 0,
            core_history: 0,
            core_soc_sci: 0,
            core_fine_arts: 0,
            core_theology: 0,
            core_language: 0,
            core_diversity: 0,
            first_major: 0,
            free_electives: 0,
            total: 0,
            status: "DELETE",
            review_status: "Not Reviewed",
            notes: "",
            missing_requirements: "",
            audit_file: null
        };

        const result = await onAdd(student);

        if (!result.success) {
            setError(result.error || "Could not add student.");
        }
    };

    return createPortal(
        <div className="modal-overlay">
            <div
                className="modal-content add-student-modal"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>Add Student</h2>
                    <button className="modal-close" onClick={onClose}>
                        X
                    </button>
                </div>

                <div className="add-student-grid">
                    <label>
                        First Name
                        <input
                            value= {formData.first_name}
                            onChange={e => updateField("first_name", e.target.value)}
                            autoFocus
                        />
                    </label>
                    <label>
                        Last Name
                        <input
                            value= {formData.last_name}
                            onChange={e => updateField("last_name", e.target.value)}
                        />
                    </label>
                    
                    <label>
                        VUID
                        <input
                            value= {formData.vuid}
                            onChange={e => updateField("vuid", e.target.value)}
                        />
                    </label>

                     <label>
                        Class Code
                        <input
                            value= {formData.clas}
                            onChange={e => updateField("clas", e.target.value)}
                        />
                    </label>

                     <label>
                       Program
                        <input
                            value= {formData.program}
                            onChange={e => updateField("program", e.target.value)}
                        />
                    </label>

                     <label>
                        Major
                        <input
                            value= {formData.major1}
                            onChange={e => updateField("major1", e.target.value)}
                        />
                    </label>

                     <label>
                        Exp Grad Date
                        <input
                            value= {formData.exp_grad_date}
                            onChange={e => updateField("exp_grad_date", e.target.value)}
                            autoFocus
                        />
                    </label>
                </div>

                {error && (
                    <div className="error-box">
                        {error}
                    </div>
                )}

                <div className = "modal-footer">
                    <button
                        className="button"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="button primary"
                        onClick={handleSubmit}
                    >
                        Add Student
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}