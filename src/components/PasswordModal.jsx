import React, { useState } from 'react';
import './AuditProcessor.css'; 
import {createPortal} from 'react-dom';

export default function PasswordModal({ onClose, onSubmit, error }) {
    const [password, setPassword] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(password);
    };

    return createPortal(
        <div className="modal-overlay">
            <div className="password-modal">
                <h2>Clear Database</h2>
                <p>Type 'confirm' to continue.</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='confirm'
                        autoFocus
                    />
                    {error && <div className="password-error">{error}</div>}

                    <div className="modal-buttons">
                        <button type="button" className="button" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="button danger">
                            Continue
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}