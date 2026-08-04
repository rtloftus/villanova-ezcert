import { useState } from "react";
import "./Tooltip.css";

export default function Tooltip({ children, text }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="tooltip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}

      {open && (
        <div className="tooltip-content">
          {text}
          <div className="tooltip-arrow" />
        </div>
      )}
    </span>
  );
}