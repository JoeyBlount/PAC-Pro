import React, { useState } from "react";

const collapsible = () => {
  const [isOpen,setIsOpen] = useState(false);

  const toggleSection = () => {
    setIsOpen(!isOpen);
  };

  return (
  <div>
    <button onClick = {toggleSection}>
      Change Password
    </button>

    {isOpen && (
      <div className = "change-password">
        <p>Temp content. Fill with either password change form or redirect link</p>
        </div>
    )}
  </div>);
};

export default collapsible;