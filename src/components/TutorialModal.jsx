import React from "react";
import { createPortal } from "react-dom";
import "./AuditProcessor.css";

export default function TutorialModal({
  steps,
  step,
  onClose,
  onNext,
  onBack
}) {
  const currentStep = steps[step];

  if (!currentStep) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-content tutorial-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{currentStep.title}</h3>

          <button
            className="close-button"
            onClick={onClose}
          >
            X
          </button>
        </div>

        <div className="tutorial-progress">
          Step {step + 1} of {steps.length}
        </div>

        <p className="tutorial-text">
          {currentStep.text}
        </p>

        <div className="tutorial-actions">
          <button
            className="button"
            onClick={onClose}
          >
            Skip Tutorial
          </button>

          <div>
            {step > 0 && (
              <button
                className="button"
                onClick={onBack}
              >
                Back
              </button>
            )}

            <button
              className="button primary"
              onClick={onNext}
            >
              {step === steps.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}