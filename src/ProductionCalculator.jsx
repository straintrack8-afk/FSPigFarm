import React, { useState, useEffect, useMemo } from 'react';
import { Save, FileDown, Trash2, Copy, Plus, X, Calendar, TrendingUp, DollarSign, PieChart, Settings, BarChart, ArrowLeft } from 'lucide-react';

// ============================================
// DEFAULT VALUES
// ============================================

const defaultBreedingParams = {
  // Production KPIs
  gestationPeriod: 114,
  lactationPeriod: 28,
  recoveryDays: 7,
  farrowingRate: 0.85,
  bornAlivePerLitter: 12,
  preWeaningMortality: 0.08,
  sowMortality: 0.10,
  cullingRate: 0.45,

  // Costs
  giltPrice: 7000000,
  giltCostEscalation: 0.015,
  sowFeedPrice: 11000,
  sowFeedEscalation: 0.01,
  sowFeedPerDay: 2.6,
  ahpPerSowPerMonth: 7583, // Changed from per year (91000/12)
  ahpEscalation: 0.01,
  laborPerPigletPerMonth: 9000, // Changed from per day (300*30)
  laborEscalation: 0.02,
  overheadPerSowPerMonth: 46500, // Changed from per year (558000/12)
  overheadEscalation: 0.01,
  farrowingCostPerLitter: 50000,

  // Pre-productive costs (gilt acclimatization)
  daysToFirstMating: 45,
  preProductiveFeedPerDay: 2.6,
  preProductiveAHP: 34000,
  preProductiveLaborPerDay: 300,
};

const defaultNurseryParams = {
  targetWeight: 25,
  adg: 0.45,
  fcr: 1.5,
  mortality: 0.03,
  feedPrice: 13000,
  feedEscalation: 0.02,
  ahpPerKg: 789,
  ahpEscalation: 0.02,
  laborPerPigPerDay: 200,
  laborEscalation: 0.02,
  utilitiesPerKg: 500,
  utilitiesEscalation: 0.02,
};

const defaultFatteningParams = {
  targetWeight: 120,
  adg: 0.75,
  fcr: 2.6,
  mortality: 0.04,
  feedPrice: 8200,
  feedEscalation: 0.02,
  ahpPerKg: 1600,
  ahpEscalation: 0.02,
  laborPerPigPerDay: 150,
  laborEscalation: 0.02,
  utilitiesPerKg: 6000,
  utilitiesEscalation: 0.02,
};

const defaultPrices = {
  piglet6kg: 800000,
  piglet10kg: 1500000,
  piglet25kg: 2500000,
  finisherPerKg: 45000,
  culledSowPerKg: 34300,
  culledSowWeight: 120,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

const formatCurrency = (num, decimals = 0) => {
  return `IDR ${formatNumber(num, decimals)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const addMonths = (dateString, months) => {
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

const getMonthDiff = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
};

// ============================================
// CALCULATION ENGINE
// ============================================

const calculateCohortProduction = (cohort, breedingParams, nurseryParams, fatteningParams, prices) => {
  const {
    id,
    name,
    numberOfGilts,
    entryDate,
    daysToFirstMating
  } = cohort;

  const {
    gestationPeriod,
    lactationPeriod,
    recoveryDays,
    farrowingRate,
    bornAlivePerLitter,
    preWeaningMortality,
    cullingRate,
    giltPrice,
    giltCostEscalation,
    sowFeedPrice,
    sowFeedEscalation,
    sowFeedPerDay,
    ahpPerSowPerMonth,
    ahpEscalation,
    laborPerPigletPerMonth,
    laborEscalation,
    overheadPerSowPerMonth,
    overheadEscalation,
    farrowingCostPerLitter,
    preProductiveFeedPerDay,
    preProductiveAHP,
    preProductiveLaborPerDay,
  } = breedingParams;

  // Timeline calculations
  const firstMatingDate = addDays(entryDate, daysToFirstMating);
  const firstFarrowingDate = addDays(firstMatingDate, gestationPeriod);
  const firstWeaningDate = addDays(firstFarrowingDate, lactationPeriod);

  const totalCycleDays = gestationPeriod + lactationPeriod + recoveryDays;
  const monthlyThroughput = numberOfGilts * (30 / totalCycleDays);
  const monthlyReplacementGilts = numberOfGilts * cullingRate / 12;
  const sowsReMated = monthlyThroughput - monthlyReplacementGilts;
  const totalMatings = monthlyThroughput;
  const successfulFarrowings = totalMatings * farrowingRate;
  const pigletsBornMonthly = successfulFarrowings * bornAlivePerLitter;
  const pigletsWeanedMonthly = pigletsBornMonthly * (1 - preWeaningMortality);

  // Pre-productive costs
  const giltPurchaseCost = numberOfGilts * giltPrice;
  const preProductiveFeedCost = numberOfGilts * daysToFirstMating * preProductiveFeedPerDay * sowFeedPrice;
  const preProductiveAHPCost = numberOfGilts * preProductiveAHP;
  const preProductiveLaborCost = numberOfGilts * daysToFirstMating * preProductiveLaborPerDay;
  const totalPreProductiveCost = giltPurchaseCost + preProductiveFeedCost + preProductiveAHPCost + preProductiveLaborCost;

  // Monthly production array (starting from first weaning)
  const monthlyProduction = [];
  const firstWeaningMonth = getMonthDiff(entryDate, firstWeaningDate);

  // Generate 36 months of production data
  for (let month = 0; month < 36; month++) {
    if (month < firstWeaningMonth) {
      // Pre-productive period
      monthlyProduction.push({
        cohortId: id,
        month: month,
        date: addMonths(entryDate, month),
        phase: 'pre-productive',
        pigletsWeaned: 0,
        costs: month === 0 ? totalPreProductiveCost : 0,
      });
    } else {
      // Productive period - ramp up over first 3 months
      const monthsSinceFirstWeaning = month - firstWeaningMonth;
      const rampUpFactor = Math.min(1, (monthsSinceFirstWeaning + 1) / 3);
      const pigletsThisMonth = pigletsWeanedMonthly * rampUpFactor;

      monthlyProduction.push({
        cohortId: id,
        month: month,
        date: addMonths(entryDate, month),
        phase: 'productive',
        pigletsWeaned: pigletsThisMonth,
        costs: 0, // Will be calculated later based on actual production
      });
    }
  }

  return {
    cohortId: id,
    cohortName: name,
    numberOfGilts,
    entryDate,
    firstMatingDate,
    firstFarrowingDate,
    firstWeaningDate,
    firstWeaningMonth,
    steadyStateMonthlyOutput: pigletsWeanedMonthly,
    preProductiveCost: totalPreProductiveCost,
    monthlyProduction,
  };
};

const calculateGrowthAndSales = (
  allCohortsProduction,
  nurseryParams,
  fatteningParams,
  exitPoints,
  breedingParams,
  prices
) => {
  // Aggregate monthly piglet production across all cohorts
  const monthlyData = [];
  const maxMonths = 36;

  for (let month = 0; month < maxMonths; month++) {
    const date = allCohortsProduction[0]?.monthlyProduction[month]?.date || null;
    const totalPigletsWeaned = allCohortsProduction.reduce((sum, cohort) => {
      return sum + (cohort.monthlyProduction[month]?.pigletsWeaned || 0);
    }, 0);

    const totalPreProductiveCost = allCohortsProduction.reduce((sum, cohort) => {
      return sum + (cohort.monthlyProduction[month]?.costs || 0);
    }, 0);

    monthlyData.push({
      month,
      date,
      pigletsWeaned6kg: totalPigletsWeaned,
      preProductiveCost: totalPreProductiveCost,
      exitSales: [],
      totalRevenue: 0,
      totalCOGS: totalPreProductiveCost,
      grossProfit: 0,
    });
  }

  // Process each exit point
  const sortedExits = [...exitPoints].sort((a, b) => a.targetWeight - b.targetWeight);

  sortedExits.forEach((exit, exitIndex) => {
    if (!exit.enabled) return;

    const {
      targetWeight,
      allocationPercent,
      sellingPricePerKg,
      sellingPricePerHead
    } = exit;

    // Calculate growth phases needed
    const phases = [];
    let currentWeight = 6;

    // Nursery phase (6kg → nursery exit or target)
    if (targetWeight > 6) {
      const nurseryExitWeight = Math.min(targetWeight, nurseryParams.targetWeight);
      phases.push({
        name: 'nursery',
        startWeight: 6,
        endWeight: nurseryExitWeight,
        params: nurseryParams,
      });
      currentWeight = nurseryExitWeight;
    }

    // Fattening phase (nursery exit → target)
    if (targetWeight > nurseryParams.targetWeight && currentWeight < targetWeight) {
      phases.push({
        name: 'fattening',
        startWeight: currentWeight,
        endWeight: targetWeight,
        params: fatteningParams,
      });
    }

    // Calculate total duration and costs
    let totalDuration = 0;
    let costPer6kg = 401117; // Base cost from breeding (simplified)
    let cumulativeCost = costPer6kg;
    let survivalRate = 1.0;

    phases.forEach(phase => {
      const weightGain = phase.endWeight - phase.startWeight;
      const duration = weightGain / phase.params.adg;
      const feedRequired = weightGain * phase.params.fcr;

      const feedCost = feedRequired * phase.params.feedPrice;
      const ahpCost = weightGain * phase.params.ahpPerKg;
      const laborCost = duration * phase.params.laborPerPigPerDay;
      const utilitiesCost = weightGain * phase.params.utilitiesPerKg;

      const phaseCost = feedCost + ahpCost + laborCost + utilitiesCost;
      survivalRate *= (1 - phase.params.mortality);
      cumulativeCost = (cumulativeCost + phaseCost) / (1 - phase.params.mortality);

      totalDuration += duration;
    });

    const daysToExit = Math.round(totalDuration);
    const costPerHead = cumulativeCost;

    // Apply this exit to monthly data
    monthlyData.forEach((monthData, monthIndex) => {
      if (monthData.pigletsWeaned6kg <= 0) return;

      const saleMonth = monthIndex + Math.ceil(daysToExit / 30);
      if (saleMonth >= maxMonths) return;

      const allocatedPiglets = monthData.pigletsWeaned6kg * (allocationPercent / 100);
      const survivingPigs = allocatedPiglets * survivalRate;

      let revenuePerHead;
      if (sellingPricePerHead) {
        revenuePerHead = sellingPricePerHead;
      } else {
        revenuePerHead = targetWeight * sellingPricePerKg;
      }

      const totalRevenue = survivingPigs * revenuePerHead;
      const totalCost = allocatedPiglets * costPerHead;
      const grossProfit = totalRevenue - totalCost;

      monthlyData[saleMonth].exitSales.push({
        exitName: `Exit @ ${targetWeight}kg`,
        targetWeight,
        pigsIn: allocatedPiglets,
        pigsOut: survivingPigs,
        revenue: totalRevenue,
        cogs: totalCost,
        profit: grossProfit,
      });

      monthlyData[saleMonth].totalRevenue += totalRevenue;
      monthlyData[saleMonth].totalCOGS += totalCost;
    });
  });

  // Calculate gross profit for each month
  monthlyData.forEach(month => {
    month.grossProfit = month.totalRevenue - month.totalCOGS;
    month.margin = month.totalRevenue > 0 ? month.grossProfit / month.totalRevenue : 0;
  });

  return monthlyData;
};

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function ProductionCalculator({ onBack }) {
  const [activeTab, setActiveTab] = useState('setup');

  // State: Gilt Cohorts
  const [cohorts, setCohorts] = useState([
    {
      id: 1,
      name: 'Batch 1',
      numberOfGilts: 100,
      entryDate: '2025-01-01',
      daysToFirstMating: 45,
    }
  ]);

  // State: Parameters
  const [breedingParams, setBreedingParams] = useState(defaultBreedingParams);
  const [nurseryParams, setNurseryParams] = useState(defaultNurseryParams);
  const [fatteningParams, setFatteningParams] = useState(defaultFatteningParams);
  const [prices, setPrices] = useState(defaultPrices);

  // State: Exit Points
  const [exitPoints, setExitPoints] = useState([
    {
      id: 1,
      enabled: true,
      targetWeight: 10,
      allocationPercent: 20,
      sellingPricePerHead: 1500000,
      sellingPricePerKg: null,
    },
    {
      id: 2,
      enabled: true,
      targetWeight: 120,
      allocationPercent: 80,
      sellingPricePerHead: null,
      sellingPricePerKg: 45000,
    }
  ]);

  // State: Scenarios
  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');

  // Calculations
  const allCohortsProduction = useMemo(() => {
    return cohorts.map(cohort =>
      calculateCohortProduction(cohort, breedingParams, nurseryParams, fatteningParams, prices)
    );
  }, [cohorts, breedingParams, nurseryParams, fatteningParams, prices]);

  const monthlyFinancials = useMemo(() => {
    return calculateGrowthAndSales(
      allCohortsProduction,
      nurseryParams,
      fatteningParams,
      exitPoints,
      breedingParams,
      prices
    );
  }, [allCohortsProduction, nurseryParams, fatteningParams, exitPoints, breedingParams, prices]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalRevenue = monthlyFinancials.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalCOGS = monthlyFinancials.reduce((sum, m) => sum + m.totalCOGS, 0);
    const totalProfit = totalRevenue - totalCOGS;
    const margin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

    return {
      totalRevenue,
      totalCOGS,
      totalProfit,
      margin,
    };
  }, [monthlyFinancials]);

  // Cohort management
  const addCohort = () => {
    const newId = Math.max(...cohorts.map(c => c.id), 0) + 1;
    const lastCohort = cohorts[cohorts.length - 1];
    const newEntryDate = lastCohort ? addMonths(lastCohort.entryDate, 5) : '2025-01-01';

    setCohorts([...cohorts, {
      id: newId,
      name: `Batch ${newId}`,
      numberOfGilts: 50,
      entryDate: newEntryDate,
      daysToFirstMating: 45,
    }]);
  };

  const updateCohort = (id, field, value) => {
    setCohorts(cohorts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const deleteCohort = (id) => {
    if (cohorts.length === 1) {
      alert('Cannot delete the last cohort');
      return;
    }
    setCohorts(cohorts.filter(c => c.id !== id));
  };

  // Exit point management
  const addExitPoint = () => {
    const newId = Math.max(...exitPoints.map(e => e.id), 0) + 1;
    setExitPoints([...exitPoints, {
      id: newId,
      enabled: true,
      targetWeight: 60,
      allocationPercent: 10,
      sellingPricePerHead: null,
      sellingPricePerKg: 45000,
    }]);
  };

  const updateExitPoint = (id, field, value) => {
    setExitPoints(exitPoints.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const deleteExitPoint = (id) => {
    setExitPoints(exitPoints.filter(e => e.id !== id));
  };

  // Scenario management
  const saveScenario = () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    const newScenario = {
      id: Date.now(),
      name: scenarioName,
      createdAt: new Date().toISOString(),
      cohorts: [...cohorts],
      breedingParams: { ...breedingParams },
      nurseryParams: { ...nurseryParams },
      fatteningParams: { ...fatteningParams },
      prices: { ...prices },
      exitPoints: [...exitPoints],
      summary: { ...summary },
    };

    setScenarios([...scenarios, newScenario]);
    setScenarioName('');
    alert(`Scenario "${newScenario.name}" saved!`);
  };

  const loadScenario = (scenario) => {
    setCohorts(scenario.cohorts);
    setBreedingParams(scenario.breedingParams);
    setNurseryParams(scenario.nurseryParams);
    setFatteningParams(scenario.fatteningParams);
    setPrices(scenario.prices);
    setExitPoints(scenario.exitPoints);
    setActiveTab('setup');
  };

  const deleteScenario = (id) => {
    if (confirm('Delete this scenario?')) {
      setScenarios(scenarios.filter(s => s.id !== id));
    }
  };

  // ============================================
  // RENDER: TAB CONTENT
  // ============================================

  const SetupTab = () => (
    <div className="space-y-6">
      {/* Gilt Cohorts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">🐷 Gilt Cohorts</h2>
          <button
            onClick={addCohort}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={16} /> Add Cohort
          </button>
        </div>

        <div className="space-y-4">
          {cohorts.map((cohort, idx) => (
            <div key={cohort.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">Cohort #{idx + 1}</h3>
                {cohorts.length > 1 && (
                  <button
                    onClick={() => deleteCohort(cohort.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Name</label>
                  <input
                    type="text"
                    value={cohort.name}
                    onChange={(e) => updateCohort(cohort.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Gilts</label>
                  <input
                    type="number"
                    value={cohort.numberOfGilts}
                    onChange={(e) => updateCohort(cohort.id, 'numberOfGilts', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Entry Date
                  </label>
                  <input
                    type="date"
                    value={cohort.entryDate}
                    onChange={(e) => updateCohort(cohort.id, 'entryDate', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days to First Mating</label>
                  <input
                    type="number"
                    value={cohort.daysToFirstMating}
                    onChange={(e) => updateCohort(cohort.id, 'daysToFirstMating', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Timeline preview */}
              {allCohortsProduction[idx] && (
                <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <span className="text-gray-600">First Mating:</span>
                      <div className="font-medium">{formatDate(allCohortsProduction[idx].firstMatingDate)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">First Farrowing:</span>
                      <div className="font-medium">{formatDate(allCohortsProduction[idx].firstFarrowingDate)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">First Weaning:</span>
                      <div className="font-medium">{formatDate(allCohortsProduction[idx].firstWeaningDate)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Monthly Output:</span>
                      <div className="font-medium">{formatNumber(allCohortsProduction[idx].steadyStateMonthlyOutput)} piglets</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Pre-productive Cost: {formatCurrency(allCohortsProduction[idx].preProductiveCost / 1000000, 2)} Million
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Breeding Parameters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Breeding Parameters</h2>

        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm text-green-800">
            <strong>💡 Monthly Costs:</strong> All costs below are on a PER MONTH basis for easier budgeting.
            Example: AHP 7,583/month per sow = ~91,000/year. Labor 9,000/month per piglet = ~300/day.
          </div>
        </div>

        {/* Production KPIs */}
        <h3 className="text-sm font-semibold text-gray-700 mb-3 bg-green-50 px-3 py-2 rounded">Production KPIs</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farrowing Rate (%)</label>
            <input
              type="number"
              value={breedingParams.farrowingRate * 100}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, farrowingRate: parseFloat(e.target.value) / 100 || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Born Alive per Litter</label>
            <input
              type="number"
              value={breedingParams.bornAlivePerLitter}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, bornAlivePerLitter: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pre-weaning Mortality (%)</label>
            <input
              type="number"
              value={breedingParams.preWeaningMortality * 100}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, preWeaningMortality: parseFloat(e.target.value) / 100 || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Culling Rate (%/year)</label>
            <input
              type="number"
              value={breedingParams.cullingRate * 100}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, cullingRate: parseFloat(e.target.value) / 100 || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1"
            />
          </div>
        </div>

        {/* Direct COGS */}
        <h3 className="text-sm font-semibold text-gray-700 mb-3 bg-orange-50 px-3 py-2 rounded">Direct COGS</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gilt Price (IDR)</label>
            <input
              type="number"
              value={breedingParams.giltPrice}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, giltPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="100000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sow Feed Price (IDR/kg)</label>
            <input
              type="number"
              value={breedingParams.sowFeedPrice}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, sowFeedPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sow Feed/Day (kg)</label>
            <input
              type="number"
              value={breedingParams.sowFeedPerDay}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, sowFeedPerDay: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AHP per Sow/Month (IDR)</label>
            <input
              type="number"
              value={breedingParams.ahpPerSowPerMonth}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, ahpPerSowPerMonth: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labor per Piglet/Month (IDR)</label>
            <input
              type="number"
              value={breedingParams.laborPerPigletPerMonth}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, laborPerPigletPerMonth: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overhead per Sow/Month (IDR)</label>
            <input
              type="number"
              value={breedingParams.overheadPerSowPerMonth}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, overheadPerSowPerMonth: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farrowing Cost/Litter (IDR)</label>
            <input
              type="number"
              value={breedingParams.farrowingCostPerLitter}
              onChange={(e) => setBreedingParams(prev => ({ ...prev, farrowingCostPerLitter: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1000"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const GrowthTab = () => (
    <div className="space-y-6">
      {/* Nursery Parameters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🏫 Nursery Stage (6kg → Target)</h2>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>💡 About "per kg gain":</strong> Costs calculated based on weight gain.
            Example: 6kg→25kg = 19kg gain. If AHP = 789 IDR/kg gain, total AHP = 19 × 789 = IDR 14,991.
            This auto-adjusts for different target weights.
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Weight (kg)</label>
            <input
              type="number"
              value={nurseryParams.targetWeight}
              onChange={(e) => setNurseryParams(prev => ({ ...prev, targetWeight: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ADG (kg/day)</label>
            <input
              type="number"
              value={nurseryParams.adg}
              onChange={(e) => setNurseryParams(prev => ({ ...prev, adg: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">FCR</label>
            <input
              type="number"
              value={nurseryParams.fcr}
              onChange={(e) => setNurseryParams(prev => ({ ...prev, fcr: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mortality (%)</label>
            <input
              type="number"
              value={nurseryParams.mortality * 100}
              onChange={(e) => setNurseryParams(prev => ({ ...prev, mortality: parseFloat(e.target.value) / 100 || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feed Price (IDR/kg)</label>
            <input
              type="number"
              value={nurseryParams.feedPrice}
              onChange={(e) => setNurseryParams(prev => ({ ...prev, feedPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AHP (IDR/kg gain)</label>
            <input
              type="number"
              value={nurseryParams.ahpPerKg}
              onChange={(e) => setNurseryParams(prev => ({ ...prev, ahpPerKg: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labor (IDR/pig/day)</label>
            <input
              type="number"
              value={nurseryParams.laborPerPigPerDay}
              onChange={(e) => setNurseryParams(prev => ({ ...prev, laborPerPigPerDay: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Utilities (IDR/kg gain)</label>
            <input
              type="number"
              value={nurseryParams.utilitiesPerKg}
              onChange={(e) => setNurseryParams(prev => ({ ...prev, utilitiesPerKg: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="10"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-green-50 rounded">
          <div className="text-sm font-medium text-green-800">
            Duration: {formatNumber((nurseryParams.targetWeight - 6) / nurseryParams.adg)} days |
            Feed: {formatNumber((nurseryParams.targetWeight - 6) * nurseryParams.fcr, 1)} kg/pig |
            Survivors: {formatNumber((1 - nurseryParams.mortality) * 100, 1)}%
          </div>
        </div>
      </div>

      {/* Fattening Parameters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🏭 Fattening Stage (Nursery Exit → Market)</h2>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>💡 About "per kg gain":</strong> Costs calculated based on weight gain.
            Example: 25kg→120kg = 95kg gain. If AHP = 1,600 IDR/kg gain, total AHP = 95 × 1,600 = IDR 152,000.
            This auto-adjusts for different target weights.
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Weight (kg)</label>
            <input
              type="number"
              value={fatteningParams.targetWeight}
              onChange={(e) => setFatteningParams(prev => ({ ...prev, targetWeight: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ADG (kg/day)</label>
            <input
              type="number"
              value={fatteningParams.adg}
              onChange={(e) => setFatteningParams(prev => ({ ...prev, adg: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">FCR</label>
            <input
              type="number"
              value={fatteningParams.fcr}
              onChange={(e) => setFatteningParams(prev => ({ ...prev, fcr: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mortality (%)</label>
            <input
              type="number"
              value={fatteningParams.mortality * 100}
              onChange={(e) => setFatteningParams(prev => ({ ...prev, mortality: parseFloat(e.target.value) / 100 || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feed Price (IDR/kg)</label>
            <input
              type="number"
              value={fatteningParams.feedPrice}
              onChange={(e) => setFatteningParams(prev => ({ ...prev, feedPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AHP (IDR/kg gain)</label>
            <input
              type="number"
              value={fatteningParams.ahpPerKg}
              onChange={(e) => setFatteningParams(prev => ({ ...prev, ahpPerKg: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labor (IDR/pig/day)</label>
            <input
              type="number"
              value={fatteningParams.laborPerPigPerDay}
              onChange={(e) => setFatteningParams(prev => ({ ...prev, laborPerPigPerDay: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Utilities (IDR/kg gain)</label>
            <input
              type="number"
              value={fatteningParams.utilitiesPerKg}
              onChange={(e) => setFatteningParams(prev => ({ ...prev, utilitiesPerKg: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="10"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-orange-50 rounded">
          <div className="text-sm font-medium text-orange-800">
            Duration: {formatNumber((fatteningParams.targetWeight - nurseryParams.targetWeight) / fatteningParams.adg)} days |
            Feed: {formatNumber((fatteningParams.targetWeight - nurseryParams.targetWeight) * fatteningParams.fcr, 1)} kg/pig |
            Survivors: {formatNumber((1 - fatteningParams.mortality) * 100, 1)}%
          </div>
        </div>
      </div>
    </div>
  );

  const SalesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">💰 Exit Points & Sales Strategy</h2>
          <button
            onClick={addExitPoint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} /> Add Exit Point
          </button>
        </div>

        <div className="space-y-4">
          {exitPoints.map((exit, idx) => (
            <div key={exit.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={exit.enabled}
                    onChange={(e) => updateExitPoint(exit.id, 'enabled', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <h3 className="font-semibold text-lg">Exit Point #{idx + 1}</h3>
                </div>
                <button
                  onClick={() => deleteExitPoint(exit.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Weight (kg)</label>
                  <input
                    type="number"
                    value={exit.targetWeight}
                    onChange={(e) => updateExitPoint(exit.id, 'targetWeight', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!exit.enabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allocation (%)</label>
                  <input
                    type="number"
                    value={exit.allocationPercent}
                    onChange={(e) => updateExitPoint(exit.id, 'allocationPercent', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!exit.enabled}
                    step="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Head (IDR)</label>
                  <input
                    type="number"
                    value={exit.sellingPricePerHead || ''}
                    onChange={(e) => updateExitPoint(exit.id, 'sellingPricePerHead', parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty for per kg"
                    disabled={!exit.enabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per kg (IDR/kg)</label>
                  <input
                    type="number"
                    value={exit.sellingPricePerKg || ''}
                    onChange={(e) => updateExitPoint(exit.id, 'sellingPricePerKg', parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty for per head"
                    disabled={!exit.enabled}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> Total allocation should equal 100%. Use either "Price per Head" OR "Price per kg", not both.
          </div>
        </div>
      </div>
    </div>
  );

  const TimelineTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📅 Monthly Production Timeline</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Month</th>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-right font-semibold">Piglets Weaned (6kg)</th>
                <th className="px-3 py-2 text-right font-semibold">Sales Events</th>
                <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                <th className="px-3 py-2 text-right font-semibold">COGS</th>
                <th className="px-3 py-2 text-right font-semibold">Gross Profit</th>
                <th className="px-3 py-2 text-right font-semibold">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {monthlyFinancials.slice(0, 24).map((month, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2">M{month.month + 1}</td>
                  <td className="px-3 py-2">{formatDate(month.date)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(month.pigletsWeaned6kg)}</td>
                  <td className="px-3 py-2 text-right">{month.exitSales.length}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(month.totalRevenue / 1000000, 1)}M</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(month.totalCOGS / 1000000, 1)}M</td>
                  <td className={`px-3 py-2 text-right font-medium ${month.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(month.grossProfit / 1000000, 1)}M
                  </td>
                  <td className="px-3 py-2 text-right">{formatNumber(month.margin * 100, 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const SummaryTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Total Revenue</span>
            <DollarSign size={24} />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue / 1000000, 1)}M</div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Total COGS</span>
            <TrendingUp size={24} />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalCOGS / 1000000, 1)}M</div>
        </div>

        <div className={`bg-gradient-to-br ${summary.totalProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-gray-500 to-gray-600'} rounded-lg shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Gross Profit</span>
            <BarChart size={24} />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalProfit / 1000000, 1)}M</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Gross Margin</span>
            <PieChart size={24} />
          </div>
          <div className="text-2xl font-bold">{formatNumber(summary.margin * 100, 1)}%</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Financial Breakdown</h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
            <span className="font-medium">Total Revenue</span>
            <span className="text-xl font-bold text-green-600">{formatCurrency(summary.totalRevenue / 1000000, 2)} Million</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="font-medium">Total COGS</span>
            <span className="text-xl font-bold text-red-600">{formatCurrency(summary.totalCOGS / 1000000, 2)} Million</span>
          </div>

          <div className="h-px bg-gray-300"></div>

          <div className={`flex justify-between items-center p-3 ${summary.totalProfit >= 0 ? 'bg-blue-50' : 'bg-gray-50'} rounded`}>
            <span className="font-bold text-lg">Gross Profit</span>
            <span className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-blue-600' : 'text-gray-600'}`}>
              {formatCurrency(summary.totalProfit / 1000000, 2)} Million
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
            <span className="font-bold text-lg">Gross Margin</span>
            <span className="text-2xl font-bold text-purple-600">{formatNumber(summary.margin * 100, 2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const ScenariosTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">💾 Save Current Scenario</h2>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter scenario name..."
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={saveScenario}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Save size={18} /> Save
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📚 Saved Scenarios ({scenarios.length})</h2>

        {scenarios.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No saved scenarios yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map(scenario => (
              <div key={scenario.id} className="border rounded-lg p-4 hover:border-blue-400">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{scenario.name}</h3>
                    <p className="text-sm text-gray-500">{formatDate(scenario.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => deleteScenario(scenario.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cohorts:</span>
                    <span className="font-medium">{scenario.cohorts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium text-green-600">{formatCurrency(scenario.summary.totalRevenue / 1000000, 1)}M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className={`font-medium ${scenario.summary.totalProfit >= 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                      {formatCurrency(scenario.summary.totalProfit / 1000000, 1)}M
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Margin:</span>
                    <span className="font-medium">{formatNumber(scenario.summary.margin * 100, 1)}%</span>
                  </div>
                </div>

                <button
                  onClick={() => loadScenario(scenario)}
                  className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2"
                >
                  <Copy size={16} /> Load Scenario
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-green-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <button
                  onClick={onBack}
                  className="mr-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                  title="Back to Menu"
                >
                  <ArrowLeft size={24} />
                </button>
                🐷 Pig Farm Production Cost Calculator
              </h1>
              <p className="text-green-100 text-sm mt-1">Comprehensive breeding to finishing analysis</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2"
            >
              <FileDown size={18} /> Export
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'setup', label: 'Setup', icon: Settings },
              { id: 'growth', label: 'Growth Parameters', icon: TrendingUp },
              { id: 'sales', label: 'Sales Strategy', icon: DollarSign },
              { id: 'timeline', label: 'Timeline', icon: Calendar },
              { id: 'summary', label: 'Summary', icon: BarChart },
              { id: 'scenarios', label: 'Scenarios', icon: Save },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-green-600 hover:border-green-300'
                  }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'setup' && <SetupTab />}
        {activeTab === 'growth' && <GrowthTab />}
        {activeTab === 'sales' && <SalesTab />}
        {activeTab === 'timeline' && <TimelineTab />}
        {activeTab === 'summary' && <SummaryTab />}
        {activeTab === 'scenarios' && <ScenariosTab />}
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          nav, header button { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
