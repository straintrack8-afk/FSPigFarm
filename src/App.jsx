import { Save, FileDown, Trash2, Copy, BarChart3, Calculator, FileText, ChevronDown, ChevronUp, ArrowLeftRight, PiggyBank, TrendingUp, Factory, ArrowRight, Languages } from 'lucide-react';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { translations } from './translations';



// DEFAULT VALUES
const defaultBreedingInputs = {
  farmName: 'My Breeding Farm', location: 'Vietnam', farmCapacity: 5000, projectDuration: 10,
  landCost: 0, landLife: 45, buildingCost: 346082, buildingLife: 20, machineryCost: 78649, machineryLife: 15, otherEquipmentCost: 25874, otherEquipmentLife: 15,
  bankLoanPercent: 0.70, interestRate: 0.11, loanTenure: 5,
  farrowingRateY1: 0.74, bornAliveY1: 10, preWeaningMortalityY1: 0.07, litterIndexY1: 2.57,
  farrowingRateY2: 0.90, bornAliveY2: 13, preWeaningMortalityY2: 0.10, litterIndexY2: 2.50,
  sowMortality: 0.10, cullingRate: 0.45, y1RampupFactor: 0.55,
  giltCost: 6990, giltCostInc: 0.015, feedCostPerKg: 10967, feedCostInc: 0.01, feedConsumption: 2.62, ahpCost: 91, ahpCostInc: 0.01, overheadCost: 558, overheadCostInc: 0.01, rentalFee: 0,
  pigletPrice: 1200, culledSowPrice: 34300, avgCulledSowWeight: 120,
  discountRate: 0.12, taxRate: 0.20, opexPercent: 0.01, workingCapitalPercent: 0.05,
};

const defaultFatteningInputs = {
  farmName: 'My Fattening Farm', location: 'Vietnam', farmCapacity: 8000, batchesPerYear: 2.25, projectDuration: 10,
  landCost: 0, landLife: 40, buildingCost: 346082, buildingLife: 20, machineryCost: 78649, machineryLife: 15, utilitiesCost: 121, utilitiesLife: 15, otherEquipmentCost: 25753, otherEquipmentLife: 15,
  bankLoanPercent: 0.70, interestRate: 0.11, loanTenure: 5,
  weightIn: 6, targetABW: 120, mortality: 0.05, cullingRate: 0.007, fcr: 2.6, age: 160,
  y1MortalityAdj: 1.5, y1FcrAdj: 1.1, y1CapacityUtil: 0.70,
  pigletCost: 1295, pigletCostInc: 0.01, feedCostPerKg: 8200, feedCostInc: 0.02, ahpPerKg: 1600, ahpCostInc: 0.02, ovhPerKg: 6000, ovhCostInc: 0.02, rentalFee: 0,
  mainPigPrice: 45000, byProductPrice: 18000, cullingWeight: 30,
  discountRate: 0.12, taxRate: 0.20, opexPercent: 0.025, workingCapitalPercent: 0.05,
};

const defaultIntegratedInputs = {
  farmName: 'My Integrated Farm', location: 'Vietnam', projectDuration: 10,
  breedingSowCapacity: 5000,
  breedingLandCost: 0, breedingLandLife: 45, breedingBuildingCost: 346082, breedingBuildingLife: 20, breedingMachineryCost: 78649, breedingMachineryLife: 15, breedingOtherCost: 25874, breedingOtherLife: 15,
  farrowingRateY1: 0.74, bornAliveY1: 10, preWeaningMortalityY1: 0.07, litterIndexY1: 2.57,
  farrowingRateY2: 0.90, bornAliveY2: 13, preWeaningMortalityY2: 0.10, litterIndexY2: 2.50,
  sowMortality: 0.10, sowCullingRate: 0.45, y1RampupFactor: 0.55,
  giltCost: 6990, giltCostInc: 0.015, sowFeedCostPerKg: 10967, sowFeedCostInc: 0.01, sowFeedConsumption: 2.62, breedingAhpCost: 91, breedingAhpCostInc: 0.01, breedingOvhCost: 558, breedingOvhCostInc: 0.01,
  culledSowPrice: 34300, avgCulledSowWeight: 120,
  fatteningCapacityMode: 'auto', fatteningManualCapacity: 100000,
  fatteningLandCost: 0, fatteningLandLife: 40, fatteningBuildingCost: 400000, fatteningBuildingLife: 20, fatteningMachineryCost: 100000, fatteningMachineryLife: 15, fatteningUtilitiesCost: 200, fatteningUtilitiesLife: 15, fatteningOtherCost: 50000, fatteningOtherLife: 15,
  weanWeight: 7, targetABW: 120, fatteningMortality: 0.05, fatteningCullingRate: 0.007, fatteningFcr: 2.6, fatteningAge: 160,
  y1FatMortalityAdj: 1.3, y1FatFcrAdj: 1.08,
  fatteningFeedCostPerKg: 8200, fatteningFeedCostInc: 0.02, fatteningAhpPerKg: 1600, fatteningAhpCostInc: 0.02, fatteningOvhPerKg: 6000, fatteningOvhCostInc: 0.02,
  finisherPrice: 45000, byProductPrice: 18000, cullingWeight: 30, externalPigletPrice: 1200,
  bankLoanPercent: 0.70, interestRate: 0.11, loanTenure: 5,
  discountRate: 0.12, taxRate: 0.20, opexPercent: 0.02, workingCapitalPercent: 0.05, breedingRentalFee: 0, fatteningRentalFee: 0,
};

// CALCULATION ENGINES
const calculateBreedingProjection = (inputs) => {
  const { farmCapacity, projectDuration, landCost, landLife, buildingCost, buildingLife, machineryCost, machineryLife, otherEquipmentCost, otherEquipmentLife, bankLoanPercent, interestRate, loanTenure, farrowingRateY1, bornAliveY1, preWeaningMortalityY1, litterIndexY1, farrowingRateY2, bornAliveY2, preWeaningMortalityY2, litterIndexY2, cullingRate, y1RampupFactor, giltCost, giltCostInc, feedCostPerKg, feedCostInc, feedConsumption, ahpCost, ahpCostInc, overheadCost, overheadCostInc, rentalFee, pigletPrice, culledSowPrice, avgCulledSowWeight, discountRate, taxRate, opexPercent, workingCapitalPercent } = inputs;

  const totalCapex = landCost + buildingCost + machineryCost + otherEquipmentCost;
  const bankLoanAmount = totalCapex * bankLoanPercent;
  const equityAmount = totalCapex - bankLoanAmount;
  const annualPrincipalPayment = bankLoanAmount / loanTenure;
  const annualDepreciation = (landLife > 0 ? landCost / landLife : 0) + (buildingLife > 0 ? buildingCost / buildingLife : 0) + (machineryLife > 0 ? machineryCost / machineryLife : 0) + (otherEquipmentLife > 0 ? otherEquipmentCost / otherEquipmentLife : 0);

  const weanPerSowY1 = farrowingRateY1 * bornAliveY1 * (1 - preWeaningMortalityY1) * litterIndexY1;
  const weanPerSowY2 = farrowingRateY2 * bornAliveY2 * (1 - preWeaningMortalityY2) * litterIndexY2;

  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    const rampup = (m / 12) * y1RampupFactor * 2;
    const avgSowPop = farmCapacity * rampup * (m / 12);
    monthly.push({ month: m, avgSowPop, pigletsWeaned: avgSowPop * weanPerSowY1 / 12, culledSows: avgSowPop * cullingRate / 12 });
  }

  const yearly = [];
  let cumulativeFCF = 0;
  for (let y = 1; y <= projectDuration; y++) {
    const isY1 = y === 1;
    const avgSowPop = isY1 ? monthly.reduce((s, m) => s + m.avgSowPop, 0) / 12 : farmCapacity;
    const pigletsWeaned = isY1 ? monthly.reduce((s, m) => s + m.pigletsWeaned, 0) : farmCapacity * weanPerSowY2;
    const culledSows = isY1 ? monthly.reduce((s, m) => s + m.culledSows, 0) : farmCapacity * cullingRate;
    const esc = (base, inc) => base * Math.pow(1 + inc, y - 1);

    const totalRevenue = pigletsWeaned * pigletPrice / 1000 + culledSows * culledSowPrice * avgCulledSowWeight / 1000000;
    const totalCogs = culledSows * esc(giltCost, giltCostInc) / 1000 + avgSowPop * feedConsumption * 365 * esc(feedCostPerKg, feedCostInc) / 1000000 + avgSowPop * esc(ahpCost, ahpCostInc) / 1000 + avgSowPop * esc(overheadCost, overheadCostInc) / 1000 + rentalFee * 12 + annualDepreciation;
    const grossProfit = totalRevenue - totalCogs;
    const ebit = grossProfit - totalRevenue * opexPercent;
    const remainingLoan = Math.max(0, bankLoanAmount - annualPrincipalPayment * (y - 1));
    const interestExpense = remainingLoan * interestRate;
    const ebt = ebit - interestExpense;
    const netProfit = ebt - (ebt > 0 ? ebt * taxRate : 0);
    const ebitda = ebit + annualDepreciation;
    const wcChange = y === 1 ? totalCogs * workingCapitalPercent : (totalCogs - (yearly[y - 2]?.totalCogs || 0)) * workingCapitalPercent;
    const fcf = netProfit + annualDepreciation + interestExpense - wcChange - (y === 1 ? totalCapex : 0) + (y === projectDuration ? totalCapex * 0.1 : 0);
    cumulativeFCF += fcf;
    yearly.push({ year: y, avgSowPop, pigletsWeaned, culledSows, totalRevenue, totalCogs, grossProfit, gpMargin: totalRevenue > 0 ? grossProfit / totalRevenue : 0, ebit, ebitda, interestExpense, netProfit, npMargin: totalRevenue > 0 ? netProfit / totalRevenue : 0, fcf, cumulativeFCF, pvFCF: fcf / Math.pow(1 + discountRate, y) });
  }

  const npv = yearly.reduce((s, y) => s + y.pvFCF, 0);
  let irr = 0.1; for (let i = 0; i < 100; i++) { let npvC = 0, npvD = 0; yearly.forEach((y, idx) => { npvC += y.fcf / Math.pow(1 + irr, idx + 1); npvD -= (idx + 1) * y.fcf / Math.pow(1 + irr, idx + 2); }); if (Math.abs(npvD) < 0.0001) break; const nIrr = irr - npvC / npvD; if (Math.abs(nIrr - irr) < 0.0001) break; irr = nIrr; }
  let payback = projectDuration; for (let i = 0; i < yearly.length; i++) { if (yearly[i].cumulativeFCF >= 0) { payback = i === 0 ? 1 : i + Math.abs(yearly[i - 1].cumulativeFCF) / yearly[i].fcf; break; } }

  return { capex: { totalCapex, bankLoanAmount, equityAmount, annualDepreciation }, kpis: { weanPerSowY1, weanPerSowY2 }, monthly, yearly, summary: { npv, irr: isNaN(irr) || !isFinite(irr) ? 0 : irr, paybackPeriod: payback, roiYear1: yearly[0] ? yearly[0].netProfit / totalCapex : 0, totalNetProfit: yearly.reduce((s, y) => s + y.netProfit, 0), totalRevenue: yearly.reduce((s, y) => s + y.totalRevenue, 0) } };
};

const calculateFatteningProjection = (inputs) => {
  const { farmCapacity, batchesPerYear, projectDuration, landCost, landLife, buildingCost, buildingLife, machineryCost, machineryLife, utilitiesCost, utilitiesLife, otherEquipmentCost, otherEquipmentLife, bankLoanPercent, interestRate, loanTenure, weightIn, targetABW, mortality, cullingRate, fcr, y1MortalityAdj, y1FcrAdj, y1CapacityUtil, pigletCost, pigletCostInc, feedCostPerKg, feedCostInc, ahpPerKg, ahpCostInc, ovhPerKg, ovhCostInc, rentalFee, mainPigPrice, byProductPrice, cullingWeight, discountRate, taxRate, opexPercent, workingCapitalPercent } = inputs;

  const totalCapex = landCost + buildingCost + machineryCost + utilitiesCost + otherEquipmentCost;
  const bankLoanAmount = totalCapex * bankLoanPercent;
  const equityAmount = totalCapex - bankLoanAmount;
  const annualPrincipalPayment = bankLoanAmount / loanTenure;
  const annualDepreciation = (landLife > 0 ? landCost / landLife : 0) + (buildingLife > 0 ? buildingCost / buildingLife : 0) + (machineryLife > 0 ? machineryCost / machineryLife : 0) + (utilitiesLife > 0 ? utilitiesCost / utilitiesLife : 0) + (otherEquipmentLife > 0 ? otherEquipmentCost / otherEquipmentLife : 0);
  const weightGain = targetABW - weightIn;
  const survivalRate = 1 - mortality - cullingRate;

  const yearly = [];
  let cumulativeFCF = 0;
  for (let y = 1; y <= projectDuration; y++) {
    const isY1 = y === 1;
    const adjMort = isY1 ? mortality * y1MortalityAdj : mortality;
    const adjFcr = isY1 ? fcr * y1FcrAdj : fcr;
    const adjSurv = 1 - adjMort - cullingRate;
    const esc = (base, inc) => base * Math.pow(1 + inc, y - 1);

    const pigsIn = farmCapacity * batchesPerYear * (isY1 ? y1CapacityUtil : 1);
    const mainPigsOut = pigsIn * adjSurv;
    const culledPigs = pigsIn * cullingRate;
    const mainPigWeight = mainPigsOut * targetABW;
    const culledPigWeight = culledPigs * cullingWeight;
    const totalWeightGain = mainPigWeight + culledPigWeight - pigsIn * weightIn;
    const feedConsumed = pigsIn * weightGain * adjFcr;

    const totalRevenue = mainPigWeight * mainPigPrice / 1000000 + culledPigWeight * byProductPrice / 1000000;
    const totalCogs = pigsIn * esc(pigletCost, pigletCostInc) / 1000 + feedConsumed * esc(feedCostPerKg, feedCostInc) / 1000000 + totalWeightGain * esc(ahpPerKg, ahpCostInc) / 1000000 + totalWeightGain * esc(ovhPerKg, ovhCostInc) / 1000000 + rentalFee * 12 + annualDepreciation;
    const grossProfit = totalRevenue - totalCogs;
    const ebit = grossProfit - totalRevenue * opexPercent;
    const remainingLoan = Math.max(0, bankLoanAmount - annualPrincipalPayment * (y - 1));
    const interestExpense = remainingLoan * interestRate;
    const ebt = ebit - interestExpense;
    const netProfit = ebt - (ebt > 0 ? ebt * taxRate : 0);
    const ebitda = ebit + annualDepreciation;
    const wcChange = y === 1 ? totalCogs * workingCapitalPercent : (totalCogs - (yearly[y - 2]?.totalCogs || 0)) * workingCapitalPercent;
    const fcfVal = netProfit + annualDepreciation + interestExpense - wcChange - (y === 1 ? totalCapex : 0) + (y === projectDuration ? totalCapex * 0.1 : 0);
    cumulativeFCF += fcfVal;
    yearly.push({ year: y, pigsIn, mainPigsOut, totalRevenue, totalCogs, grossProfit, gpMargin: totalRevenue > 0 ? grossProfit / totalRevenue : 0, ebit, ebitda, interestExpense, netProfit, npMargin: totalRevenue > 0 ? netProfit / totalRevenue : 0, fcf: fcfVal, cumulativeFCF, pvFCF: fcfVal / Math.pow(1 + discountRate, y) });
  }

  const npv = yearly.reduce((s, y) => s + y.pvFCF, 0);
  let irr = 0.1; for (let i = 0; i < 100; i++) { let npvC = 0, npvD = 0; yearly.forEach((y, idx) => { npvC += y.fcf / Math.pow(1 + irr, idx + 1); npvD -= (idx + 1) * y.fcf / Math.pow(1 + irr, idx + 2); }); if (Math.abs(npvD) < 0.0001) break; const nIrr = irr - npvC / npvD; if (Math.abs(nIrr - irr) < 0.0001) break; irr = nIrr; }
  let payback = projectDuration; for (let i = 0; i < yearly.length; i++) { if (yearly[i].cumulativeFCF >= 0) { payback = i === 0 ? 1 : i + Math.abs(yearly[i - 1].cumulativeFCF) / yearly[i].fcf; break; } }

  return { capex: { totalCapex, bankLoanAmount, equityAmount, annualDepreciation }, kpis: { weightGain, survivalRate }, yearly, summary: { npv, irr: isNaN(irr) || !isFinite(irr) ? 0 : irr, paybackPeriod: payback, roiYear1: yearly[0] ? yearly[0].netProfit / totalCapex : 0, totalNetProfit: yearly.reduce((s, y) => s + y.netProfit, 0), totalRevenue: yearly.reduce((s, y) => s + y.totalRevenue, 0) } };
};

const calculateIntegratedProjection = (inputs) => {
  const { projectDuration, breedingSowCapacity, breedingLandCost, breedingLandLife, breedingBuildingCost, breedingBuildingLife, breedingMachineryCost, breedingMachineryLife, breedingOtherCost, breedingOtherLife, farrowingRateY1, bornAliveY1, preWeaningMortalityY1, litterIndexY1, farrowingRateY2, bornAliveY2, preWeaningMortalityY2, litterIndexY2, sowCullingRate, y1RampupFactor, giltCost, giltCostInc, sowFeedCostPerKg, sowFeedCostInc, sowFeedConsumption, breedingAhpCost, breedingAhpCostInc, breedingOvhCost, breedingOvhCostInc, culledSowPrice, avgCulledSowWeight, fatteningCapacityMode, fatteningManualCapacity, fatteningLandCost, fatteningLandLife, fatteningBuildingCost, fatteningBuildingLife, fatteningMachineryCost, fatteningMachineryLife, fatteningUtilitiesCost, fatteningUtilitiesLife, fatteningOtherCost, fatteningOtherLife, weanWeight, targetABW, fatteningMortality, fatteningCullingRate, fatteningFcr, y1FatMortalityAdj, y1FatFcrAdj, fatteningFeedCostPerKg, fatteningFeedCostInc, fatteningAhpPerKg, fatteningAhpCostInc, fatteningOvhPerKg, fatteningOvhCostInc, finisherPrice, byProductPrice, cullingWeight, externalPigletPrice, bankLoanPercent, interestRate, loanTenure, discountRate, taxRate, opexPercent, workingCapitalPercent, breedingRentalFee, fatteningRentalFee } = inputs;

  const weanPerSowY1 = farrowingRateY1 * bornAliveY1 * (1 - preWeaningMortalityY1) * litterIndexY1;
  const weanPerSowY2 = farrowingRateY2 * bornAliveY2 * (1 - preWeaningMortalityY2) * litterIndexY2;

  const breedingCapex = breedingLandCost + breedingBuildingCost + breedingMachineryCost + breedingOtherCost;
  const breedingDepr = (breedingLandLife > 0 ? breedingLandCost / breedingLandLife : 0) + (breedingBuildingLife > 0 ? breedingBuildingCost / breedingBuildingLife : 0) + (breedingMachineryLife > 0 ? breedingMachineryCost / breedingMachineryLife : 0) + (breedingOtherLife > 0 ? breedingOtherCost / breedingOtherLife : 0);
  const fatteningCapex = fatteningLandCost + fatteningBuildingCost + fatteningMachineryCost + fatteningUtilitiesCost + fatteningOtherCost;
  const fatteningDepr = (fatteningLandLife > 0 ? fatteningLandCost / fatteningLandLife : 0) + (fatteningBuildingLife > 0 ? fatteningBuildingCost / fatteningBuildingLife : 0) + (fatteningMachineryLife > 0 ? fatteningMachineryCost / fatteningMachineryLife : 0) + (fatteningUtilitiesLife > 0 ? fatteningUtilitiesCost / fatteningUtilitiesLife : 0) + (fatteningOtherLife > 0 ? fatteningOtherCost / fatteningOtherLife : 0);
  const totalCapex = breedingCapex + fatteningCapex;
  const totalDepreciation = breedingDepr + fatteningDepr;
  const bankLoanAmount = totalCapex * bankLoanPercent;
  const equityAmount = totalCapex - bankLoanAmount;
  const annualPrincipalPayment = bankLoanAmount / loanTenure;
  const fatWeightGain = targetABW - weanWeight;
  const fatSurvivalRate = 1 - fatteningMortality - fatteningCullingRate;

  const yearly = [];
  let cumulativeFCF = 0;
  for (let y = 1; y <= projectDuration; y++) {
    const isY1 = y === 1;
    const esc = (base, inc) => base * Math.pow(1 + inc, y - 1);

    // Breeding calc
    let avgSowPop, pigletsWeaned, culledSows;
    if (isY1) { let tS = 0, tP = 0, tC = 0; for (let m = 1; m <= 12; m++) { const r = (m / 12) * y1RampupFactor * 2; const mS = breedingSowCapacity * r * (m / 12); tS += mS; tP += mS * weanPerSowY1 / 12; tC += mS * sowCullingRate / 12; } avgSowPop = tS / 12; pigletsWeaned = tP; culledSows = tC; }
    else { avgSowPop = breedingSowCapacity; pigletsWeaned = breedingSowCapacity * weanPerSowY2; culledSows = breedingSowCapacity * sowCullingRate; }

    const breedingCogs = culledSows * esc(giltCost, giltCostInc) / 1000 + avgSowPop * sowFeedConsumption * 365 * esc(sowFeedCostPerKg, sowFeedCostInc) / 1000000 + avgSowPop * esc(breedingAhpCost, breedingAhpCostInc) / 1000 + avgSowPop * esc(breedingOvhCost, breedingOvhCostInc) / 1000 + breedingRentalFee * 12 + breedingDepr;
    const culledSowRevenue = culledSows * culledSowPrice * avgCulledSowWeight / 1000000;

    // Fattening calc
    const fatCap = fatteningCapacityMode === 'auto' ? pigletsWeaned : fatteningManualCapacity;
    const pigletsToFat = Math.min(pigletsWeaned, fatCap);
    const pigletsExternal = pigletsWeaned - pigletsToFat;
    const adjFatMort = isY1 ? fatteningMortality * y1FatMortalityAdj : fatteningMortality;
    const adjFatFcr = isY1 ? fatteningFcr * y1FatFcrAdj : fatteningFcr;
    const adjFatSurv = 1 - adjFatMort - fatteningCullingRate;

    const finisherPigsOut = pigletsToFat * adjFatSurv;
    const fatCulledPigs = pigletsToFat * fatteningCullingRate;
    const finisherWeight = finisherPigsOut * targetABW;
    const fatCulledWeight = fatCulledPigs * cullingWeight;
    const totalWeightGain = finisherWeight + fatCulledWeight - pigletsToFat * weanWeight;
    const fatFeedConsumed = pigletsToFat * fatWeightGain * adjFatFcr;

    const fatteningCogs = fatFeedConsumed * esc(fatteningFeedCostPerKg, fatteningFeedCostInc) / 1000000 + totalWeightGain * esc(fatteningAhpPerKg, fatteningAhpCostInc) / 1000000 + totalWeightGain * esc(fatteningOvhPerKg, fatteningOvhCostInc) / 1000000 + fatteningRentalFee * 12 + fatteningDepr;

    // Combined P&L
    const totalRevenue = finisherWeight * finisherPrice / 1000000 + fatCulledWeight * byProductPrice / 1000000 + culledSowRevenue + pigletsExternal * externalPigletPrice / 1000;
    const totalCogs = breedingCogs + fatteningCogs;
    const grossProfit = totalRevenue - totalCogs;
    const ebit = grossProfit - totalRevenue * opexPercent;
    const remainingLoan = Math.max(0, bankLoanAmount - annualPrincipalPayment * (y - 1));
    const interestExpense = remainingLoan * interestRate;
    const ebt = ebit - interestExpense;
    const netProfit = ebt - (ebt > 0 ? ebt * taxRate : 0);
    const ebitda = ebit + totalDepreciation;
    const wcChange = y === 1 ? totalCogs * workingCapitalPercent : (totalCogs - (yearly[y - 2]?.totalCogs || 0)) * workingCapitalPercent;
    const fcf = netProfit + totalDepreciation + interestExpense - wcChange - (y === 1 ? totalCapex : 0) + (y === projectDuration ? totalCapex * 0.1 : 0);
    cumulativeFCF += fcf;

    yearly.push({ year: y, avgSowPop, pigletsWeaned, culledSows, pigletsToFattening: pigletsToFat, pigletsToExternalSale: pigletsExternal, finisherPigsOut, finisherWeight, breedingCogs, fatteningCogs, totalRevenue, totalCogs, grossProfit, gpMargin: totalRevenue > 0 ? grossProfit / totalRevenue : 0, ebit, ebitda, interestExpense, netProfit, npMargin: totalRevenue > 0 ? netProfit / totalRevenue : 0, depreciation: totalDepreciation, fcf, cumulativeFCF, pvFCF: fcf / Math.pow(1 + discountRate, y) });
  }

  const npv = yearly.reduce((s, y) => s + y.pvFCF, 0);
  let irr = 0.1; for (let i = 0; i < 100; i++) { let npvC = 0, npvD = 0; yearly.forEach((y, idx) => { npvC += y.fcf / Math.pow(1 + irr, idx + 1); npvD -= (idx + 1) * y.fcf / Math.pow(1 + irr, idx + 2); }); if (Math.abs(npvD) < 0.0001) break; const nIrr = irr - npvC / npvD; if (Math.abs(nIrr - irr) < 0.0001) break; irr = nIrr; }
  let payback = projectDuration; for (let i = 0; i < yearly.length; i++) { if (yearly[i].cumulativeFCF >= 0) { payback = i === 0 ? 1 : i + Math.abs(yearly[i - 1].cumulativeFCF) / yearly[i].fcf; break; } }

  return { capex: { totalCapex, breedingCapex, fatteningCapex, bankLoanAmount, equityAmount, totalDepreciation }, kpis: { weanPerSowY1, weanPerSowY2, fatWeightGain, fatSurvivalRate }, yearly, summary: { npv, irr: isNaN(irr) || !isFinite(irr) ? 0 : irr, paybackPeriod: payback, roiYear1: yearly[0] ? yearly[0].netProfit / totalCapex : 0, totalNetProfit: yearly.reduce((s, y) => s + y.netProfit, 0), totalRevenue: yearly.reduce((s, y) => s + y.totalRevenue, 0) } };
};

// UTILITIES
const formatNumber = (num, dec = 0) => { if (num === null || num === undefined || isNaN(num)) return '-'; return new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(num); };
const formatPercent = (num) => { if (num === null || num === undefined || isNaN(num)) return '-'; return (num * 100).toFixed(2) + '%'; };

// COMPONENTS
const InputField = React.memo(({ label, value, onChange, type = 'number', suffix, step = 1, small }) => (
  <div className={small ? "mb-2" : "mb-3"}>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    <div className="flex items-center">
      <input
        key={label}
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        step={step}
        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${small ? 'py-1' : ''}`}
      />
      {suffix && <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">{suffix}</span>}
    </div>
  </div>
));

const SectionHeader = React.memo(({ title, icon: Icon, expanded, onToggle, color = 'emerald' }) => {
  const colors = { emerald: 'from-emerald-600 to-emerald-700', orange: 'from-orange-500 to-orange-600', purple: 'from-purple-600 to-purple-700', indigo: 'from-indigo-600 to-indigo-700', blue: 'from-blue-600 to-blue-700' };
  return (
    <div className={`flex items-center justify-between bg-gradient-to-r ${colors[color]} text-white px-4 py-2 rounded-t cursor-pointer`} onClick={onToggle}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} />}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      {expanded !== undefined && (expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
    </div>
  );
});

const SummaryCard = ({ title, value, subtitle, positive, icon: Icon }) => (
  <div className={`bg-white rounded-xl shadow-sm border-2 p-4 ${positive === true ? 'border-emerald-400' : positive === false ? 'border-red-400' : 'border-gray-200'}`}>
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs text-gray-500 mb-1">{title}</div>
        <div className={`text-xl font-bold ${positive === true ? 'text-emerald-600' : positive === false ? 'text-red-600' : 'text-gray-800'}`}>{value}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      </div>
      {Icon && <Icon className="text-gray-300" size={24} />}
    </div>
  </div>
);

// MAIN APP
function FarmFSCalculator() {
  const [farmType, setFarmType] = useState('breeding');
  const [breedingInputs, setBreedingInputs] = useState(defaultBreedingInputs);
  const [fatteningInputs, setFatteningInputs] = useState(defaultFatteningInputs);
  const [integratedInputs, setIntegratedInputs] = useState(defaultIntegratedInputs);
  const [activeTab, setActiveTab] = useState('entry');
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [expandedSections, setExpandedSections] = useState({ farm: true, capex: true, financing: true, production: true, costs: true, prices: true, breedingCapex: true, breedingKpi: true, breedingCost: true, fatteningCapex: true, fatteningKpi: true, fatteningCost: true, other: true });
  const [language, setLanguage] = useState(() => localStorage.getItem('farmfs-language') || 'id');

  const projection = useMemo(() => { if (farmType === 'fattening') return calculateFatteningProjection(fatteningInputs); if (farmType === 'integrated') return calculateIntegratedProjection(integratedInputs); return calculateBreedingProjection(breedingInputs); }, [farmType, breedingInputs, fatteningInputs, integratedInputs]);
  const inputs = farmType === 'fattening' ? fatteningInputs : farmType === 'integrated' ? integratedInputs : breedingInputs;


  useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem('farm-fs-v3');
        if (stored) setSavedScenarios(JSON.parse(stored));
      } catch { }
    };
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem('farmfs-language', language);
  }, [language]);

  const saveToStorage = async (s) => {
    try {
      localStorage.setItem('farm-fs-v3', JSON.stringify(s));
    } catch { }
  };

  const toggleSection = (s) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  // Memoized update functions to prevent InputField re-creation
  const updateBreedingInput = useCallback((key, value) => {
    setBreedingInputs(p => ({ ...p, [key]: typeof value === 'function' ? value(p[key]) : value }));
  }, []);

  const updateFatteningInput = useCallback((key, value) => {
    setFatteningInputs(p => ({ ...p, [key]: typeof value === 'function' ? value(p[key]) : value }));
  }, []);

  const updateIntegratedInput = useCallback((key, value) => {
    setIntegratedInputs(p => ({ ...p, [key]: typeof value === 'function' ? value(p[key]) : value }));
  }, []);

  const saveScenario = () => { if (!scenarioName.trim()) return alert('Enter scenario name'); const n = { id: Date.now(), name: scenarioName, farmType, inputs: farmType === 'fattening' ? { ...fatteningInputs } : farmType === 'integrated' ? { ...integratedInputs } : { ...breedingInputs }, summary: projection.summary, createdAt: new Date().toISOString() }; const u = [...savedScenarios, n]; setSavedScenarios(u); saveToStorage(u); setScenarioName(''); alert(`Saved!`); };
  const loadScenario = (s) => { setFarmType(s.farmType); if (s.farmType === 'fattening') setFatteningInputs(s.inputs); else if (s.farmType === 'integrated') setIntegratedInputs(s.inputs); else setBreedingInputs(s.inputs); setActiveTab('entry'); };
  const deleteScenario = (id) => { if (confirm('Delete?')) { const u = savedScenarios.filter(s => s.id !== id); setSavedScenarios(u); saveToStorage(u); } };
  const resetToDefaults = () => { if (confirm('Reset?')) { if (farmType === 'fattening') setFatteningInputs(defaultFatteningInputs); else if (farmType === 'integrated') setIntegratedInputs(defaultIntegratedInputs); else setBreedingInputs(defaultBreedingInputs); } };
  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'id' : 'en');

  const t = translations[language];
  const themeGradient = farmType === 'fattening' ? 'from-orange-600 to-orange-700' : farmType === 'integrated' ? 'from-indigo-700 to-purple-800' : 'from-emerald-700 to-emerald-800';
  const farmTypeColors = { breeding: 'bg-emerald-100 text-emerald-700', fattening: 'bg-orange-100 text-orange-700', integrated: 'bg-indigo-100 text-indigo-700' };
  const farmTypeLabels = { breeding: t.farmTypes.breeding, fattening: t.farmTypes.fattening, integrated: t.farmTypes.integrated };

  // DATA ENTRY TAB - render memoized JSX directly based on farmType

  const BreedingDataEntry = useMemo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`A. ${t.sections.farmInfo}`} icon={Factory} expanded={expandedSections.farm} onToggle={() => toggleSection('farm')} />
        {expandedSections.farm && (<div className="p-4"><InputField label={t.fields.farmName} value={breedingInputs.farmName} onChange={(v) => updateBreedingInput('farmName', v)} type="text" /><InputField label={t.fields.location} value={breedingInputs.location} onChange={(v) => updateBreedingInput('location', v)} type="text" /><InputField label={t.fields.farmCapacity} value={breedingInputs.farmCapacity} onChange={(v) => updateBreedingInput('farmCapacity', v)} suffix={t.units.head} /><InputField label={t.fields.projectDuration} value={breedingInputs.projectDuration} onChange={(v) => updateBreedingInput('projectDuration', v)} suffix={t.units.years} /></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`B. ${t.sections.capex}`} icon={Calculator} expanded={expandedSections.capex} onToggle={() => toggleSection('capex')} color="orange" />
        {expandedSections.capex && (<div className="p-4"><div className="grid grid-cols-2 gap-2"><InputField label={t.fields.land} value={breedingInputs.landCost} onChange={(v) => updateBreedingInput('landCost', v)} /><InputField label={t.fields.life} value={breedingInputs.landLife} onChange={(v) => updateBreedingInput('landLife', v)} suffix={t.units.year} /><InputField label={t.fields.building} value={breedingInputs.buildingCost} onChange={(v) => updateBreedingInput('buildingCost', v)} /><InputField label={t.fields.life} value={breedingInputs.buildingLife} onChange={(v) => updateBreedingInput('buildingLife', v)} suffix={t.units.year} /><InputField label={t.fields.machinery} value={breedingInputs.machineryCost} onChange={(v) => updateBreedingInput('machineryCost', v)} /><InputField label={t.fields.life} value={breedingInputs.machineryLife} onChange={(v) => updateBreedingInput('machineryLife', v)} suffix={t.units.year} /></div><div className="mt-3 p-2 bg-emerald-50 rounded text-sm font-semibold text-emerald-800">{t.fields.totalCapex} {formatNumber(projection.capex.totalCapex)} {t.units.million}</div></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={t.sections.financing} icon={PiggyBank} expanded={expandedSections.financing} onToggle={() => toggleSection('financing')} color="purple" />
        {expandedSections.financing && (<div className="p-4"><InputField label={t.fields.bankLoan} value={breedingInputs.bankLoanPercent * 100} onChange={(v) => updateBreedingInput('bankLoanPercent', v / 100)} suffix="%" /><InputField label={t.fields.interestRate} value={breedingInputs.interestRate * 100} onChange={(v) => updateBreedingInput('interestRate', v / 100)} suffix="%" /><InputField label={t.fields.loanTenure} value={breedingInputs.loanTenure} onChange={(v) => updateBreedingInput('loanTenure', v)} suffix={t.units.years} /></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`C. ${t.sections.production}`} icon={TrendingUp} expanded={expandedSections.production} onToggle={() => toggleSection('production')} color="blue" />
        {expandedSections.production && (<div className="p-4"><div className="grid grid-cols-2 gap-3"><div className="p-2 bg-amber-50 rounded"><div className="text-xs font-semibold mb-2">{t.fields.year1}</div><InputField label={t.fields.farrowRate} value={breedingInputs.farrowingRateY1 * 100} onChange={(v) => updateBreedingInput('farrowingRateY1', v / 100)} suffix="%" small /><InputField label={t.fields.bornAlive} value={breedingInputs.bornAliveY1} onChange={(v) => updateBreedingInput('bornAliveY1', v)} small /><InputField label={t.fields.preWeanMort} value={breedingInputs.preWeaningMortalityY1 * 100} onChange={(v) => updateBreedingInput('preWeaningMortalityY1', v / 100)} suffix="%" small /></div><div className="p-2 bg-emerald-50 rounded"><div className="text-xs font-semibold mb-2">{t.fields.year2Plus}</div><InputField label={t.fields.farrowRate} value={breedingInputs.farrowingRateY2 * 100} onChange={(v) => updateBreedingInput('farrowingRateY2', v / 100)} suffix="%" small /><InputField label={t.fields.bornAlive} value={breedingInputs.bornAliveY2} onChange={(v) => updateBreedingInput('bornAliveY2', v)} small /><InputField label={t.fields.preWeanMort} value={breedingInputs.preWeaningMortalityY2 * 100} onChange={(v) => updateBreedingInput('preWeaningMortalityY2', v / 100)} suffix="%" small /></div></div></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`D. ${t.sections.costs}`} expanded={expandedSections.costs} onToggle={() => toggleSection('costs')} color="orange" />
        {expandedSections.costs && (<div className="p-4"><div className="grid grid-cols-2 gap-2"><InputField label={t.fields.gilt} value={breedingInputs.giltCost} onChange={(v) => updateBreedingInput('giltCost', v)} /><InputField label={t.fields.feed} value={breedingInputs.feedCostPerKg} onChange={(v) => updateBreedingInput('feedCostPerKg', v)} /></div><InputField label={t.fields.feedConsumption} value={breedingInputs.feedConsumption} onChange={(v) => updateBreedingInput('feedConsumption', v)} step={0.01} /></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`E. ${t.sections.prices}`} expanded={expandedSections.prices} onToggle={() => toggleSection('prices')} color="purple" />
        {expandedSections.prices && (<div className="p-4"><InputField label={t.fields.pigletPrice} value={breedingInputs.pigletPrice} onChange={(v) => updateBreedingInput('pigletPrice', v)} /><InputField label={t.fields.culledSow} value={breedingInputs.culledSowPrice} onChange={(v) => updateBreedingInput('culledSowPrice', v)} /><div className="grid grid-cols-2 gap-2 mt-2"><InputField label={t.fields.discountRate} value={breedingInputs.discountRate * 100} onChange={(v) => updateBreedingInput('discountRate', v / 100)} suffix="%" /><InputField label={t.fields.taxRate} value={breedingInputs.taxRate * 100} onChange={(v) => updateBreedingInput('taxRate', v / 100)} suffix="%" /></div></div>)}
      </div>
    </div>
  ), [breedingInputs, expandedSections, projection.capex.totalCapex, updateBreedingInput, toggleSection, t]);

  const FatteningDataEntry = useMemo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`A. ${t.sections.farmInfo}`} icon={Factory} expanded={expandedSections.farm} onToggle={() => toggleSection('farm')} color="orange" />
        {expandedSections.farm && (<div className="p-4"><InputField label={t.fields.farmName} value={fatteningInputs.farmName} onChange={(v) => updateFatteningInput('farmName', v)} type="text" /><InputField label={t.fields.location} value={fatteningInputs.location} onChange={(v) => updateFatteningInput('location', v)} type="text" /><InputField label={t.fields.capacityHeads} value={fatteningInputs.farmCapacity} onChange={(v) => updateFatteningInput('farmCapacity', v)} suffix={t.units.head} /><InputField label={t.fields.batchesPerYear} value={fatteningInputs.batchesPerYear} onChange={(v) => updateFatteningInput('batchesPerYear', v)} step={0.1} /><InputField label={t.fields.projectDuration} value={fatteningInputs.projectDuration} onChange={(v) => updateFatteningInput('projectDuration', v)} suffix={t.units.years} /></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`B. ${t.sections.capex}`} icon={Calculator} expanded={expandedSections.capex} onToggle={() => toggleSection('capex')} color="orange" />
        {expandedSections.capex && (<div className="p-4"><div className="grid grid-cols-2 gap-2"><InputField label={t.fields.land} value={fatteningInputs.landCost} onChange={(v) => updateFatteningInput('landCost', v)} /><InputField label={t.fields.life} value={fatteningInputs.landLife} onChange={(v) => updateFatteningInput('landLife', v)} suffix={t.units.year} /><InputField label={t.fields.building} value={fatteningInputs.buildingCost} onChange={(v) => updateFatteningInput('buildingCost', v)} /><InputField label={t.fields.life} value={fatteningInputs.buildingLife} onChange={(v) => updateFatteningInput('buildingLife', v)} suffix={t.units.year} /><InputField label={t.fields.machinery} value={fatteningInputs.machineryCost} onChange={(v) => updateFatteningInput('machineryCost', v)} /><InputField label={t.fields.life} value={fatteningInputs.machineryLife} onChange={(v) => updateFatteningInput('machineryLife', v)} suffix={t.units.year} /></div><div className="mt-3 p-2 bg-orange-50 rounded text-sm font-semibold text-orange-800">{t.fields.totalCapex} {formatNumber(projection.capex.totalCapex)} {t.units.million}</div></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={t.sections.financing} icon={PiggyBank} expanded={expandedSections.financing} onToggle={() => toggleSection('financing')} color="purple" />
        {expandedSections.financing && (<div className="p-4"><InputField label={t.fields.bankLoan} value={fatteningInputs.bankLoanPercent * 100} onChange={(v) => updateFatteningInput('bankLoanPercent', v / 100)} suffix="%" /><InputField label={t.fields.interestRate} value={fatteningInputs.interestRate * 100} onChange={(v) => updateFatteningInput('interestRate', v / 100)} suffix="%" /><InputField label={t.fields.loanTenure} value={fatteningInputs.loanTenure} onChange={(v) => updateFatteningInput('loanTenure', v)} suffix={t.units.years} /></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`C. ${t.sections.production}`} icon={TrendingUp} expanded={expandedSections.production} onToggle={() => toggleSection('production')} color="blue" />
        {expandedSections.production && (<div className="p-4"><div className="grid grid-cols-2 gap-2"><InputField label={t.fields.weightIn} value={fatteningInputs.weightIn} onChange={(v) => updateFatteningInput('weightIn', v)} /><InputField label={t.fields.targetABW} value={fatteningInputs.targetABW} onChange={(v) => updateFatteningInput('targetABW', v)} /><InputField label={t.fields.mortality} value={fatteningInputs.mortality * 100} onChange={(v) => updateFatteningInput('mortality', v / 100)} suffix="%" /><InputField label={t.fields.fcr} value={fatteningInputs.fcr} onChange={(v) => updateFatteningInput('fcr', v)} step={0.1} /></div></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={`D. ${t.sections.costs}`} expanded={expandedSections.costs} onToggle={() => toggleSection('costs')} color="orange" />
        {expandedSections.costs && (<div className="p-4"><div className="grid grid-cols-2 gap-2"><InputField label={t.fields.piglet} value={fatteningInputs.pigletCost} onChange={(v) => updateFatteningInput('pigletCost', v)} /><InputField label={t.fields.feed} value={fatteningInputs.feedCostPerKg} onChange={(v) => updateFatteningInput('feedCostPerKg', v)} /></div></div>)}
      </div>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title="E. PRICES & OTHER" expanded={expandedSections.prices} onToggle={() => toggleSection('prices')} color="purple" />
        {expandedSections.prices && (<div className="p-4"><InputField label="Main Pig Price (IDR/kg)" value={fatteningInputs.mainPigPrice} onChange={(v) => updateFatteningInput('mainPigPrice', v)} /><div className="grid grid-cols-2 gap-2 mt-2"><InputField label="Discount Rate" value={fatteningInputs.discountRate * 100} onChange={(v) => updateFatteningInput('discountRate', v / 100)} suffix="%" /><InputField label="Tax Rate" value={fatteningInputs.taxRate * 100} onChange={(v) => updateFatteningInput('taxRate', v / 100)} suffix="%" /></div></div>)}
      </div>
    </div>
  ), [fatteningInputs, expandedSections, projection.capex.totalCapex, updateFatteningInput, toggleSection]);

  const IntegratedDataEntry = useMemo(() => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg"><Factory className="text-indigo-600" size={20} /></div>
            <div><div className="font-bold text-gray-800">{t.sections.integratedModel}</div></div>
          </div>
          <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {t.sections.breeding}</div>
            <ArrowRight size={14} className="text-gray-400" />
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> {t.sections.piglet}</div>
            <ArrowRight size={14} className="text-gray-400" />
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {t.sections.fattening}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <SectionHeader title={t.sections.farmInfo} icon={Factory} expanded={expandedSections.farm} onToggle={() => toggleSection('farm')} color="indigo" />
          {expandedSections.farm && (<div className="p-4">
            <InputField label={t.fields.farmName} value={integratedInputs.farmName} onChange={(v) => updateIntegratedInput('farmName', v)} type="text" />
            <InputField label={t.fields.location} value={integratedInputs.location} onChange={(v) => updateIntegratedInput('location', v)} type="text" />
            <InputField label={t.fields.projectDuration} value={integratedInputs.projectDuration} onChange={(v) => updateIntegratedInput('projectDuration', v)} suffix={t.units.years} />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg"><div className="text-xs font-semibold text-emerald-700 mb-2">{t.sections.breeding.toUpperCase()}</div><InputField label={t.fields.sowCapacity} value={integratedInputs.breedingSowCapacity} onChange={(v) => updateIntegratedInput('breedingSowCapacity', v)} suffix={t.units.sows} small /></div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-xs font-semibold text-orange-700 mb-2">{t.sections.fattening.toUpperCase()}</div>
                <label className="flex items-center gap-2 text-xs"><input type="radio" checked={integratedInputs.fatteningCapacityMode === 'auto'} onChange={() => updateIntegratedInput('fatteningCapacityMode', 'auto')} />{t.fields.autoMatch}</label>
                <label className="flex items-center gap-2 text-xs mt-1"><input type="radio" checked={integratedInputs.fatteningCapacityMode === 'manual'} onChange={() => updateIntegratedInput('fatteningCapacityMode', 'manual')} />{t.fields.manual}</label>
                {integratedInputs.fatteningCapacityMode === 'manual' && <InputField label={t.fields.capacityHeadsYear} value={integratedInputs.fatteningManualCapacity} onChange={(v) => updateIntegratedInput('fatteningManualCapacity', v)} small />}
              </div>
            </div>
          </div>)}
        </div>
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <SectionHeader title={t.sections.financing} icon={PiggyBank} expanded={expandedSections.financing} onToggle={() => toggleSection('financing')} color="purple" />
          {expandedSections.financing && (<div className="p-4">
            <InputField label={t.fields.bankLoan} value={integratedInputs.bankLoanPercent * 100} onChange={(v) => updateIntegratedInput('bankLoanPercent', v / 100)} suffix="%" />
            <InputField label={t.fields.interestRate} value={integratedInputs.interestRate * 100} onChange={(v) => updateIntegratedInput('interestRate', v / 100)} suffix="%" />
            <InputField label={t.fields.loanTenure} value={integratedInputs.loanTenure} onChange={(v) => updateIntegratedInput('loanTenure', v)} suffix={t.units.years} />
            <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-xs">
              <div className="font-semibold text-indigo-800 mb-2">{t.sections.investmentSummary}</div>
              <div className="grid grid-cols-2 gap-1">
                <div>{t.sections.breeding} CAPEX:</div><div className="text-right">IDR {formatNumber(projection.capex.breedingCapex)} M</div>
                <div>{t.sections.fattening} CAPEX:</div><div className="text-right">IDR {formatNumber(projection.capex.fatteningCapex)} M</div>
                <div className="font-bold">Total CAPEX:</div><div className="text-right font-bold">IDR {formatNumber(projection.capex.totalCapex)} M</div>
              </div>
            </div>
          </div>)}
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
        <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><ArrowRight className="text-emerald-600" size={20} /> {t.sections.breedingParameters}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">{t.sections.capex}</div>
            <InputField label={t.fields.building} value={integratedInputs.breedingBuildingCost} onChange={(v) => updateIntegratedInput('breedingBuildingCost', v)} small />
            <InputField label={t.fields.machinery} value={integratedInputs.breedingMachineryCost} onChange={(v) => updateIntegratedInput('breedingMachineryCost', v)} small />
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">{t.sections.kpis}</div>
            <InputField label={`${t.fields.farrowRate} ${t.fields.year2Plus}`} value={integratedInputs.farrowingRateY2 * 100} onChange={(v) => updateIntegratedInput('farrowingRateY2', v / 100)} suffix="%" small />
            <InputField label={`${t.fields.bornAlive} ${t.fields.year2Plus}`} value={integratedInputs.bornAliveY2} onChange={(v) => updateIntegratedInput('bornAliveY2', v)} small />
            <div className="text-xs mt-2 p-2 bg-gray-50 rounded">W/S/Y: {formatNumber(projection.kpis.weanPerSowY2, 2)}</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">{t.sections.costs}</div>
            <InputField label={t.fields.gilt} value={integratedInputs.giltCost} onChange={(v) => updateIntegratedInput('giltCost', v)} small />
            <InputField label={t.fields.feed} value={integratedInputs.sowFeedCostPerKg} onChange={(v) => updateIntegratedInput('sowFeedCostPerKg', v)} small />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
        <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><ArrowRight className="text-orange-600" size={20} /> {t.sections.fatteningParameters}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">{t.sections.capex}</div>
            <InputField label={t.fields.building} value={integratedInputs.fatteningBuildingCost} onChange={(v) => updateIntegratedInput('fatteningBuildingCost', v)} small />
            <InputField label={t.fields.machinery} value={integratedInputs.fatteningMachineryCost} onChange={(v) => updateIntegratedInput('fatteningMachineryCost', v)} small />
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">{t.sections.kpis}</div>
            <InputField label={t.fields.targetABW} value={integratedInputs.targetABW} onChange={(v) => updateIntegratedInput('targetABW', v)} small />
            <InputField label={t.fields.mortality} value={integratedInputs.fatteningMortality * 100} onChange={(v) => updateIntegratedInput('fatteningMortality', v / 100)} suffix="%" small />
            <InputField label={t.fields.fcr} value={integratedInputs.fatteningFcr} onChange={(v) => updateIntegratedInput('fatteningFcr', v)} step={0.1} small />
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">{t.sections.costs} & {t.sections.prices.split('&')[0]}</div>
            <InputField label={t.fields.feed} value={integratedInputs.fatteningFeedCostPerKg} onChange={(v) => updateIntegratedInput('fatteningFeedCostPerKg', v)} small />
            <InputField label={t.fields.mainPigPrice} value={integratedInputs.finisherPrice} onChange={(v) => updateIntegratedInput('finisherPrice', v)} small />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <SectionHeader title={t.sections.other} expanded={expandedSections.other} onToggle={() => toggleSection('other')} color="purple" icon={FileText} />
        {expandedSections.other && (<div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4"><InputField label={t.fields.discountRate} value={integratedInputs.discountRate * 100} onChange={(v) => updateIntegratedInput('discountRate', v / 100)} suffix="%" /><InputField label={t.fields.taxRate} value={integratedInputs.taxRate * 100} onChange={(v) => updateIntegratedInput('taxRate', v / 100)} suffix="%" /><InputField label={t.fields.opex} value={integratedInputs.opexPercent * 100} onChange={(v) => updateIntegratedInput('opexPercent', v / 100)} suffix="%" /><InputField label={t.fields.workingCap} value={integratedInputs.workingCapitalPercent * 100} onChange={(v) => updateIntegratedInput('workingCapitalPercent', v / 100)} suffix="%" /></div>)}
      </div>
    </div>
  ), [integratedInputs, expandedSections, projection.capex.totalCapex, updateIntegratedInput, toggleSection, t]);

  // PROJECTION TAB
  const ProjectionTab = useMemo(() => (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className={`bg-gradient-to-r ${themeGradient} text-white px-4 py-3`}>
        <span className="font-semibold">{farmType.toUpperCase()} {t.sections.farmInfo.split(' ')[0]} - {inputs.projectDuration}-{t.units.year.toUpperCase()} {t.tabs.projection.toUpperCase()} ({t.units.million})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left font-semibold sticky left-0 bg-gray-100">{t.projection.items.item}</th>
              {projection.yearly.map((y) => <th key={y.year} className="px-2 py-2 text-right font-semibold">Y{y.year}</th>)}
              <th className="px-2 py-2 text-right font-semibold bg-blue-100">{t.projection.items.total}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {farmType === 'integrated' && (<>
              <tr className="bg-emerald-50 font-semibold"><td className="px-2 py-1 sticky left-0 bg-emerald-50" colSpan={12}>{t.sections.breeding.toUpperCase()}</td></tr>
              <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.pigletsWeaned}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatNumber(y.pigletsWeaned)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">{formatNumber(projection.yearly.reduce((s, y) => s + y.pigletsWeaned, 0))}</td></tr>
              <tr className="bg-orange-50 font-semibold"><td className="px-2 py-1 sticky left-0 bg-orange-50" colSpan={12}>{t.sections.fattening.toUpperCase()}</td></tr>
              <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.pigsToFattening}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatNumber(y.pigletsToFattening)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">{formatNumber(projection.yearly.reduce((s, y) => s + y.pigletsToFattening, 0))}</td></tr>
              <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.finisherPigsOut}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatNumber(y.finisherPigsOut)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">{formatNumber(projection.yearly.reduce((s, y) => s + y.finisherPigsOut, 0))}</td></tr>
            </>)}
            <tr className="bg-gray-50 font-semibold"><td className="px-2 py-1 sticky left-0 bg-gray-50" colSpan={12}>{t.projection.items.financial}</td></tr>
            <tr className="bg-emerald-50"><td className="px-2 py-1 font-medium sticky left-0 bg-emerald-50">{t.projection.items.totalRevenue}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatNumber(y.totalRevenue)}</td>)}<td className="px-2 py-1 text-right font-medium bg-blue-100">{formatNumber(projection.summary.totalRevenue)}</td></tr>
            <tr className="bg-red-50"><td className="px-2 py-1 font-medium sticky left-0 bg-red-50">{t.projection.items.totalCogs}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatNumber(y.totalCogs)}</td>)}<td className="px-2 py-1 text-right font-medium bg-blue-100">{formatNumber(projection.yearly.reduce((s, y) => s + y.totalCogs, 0))}</td></tr>
            <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.grossProfit}</td>{projection.yearly.map((y) => <td key={y.year} className={`px-2 py-1 text-right ${y.grossProfit < 0 ? 'text-red-600' : ''}`}>{formatNumber(y.grossProfit)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">{formatNumber(projection.yearly.reduce((s, y) => s + y.grossProfit, 0))}</td></tr>
            <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.gpMargin}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatPercent(y.gpMargin)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">-</td></tr>
            <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.ebitda}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatNumber(y.ebitda)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">{formatNumber(projection.yearly.reduce((s, y) => s + y.ebitda, 0))}</td></tr>
            <tr className="bg-blue-50 font-semibold"><td className="px-2 py-1 sticky left-0 bg-blue-50">{t.projection.items.netProfit}</td>{projection.yearly.map((y) => <td key={y.year} className={`px-2 py-1 text-right ${y.netProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumber(y.netProfit)}</td>)}<td className={`px-2 py-1 text-right bg-blue-100 ${projection.summary.totalNetProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumber(projection.summary.totalNetProfit)}</td></tr>
            <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.npMargin}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatPercent(y.npMargin)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">-</td></tr>
            <tr className="bg-gray-50 font-semibold"><td className="px-2 py-1 sticky left-0 bg-gray-50" colSpan={12}>{t.projection.cashFlow.toUpperCase()}</td></tr>
            <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.freeCashFlow}</td>{projection.yearly.map((y) => <td key={y.year} className={`px-2 py-1 text-right ${y.fcf < 0 ? 'text-red-600' : ''}`}>{formatNumber(y.fcf)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">{formatNumber(projection.yearly.reduce((s, y) => s + y.fcf, 0))}</td></tr>
            <tr className="bg-amber-50"><td className="px-2 py-1 font-medium sticky left-0 bg-amber-50">{t.projection.items.cumulativeFcf}</td>{projection.yearly.map((y) => <td key={y.year} className={`px-2 py-1 text-right font-medium ${y.cumulativeFCF < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumber(y.cumulativeFCF)}</td>)}<td className="px-2 py-1 text-right bg-blue-100">-</td></tr>
            <tr><td className="px-2 py-1 sticky left-0 bg-white">{t.projection.items.pvFcf}</td>{projection.yearly.map((y) => <td key={y.year} className="px-2 py-1 text-right">{formatNumber(y.pvFCF)}</td>)}<td className="px-2 py-1 text-right font-medium bg-blue-100">{formatNumber(projection.summary.npv)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  ), [farmType, inputs.projectDuration, projection, themeGradient, t]);

  // SUMMARY TAB
  const SummaryTab = useMemo(() => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard title={t.summary.npv} value={`IDR ${formatNumber(projection.summary.npv)} ${t.units.million}`} positive={projection.summary.npv >= 0} />
        <SummaryCard title={t.summary.irr} value={formatPercent(projection.summary.irr)} />
        <SummaryCard title={t.summary.payback} value={`${formatNumber(projection.summary.paybackPeriod, 2)} ${t.units.years}`} />
        <SummaryCard title={`${t.summary.roi} ${t.fields.year1}`} value={formatPercent(projection.summary.roiYear1)} positive={projection.summary.roiYear1 >= 0} />
        <SummaryCard title={`${inputs.projectDuration}-${t.units.year} ${t.projection.items.netProfit}`} value={`IDR ${formatNumber(projection.summary.totalNetProfit)} ${t.units.million}`} positive={projection.summary.totalNetProfit >= 0} />
        <SummaryCard title={`${inputs.projectDuration}-${t.units.year} ${t.projection.revenue}`} value={`IDR ${formatNumber(projection.summary.totalRevenue)} ${t.units.million}`} />
      </div>
      {farmType === 'integrated' && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
          <h3 className="font-bold text-indigo-800 mb-3">{t.sections.investmentSummary}</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg"><div className="text-xs text-gray-500">{t.sections.breeding} CAPEX</div><div className="font-bold text-emerald-600">IDR {formatNumber(projection.capex.breedingCapex)} {t.units.million}</div></div>
            <div className="bg-white p-3 rounded-lg"><div className="text-xs text-gray-500">{t.sections.fattening} CAPEX</div><div className="font-bold text-orange-600">IDR {formatNumber(projection.capex.fatteningCapex)} {t.units.million}</div></div>
            <div className="bg-white p-3 rounded-lg"><div className="text-xs text-gray-500">Total CAPEX</div><div className="font-bold text-indigo-600">IDR {formatNumber(projection.capex.totalCapex)} {t.units.million}</div></div>
          </div>
        </div>
      )}
    </div>
  ), [farmType, inputs.projectDuration, projection, t]);

  // =====================================================
  // SCENARIOS TAB
  // =====================================================
  const ScenariosTab = useMemo(() => {
    const compareScenarios = savedScenarios.filter(s => selectedScenarios.includes(s.id));

    return (
      <div className="space-y-6">
        {/* Save Current Scenario */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t.scenarios.save}</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`${t.scenarios.name}...`}
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={saveScenario}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Save size={16} /> {t.buttons.save.split(' ')[0]}
            </button>
          </div>
        </div>

        {/* Saved Scenarios List */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">{t.scenarios.title} ({savedScenarios.length})</h3>
            {savedScenarios.length >= 2 && (
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${compareMode ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <ArrowLeftRight size={14} /> {compareMode ? t.scenarios.exitCompare : t.scenarios.compareMode}
              </button>
            )}
          </div>

          {savedScenarios.length === 0 ? (
            <div className="text-center text-gray-500 py-8">{t.scenarios.noScenarios}. {t.scenarios.saveHint}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedScenarios.map((scenario) => (
                <div key={scenario.id} className={`border rounded-lg p-3 ${compareMode && selectedScenarios.includes(scenario.id) ? 'border-purple-500 bg-purple-50' : 'hover:border-emerald-400'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-800">{scenario.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${scenario.farmType === 'fattening' ? 'bg-orange-100 text-orange-700' : scenario.farmType === 'integrated' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {t.farmTypes[scenario.farmType]}
                        </span>
                        {new Date(scenario.createdAt).toLocaleDateString(language)}
                      </div>
                    </div>
                    {compareMode && (
                      <input
                        type="checkbox"
                        checked={selectedScenarios.includes(scenario.id)}
                        onChange={() => setSelectedScenarios(prev => prev.includes(scenario.id) ? prev.filter(x => x !== scenario.id) : [...prev, scenario.id].slice(-3))}
                        className="w-4 h-4"
                      />
                    )}
                  </div>
                  <div className="text-xs space-y-1 mb-3">
                    <div className="flex justify-between"><span className="text-gray-500">NPV:</span><span className={scenario.summary.npv >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatNumber(scenario.summary.npv)} {t.units.million}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">IRR:</span><span className="text-blue-600">{formatPercent(scenario.summary.irr)}</span></div>
                  </div>
                  {!compareMode && (
                    <div className="flex gap-2">
                      <button onClick={() => loadScenario(scenario)} className="flex-1 px-2 py-1.5 text-xs bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 flex items-center justify-center gap-1">
                        <Copy size={12} /> {t.buttons.load}
                      </button>
                      <button onClick={() => deleteScenario(scenario.id)} className="px-2 py-1.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comparison Table */}
        {compareMode && compareScenarios.length >= 2 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3">{t.scenarios.comparisonTitle}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">{t.scenarios.metric}</th>
                    {compareScenarios.map((s) => <th key={s.id} className="px-3 py-2 text-right">{s.name}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="px-3 py-2 font-medium">{t.scenarios.farmTypeLabel}</td>{compareScenarios.map((s) => <td key={s.id} className="px-3 py-2 text-right capitalize">{t.farmTypes[s.farmType]}</td>)}</tr>
                  <tr><td className="px-3 py-2 font-medium">NPV</td>{compareScenarios.map((s) => <td key={s.id} className={`px-3 py-2 text-right font-semibold ${s.summary.npv >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>IDR {formatNumber(s.summary.npv)} {t.units.million}</td>)}</tr>
                  <tr><td className="px-3 py-2 font-medium">IRR</td>{compareScenarios.map((s) => <td key={s.id} className="px-3 py-2 text-right font-semibold text-blue-600">{formatPercent(s.summary.irr)}</td>)}</tr>
                  <tr><td className="px-3 py-2 font-medium">{t.projection.items.total} {t.projection.items.netProfit}</td>{compareScenarios.map((s) => <td key={s.id} className="px-3 py-2 text-right">IDR {formatNumber(s.summary.totalNetProfit)} {t.units.million}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }, [savedScenarios, selectedScenarios, compareMode, scenarioName, t, language, saveScenario, deleteScenario, loadScenario, setCompareMode, setScenarioName, setSelectedScenarios, formatNumber, formatPercent]);

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className={`bg-gradient-to-r ${themeGradient} text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <PiggyBank size={28} />
                {t.header.title}
              </h1>
              <p className="text-white/80 text-sm mt-1">{inputs.farmName} - {inputs.location}</p>
            </div>

            {/* Farm Type Selector */}
            <div className="flex items-center gap-3">
              <div className="flex bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => setFarmType('breeding')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${farmType === 'breeding' ? 'bg-white text-emerald-700' : 'text-white hover:bg-white/10'}`}
                >
                  {farmTypeLabels.breeding}
                </button>
                <button
                  onClick={() => setFarmType('fattening')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${farmType === 'fattening' ? 'bg-white text-orange-700' : 'text-white hover:bg-white/10'}`}
                >
                  {farmTypeLabels.fattening}
                </button>
                <button
                  onClick={() => setFarmType('integrated')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${farmType === 'integrated' ? 'bg-white text-indigo-700' : 'text-white hover:bg-white/10'}`}
                >
                  {farmTypeLabels.integrated}
                </button>
              </div>

              <button onClick={toggleLanguage} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-1" title={t.buttons.language}>
                <Languages size={16} />
                {language.toUpperCase()}
              </button>
              <button onClick={resetToDefaults} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg">
                {t.buttons.reset}
              </button>
              <button onClick={() => window.print()} className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-1">
                <FileDown size={16} /> {t.buttons.export}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'entry', label: t.tabs.dataEntry, icon: FileText },
              { id: 'projection', label: t.tabs.projection, icon: BarChart3 },
              { id: 'summary', label: t.tabs.summary, icon: Calculator },
              { id: 'scenarios', label: t.tabs.scenarios, icon: Save },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-emerald-600 hover:border-emerald-300'
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
        {activeTab === 'entry' && (
          farmType === 'integrated' ? IntegratedDataEntry :
            farmType === 'fattening' ? FatteningDataEntry :
              BreedingDataEntry
        )}
        {activeTab === 'entry' && (
          farmType === 'integrated' ? IntegratedDataEntry :
            farmType === 'fattening' ? FatteningDataEntry :
              BreedingDataEntry
        )}
        {activeTab === 'projection' && ProjectionTab}
        {activeTab === 'summary' && SummaryTab}
        {activeTab === 'scenarios' && ScenariosTab}
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, header button { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default FarmFSCalculator;