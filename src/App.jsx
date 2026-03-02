import React, { useState } from 'react';
import WelcomePage from './WelcomePage';
import PigFarmCalculator from './PigFarmCalculator';
import FeasibilityCalculator from './FeasibilityCalculator';


function App() {
  // Modes: 'welcome', 'production', 'feasibility'
  // Initialize from localStorage to persist across refreshes
  const [currentMode, setCurrentMode] = useState(() => {
    return localStorage.getItem('farmfs-currentMode') || 'welcome';
  });
  const [language, setLanguage] = useState(() => localStorage.getItem('farmfs-language') || 'id');

  const handleSelectMode = (mode) => {
    setCurrentMode(mode);
    localStorage.setItem('farmfs-currentMode', mode);
  };

  const handleBack = () => {
    setCurrentMode('welcome');
    localStorage.setItem('farmfs-currentMode', 'welcome');
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'id' : 'en';
    setLanguage(newLang);
    localStorage.setItem('farmfs-language', newLang);
  };

  return (
    <div className="app-container">
      {currentMode === 'welcome' && (
        <WelcomePage onSelectMode={handleSelectMode} />
      )}

      {currentMode === 'production' && (
        <PigFarmCalculator onBack={handleBack} />
      )}

      {currentMode === 'feasibility' && (
        <FeasibilityCalculator onBack={handleBack} />
      )}
    </div>
  );
}

export default App;