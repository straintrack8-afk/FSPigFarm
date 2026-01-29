import React, { useState } from 'react';
import WelcomePage from './WelcomePage';
import FeasibilityCalculator from './FeasibilityCalculator';
import ProductionCalculator from './ProductionCalculator';

function App() {
  // Modes: 'welcome', 'production', 'feasibility'
  const [currentMode, setCurrentMode] = useState('welcome');

  const handleSelectMode = (mode) => {
    setCurrentMode(mode);
  };

  const handleBack = () => {
    setCurrentMode('welcome');
  };

  return (
    <div className="app-container">
      {currentMode === 'welcome' && (
        <WelcomePage onSelectMode={handleSelectMode} />
      )}

      {currentMode === 'production' && (
        <ProductionCalculator onBack={handleBack} />
      )}

      {currentMode === 'feasibility' && (
        <FeasibilityCalculator onBack={handleBack} />
      )}
    </div>
  );
}

export default App;