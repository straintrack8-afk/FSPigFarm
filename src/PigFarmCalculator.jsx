import React, { useState, useEffect, useMemo } from 'react';
import { Save, FileDown, Trash2, Copy, Plus, X, Calendar, TrendingUp, DollarSign, PieChart, Settings, BarChart, Factory, ArrowRight, PiggyBank, ArrowLeft, ChevronDown, ChevronUp, Info, Zap, CheckCircle } from 'lucide-react';
import { calculateFatteningBarnMode, getBarnStatus, generateFutureCohorts, createMonthlySchedule, calculateCohortBasedCashFlow } from './fatteningBarnCalculations';
import { formatCurrency as formatCurrencyWithSymbol, formatCurrencyMillion, getCurrencySymbol, convertCurrency } from './currencyUtils';
import { translations } from './translations';

// ============================================
// OPERATIONAL MODES
// ============================================

const MODES = {
    BREEDING: 'breeding',
    FATTENING: 'fattening',
    INTEGRATED: 'integrated'
};

// ============================================
// DEFAULT VALUES BY MODE
// ============================================

// BREEDING MODE - Sell weaner piglets
const defaultBreedingParams = {
    // Farm Info
    farmName: 'My Breeding Farm',
    projectMonths: 36,

    // Production KPIs
    gestationPeriod: 114,
    lactationPeriod: 28,
    recoveryDays: 7,

    // Year 1 (Ramp-up) - Conservative parameters
    farrowingRateY1: 0.85,
    bornAliveY1: 12,
    preWeaningMortalityY1: 0.10,

    // Year 2+ (Stable/Full Production) - Industry Standard
    farrowingRateY2: 0.90,
    bornAliveY2: 13,
    preWeaningMortalityY2: 0.08,

    // Legacy (keep for backward compatibility)
    farrowingRate: 0.90,
    bornAlivePerLitter: 13,
    preWeaningMortality: 0.08,

    // Progressive Culling
    year1CullingRate: 0.10,
    year2CullingRate: 0.30,
    year3PlusCullingRate: 0.45,
    replacementLeadTime: 7,

    // Costs (Total Monthly)
    giltPrice: 7000000,
    sowFeedPrice: 11000,
    sowFeedPerDay: 2.6,
    ahpPerMonth: 758300,
    laborPerMonth: 900000,
    overheadPerMonth: 4650000,
    utilitiesPerMonth: 2500000,

    // Escalation
    giltCostEscalation: 0.015,
    sowFeedEscalation: 0.01,
    ahpEscalation: 0.01,
    laborEscalation: 0.02,
    overheadEscalation: 0.01,
    utilitiesEscalation: 0.02,

    // Pre-productive
    daysToFirstMating: 45,
    preProductiveFeedPerDay: 2.6,
    preProductiveAHP: 34000,
    preProductiveLaborPerDay: 300,

    // Selling Price
    weanerPrice: 1200000, // IDR per head (6-7kg piglet)
    culledSowPrice: 34300, // IDR per kg
    avgCulledSowWeight: 120, // kg
};

// FATTENING MODE - Buy weaners, sell finishers
const defaultFatteningParams = {
    // Farm Info
    farmName: 'My Fattening Farm',
    projectMonths: 36,
    monthlyPigletPurchase: 1000, // Buy X piglets per month

    // Purchase
    weanerPurchasePrice: 1300000, // IDR per head
    weanerPurchaseWeight: 7, // kg

    // Growth Parameters
    targetWeight: 120, // kg
    adg: 0.75, // kg/day
    fcr: 2.8,
    mortality: 0.04,
    cullingRate: 0.02, // % sold at below-standard weight
    cleaningPeriodDays: 14, // Days between batches for cleaning

    // Costs
    feedPrice: 8200,
    ahpPerKg: 1600,
    laborPerPigPerDay: 150,
    utilitiesPerKg: 800,

    // Escalation
    weanerPriceEscalation: 0.01,
    feedEscalation: 0.02,
    ahpEscalation: 0.02,
    laborEscalation: 0.02,
    utilitiesEscalation: 0.02,

    // Selling Price
    finisherPrice: 45000, // IDR per kg
    byProductPrice: 18000, // Culled pigs
};

// INTEGRATED MODE - Full breeding to fattening
const defaultIntegratedParams = {
    // Farm Info
    farmName: 'My Integrated Farm',
    projectMonths: 36,
    projectStartDate: '2026-06', // Default start date

    // Progressive Culling & Replacement
    cullingRateY1: 0.00,
    cullingRateY2: 0.30,
    cullingRateY3Plus: 0.40,
    breedingSowCapacity: 0, // Default to 0 (Manual Start)
    giltLeadTime: 7,

    // Mating System
    matingSystem: 'weekly', // 'batch' or 'weekly'
    batchInterval: 'weekly', // 'weekly', 'biweekly', 'monthly'

    // Breeding Section
    breeding: {
        ...defaultBreedingParams,
        externalSalePercent: 0, // % of piglets sold externally (0 = all to fattening)
    },

    // Fattening Section  
    fattening: {
        targetWeight: 120,
        adg: 0.75,
        fcr: 2.8,
        mortality: 0.04,
        feedPrice: 8200,
        ahpPerKg: 1600,
        laborPerPigPerDay: 150,
        utilitiesPerKg: 800,
        feedEscalation: 0.02,
        ahpEscalation: 0.02,
        laborEscalation: 0.02,
        utilitiesEscalation: 0.02,
    },

    // BIOLOGICAL CYCLE (in days)
    giltToFirstMating: 45,    // Days for gilt acclimatization before first mating
    gestationDays: 116,        // Standard gestation period
    lactationDays: 24,         // Standard lactation/weaning period (can be adjusted)
    drySowDays: 10,            // Average dry sow period (weaning to next mating)

    // NURSERY
    nurseryAdg: 0.40,          // kg/day average daily gain
    nurseryFcr: 1.5,
    nurseryMortality: 0.02,

    // FATTENING  
    fatteningAdg: 0.75,        // kg/day average daily gain

    // Selling Prices
    weanerPrice: 1200000, // For external sales
    finisherPrice: 45000, // Main product
    byProductPrice: 18000,
    culledSowPrice: 34300,
    avgCulledSowWeight: 120,
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

const formatCurrency = (num, currencyCode = 'USD') => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    // Use currency utilities for formatting with million suffix
    return formatCurrencyMillion(num, currencyCode);
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const addDays = (dateString, days) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};

const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

const getMonthsSinceEntry = (entryDate, currentMonth) => {
    // currentMonth is 0-indexed
    return currentMonth;
};

// ============================================
// CALCULATION ENGINES
// ============================================

// BREEDING CALCULATION ENGINE (USES INTEGRATED LOGIC - STOPS AT WEANING)
// This mode supports stable farms, cohort system, and all features from Integrated Mode
// but only calculates up to piglet weaning (no nursery/fattening)
function calculateBreedingMode(cohorts, params, costParams, months, integratedInputs) {
    // Calculate month-by-month production
    const timeline = [];
    const projectStartDate = params.projectStartDate || '2026-01-01';

    for (let month = 0; month < months; month++) {
        let totalActiveSows = 0;
        let totalPigletsWeaned = 0;
        let totalSowsCulled = 0;
        let totalGiltPurchases = 0;
        let totalGiltsArrived = 0;
        let totalGiltsProductive = 0;
        let totalMatingCount = 0;
        let totalFarrowingCount = 0;
        let totalCosts = 0;

        cohorts.forEach(cohort => {
            const cohortMonth = month - Math.floor(daysBetween(cohort.entryDate, projectStartDate) / 30);
            if (cohortMonth < 0) return; // Cohort hasn't entered yet

            // Track gilt arrivals
            if (cohortMonth === 0) {
                totalGiltsArrived += cohort.numberOfGilts;
            }

            // Calculate population with progressive culling
            const population = calculateCohortPopulation(cohort, cohortMonth, params);
            totalActiveSows += population.active;

            // Check if producing
            const daysInHerd = cohortMonth * 30;
            const isProducing = daysInHerd >= (params.daysToFirstMating + params.gestationPeriod);

            if (isProducing) {
                // Track gilts becoming productive
                if (cohortMonth === Math.ceil((params.daysToFirstMating + params.gestationPeriod) / 30)) {
                    totalGiltsProductive += cohort.numberOfGilts;
                }

                // Monthly production
                const cycleDays = params.gestationPeriod + params.lactationPeriod + params.recoveryDays;
                const cyclesPerYear = 365 / cycleDays;
                const monthlyProduction = population.active * params.farrowingRate *
                    params.bornAlivePerLitter * (1 - params.preWeaningMortality) *
                    cyclesPerYear / 12;

                totalPigletsWeaned += monthlyProduction;

                // Estimate mating and farrowing counts
                totalMatingCount += Math.round(population.active * (30 / cycleDays));
                totalFarrowingCount += Math.round(population.active * params.farrowingRate * (30 / cycleDays));
            }

            // Culling events
            if (population.culled > 0) {
                totalSowsCulled += population.culled;
                totalGiltPurchases += population.culled; // Replace culled sows
            }
        });

        // Calculate costs using costParams
        const yearIndex = Math.floor(month / 12);

        const feedEscalation = Math.pow(1 + costParams.feedEscalation, yearIndex);
        const feedCost = totalActiveSows * costParams.sowFeedPerDay * 30 * costParams.feedPricePerKg * feedEscalation / 1000000;

        const ahpCost = costParams.ahpPerMonth * Math.pow(1 + costParams.ahpEscalation, yearIndex) / 1000;
        const laborCost = costParams.laborPerMonth * Math.pow(1 + costParams.laborEscalation, yearIndex) / 1000;
        const overheadCost = costParams.overheadPerMonth * Math.pow(1 + costParams.overheadEscalation, yearIndex) / 1000;
        const utilitiesCost = costParams.utilitiesPerMonth * Math.pow(1 + costParams.utilitiesEscalation, yearIndex) / 1000;

        const giltCost = totalGiltPurchases * costParams.giltPrice * Math.pow(1 + costParams.giltCostEscalation, yearIndex) / 1000;

        totalCosts = feedCost + ahpCost + laborCost + overheadCost + utilitiesCost + giltCost;

        // Calculate revenue
        const weanerRevenue = totalPigletsWeaned * params.weanerPrice / 1000;
        const culledSowRevenue = totalSowsCulled * params.culledSowPrice * params.avgCulledSowWeight / 1000000;
        const totalRevenue = weanerRevenue + culledSowRevenue;

        // Profitability
        const grossProfit = totalRevenue - totalCosts;
        const netProfit = grossProfit; // Simplified

        // Generate monthLabel
        const monthDate = new Date(projectStartDate);
        monthDate.setMonth(monthDate.getMonth() + month);
        const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        timeline.push({
            month: month + 1,
            monthLabel: monthLabel,
            activeSows: Math.round(totalActiveSows),
            giltsArrived: totalGiltsArrived,
            giltsProductive: totalGiltsProductive,
            sowsCulled: Math.round(totalSowsCulled),
            netChange: totalGiltsArrived + totalGiltsProductive - Math.round(totalSowsCulled),
            matingCount: totalMatingCount,
            farrowingCount: totalFarrowingCount,
            pigletsWeaned: Math.round(totalPigletsWeaned),
            giltPurchases: totalGiltPurchases,
            revenue: totalRevenue,
            costs: totalCosts,
            costDetails: {
                breeding: feedCost + giltCost,
                ahp: ahpCost,
                labor: laborCost,
                overhead: overheadCost,
                utilities: utilitiesCost
            },
            revenueDetails: {
                weaner: weanerRevenue,
                cullSow: culledSowRevenue
            },
            grossProfit: grossProfit,
            netProfit: netProfit,
        });
    }

    // Summary
    const totalRevenue = timeline.reduce((sum, m) => sum + m.revenue, 0);
    const totalCosts = timeline.reduce((sum, m) => sum + m.costs, 0);
    const totalNetProfit = timeline.reduce((sum, m) => sum + m.netProfit, 0);
    const avgMonthlyProfit = totalNetProfit / months;

    return {
        timeline,
        summary: {
            totalRevenue,
            totalCosts,
            totalNetProfit,
            avgMonthlyProfit,
            netMargin: totalRevenue > 0 ? totalNetProfit / totalRevenue : 0,
        }
    };
}

// FATTENING CALCULATION ENGINE (WITH MULTI-EXIT & DETAILED COSTS)
function calculateFatteningMode(params, costParams, exitPoints, months) {
    const timeline = [];
    const projectStartDate = params.projectStartDate || '2026-01-01';

    for (let month = 0; month < months; month++) {
        const yearIndex = Math.floor(month / 12);
        const pigsIn = params.monthlyPigletPurchase;
        const startWeight = params.weanerPurchaseWeight;

        // Apply mortality once at beginning
        const pigsAfterMortality = Math.round(pigsIn * (1 - params.mortality));

        // Process each active exit point
        const activeExits = exitPoints
            .filter(e => e.active)
            .sort((a, b) => a.exitMonth - b.exitMonth);

        let totalRevenue = 0;
        let totalFeedCost = 0;
        let totalNonFeedCost = 0;
        const exitDetails = [];

        // Distribute pigs across exit points
        // Note: Percentage applies to the surviving population
        let remainingPigs = pigsAfterMortality;

        // If no exit points active, default to 100% at target weight (legacy behavior fallback)
        if (activeExits.length === 0) {
            const weightGain = params.targetWeight - startWeight;
            const feedPerPig = weightGain * params.fcr;
            const feedPrice = params.feedPrice * Math.pow(1 + costParams.feedEscalation, yearIndex);
            const feedCost = pigsAfterMortality * feedPerPig * feedPrice / 1000000;

            const totalWeight = pigsAfterMortality * params.targetWeight;
            const revenue = totalWeight * params.finisherPrice / 1000000;

            totalRevenue = revenue;
            totalFeedCost = feedCost;

            exitDetails.push({
                exitPoint: 'default',
                exitMonth: Math.ceil(weightGain / params.adg / 30),
                targetWeight: params.targetWeight,
                pigsOut: pigsAfterMortality,
                totalWeight,
                daysInFattening: Math.round(weightGain / params.adg),
                feedConsumed: pigsAfterMortality * feedPerPig,
                feedCost,
                revenue
            });
        } else {
            for (const exit of activeExits) {
                // Calculate pigs at this exit
                const pigsAtExit = Math.round(pigsAfterMortality * exit.percentage / 100);

                // Growth calculation
                const weightGain = exit.targetWeight - startWeight;
                const daysInFattening = weightGain / params.adg;
                const feedPerPig = weightGain * params.fcr;

                // Costs with escalation
                const feedPrice = params.feedPrice * Math.pow(1 + costParams.feedEscalation, yearIndex);
                const feedCost = pigsAtExit * feedPerPig * feedPrice / 1000000; // Million IDR

                // Revenue
                const totalWeight = pigsAtExit * exit.targetWeight;
                const revenue = totalWeight * exit.pricePerKg / 1000000; // Million IDR

                totalRevenue += revenue;
                totalFeedCost += feedCost;

                exitDetails.push({
                    exitPoint: exit.id,
                    exitMonth: exit.exitMonth,
                    targetWeight: exit.targetWeight,
                    pigsOut: pigsAtExit,
                    totalWeight: totalWeight,
                    daysInFattening: Math.round(daysInFattening),
                    feedConsumed: pigsAtExit * feedPerPig,
                    feedCost: feedCost,
                    revenue: revenue,
                });
            }
        }

        // Non-feed costs (monthly fixed costs with escalation)
        const weanerCost = pigsIn * params.weanerPurchasePrice *
            Math.pow(1 + costParams.weanerEscalation, yearIndex) / 1000;

        const ahpCost = costParams.ahpPerMonth *
            Math.pow(1 + costParams.ahpEscalation, yearIndex) / 1000;

        const laborCost = costParams.laborPerMonth *
            Math.pow(1 + costParams.laborEscalation, yearIndex) / 1000;

        const overheadCost = costParams.overheadPerMonth *
            Math.pow(1 + costParams.overheadEscalation, yearIndex) / 1000;

        const utilitiesCost = costParams.utilitiesPerMonth *
            Math.pow(1 + costParams.utilitiesEscalation, yearIndex) / 1000;

        totalNonFeedCost = weanerCost + ahpCost + laborCost + overheadCost + utilitiesCost;

        const totalCosts = totalFeedCost + totalNonFeedCost;
        const grossProfit = totalRevenue - totalCosts;
        const netProfit = grossProfit; // Simplified

        // Generate monthLabel
        const monthDate = new Date(projectStartDate);
        monthDate.setMonth(monthDate.getMonth() + month);
        const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        timeline.push({
            month: month + 1,
            monthLabel: monthLabel,
            pigsIn,
            pigsAfterMortality,
            exitDetails,
            totalRevenue,
            revenue: totalRevenue,
            costs: totalCosts,
            costDetails: {
                weaner: weanerCost,
                feed: totalFeedCost,
                ahp: ahpCost,
                labor: laborCost,
                overhead: overheadCost,
                utilities: utilitiesCost
            },
            revenueDetails: {
                fattening: totalRevenue
            },
            grossProfit,
            netProfit,
        });
    }

    const totalRevenue = timeline.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalCosts = timeline.reduce((sum, m) => sum + m.costs, 0);
    const totalNetProfit = timeline.reduce((sum, m) => sum + m.netProfit, 0);
    const avgMonthlyProfit = totalNetProfit / months;

    return {
        timeline,
        summary: {
            totalRevenue,
            totalCosts,
            totalNetProfit,
            avgMonthlyProfit,
            netMargin: totalRevenue > 0 ? totalNetProfit / totalRevenue : 0,
        }
    };
}

// HELPER: Convert month index to Month-Year format
const getMonthYear = (monthIndex, startDateStr) => {
    const startDate = new Date(startDateStr || '2026-06-01');
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + monthIndex);

    // Format: "Jun-2026"
    const monthStr = date.toLocaleString('default', { month: 'short' });
    const yearStr = date.getFullYear();
    return `${monthStr}-${yearStr}`;
};

// HELPER: Convert day to month index
const getMonthFromDay = (dayNumber) => Math.floor(dayNumber / 30);

// This ensures culling and replacement are calculated together for accurate population tracking

// CRITICAL FUNCTION: Track sow cohorts and calculate culling
// This ensures population balance: Gilts IN = Sows OUT
const calculateSowPopulationWithCulling = (inputs, giltArrivals, initialStableHerd = 0) => {
    const totalMonths = inputs.projectDuration * 12;
    const hasStableFarm = initialStableHerd > 0;

    const sowCohorts = []; // Track each gilt cohort (including Cohort 0)
    const monthlyPopulation = [];
    let cullAccumulator = 0; // Carry over fractional culling targets
    let stableCullResidue = 0; // Accumulator specifically for Stable Farm fractional culling

    // Initialize pending culls queue (persists across months)
    let pendingCulls = [];

    // === ADD COHORT 0 (EXISTING STABLE HERD) ===
    // Cohort 0 is a stable farm that uses Year 3+ Stable Farm Culling Rate
    if (initialStableHerd > 0) {
        console.log(`🏠 Adding Cohort 0 (Stable Herd) to sowCohorts: ${initialStableHerd} sows`);
        sowCohorts.push({
            arrivalMonth: -1, // Already productive before project start
            count: initialStableHerd,
            cohortId: 'COHORT-0-INITIAL',
            isInitialStock: true,
            isCohort0: true, // Flag to identify Cohort 0
            ageInMonths: 0
        });

        // PRE-POPULATE replacement gilts for stable farm
        // USER'S FORMULA: Active Sow = previous period + Sow Prod - Culled
        // For stable farm to maintain 100 sows from M0, we need Sow Prod = Culled from M0
        // This requires pre-populating gilts that will become productive in M0, M1, etc.
        const leadTime = inputs.giltLeadTime || 2;
        const annualRate = inputs.cullingRateY3Plus || 0.40;
        const monthlyReplacement = Math.round((initialStableHerd * annualRate) / 12);

        console.log(`🏠 Pre-populating replacement gilts for stable farm (${monthlyReplacement} gilts/month, lead time=${leadTime} months)`);

        // Add replacement gilts that arrived before M0 and will become productive
        for (let i = 1; i <= leadTime; i++) {
            sowCohorts.push({
                arrivalMonth: -i, // Arrived i months before M0
                count: monthlyReplacement,
                cohortId: `COHORT-0-REPL-PRE-M${i}`,
                isInitialStock: false,
                isReplacementFromCohort0: true, // Mark as Cohort 0 replacement
                isCohort0: false,
                ageInMonths: i, // They've been here for i months
                leadTime: leadTime
            });
            console.log(`  → Pre-M${i}: ${monthlyReplacement} gilts (will be productive M${leadTime - i})`);
        }
    }

    // Initialize cohort tracking from gilt arrivals
    // FILTER OUT old stable cohorts that conflict with Cohort 0
    giltArrivals.forEach(arrival => {
        // SKIP old stable cohorts (GILT-Y*-Stable) - they conflict with Cohort 0
        const isOldStableCohort = arrival.cohortId && String(arrival.cohortId).includes('Stable');
        if (isOldStableCohort) {
            console.log(`⏭️ Skipping old stable cohort: ${arrival.cohortId} (conflicts with Cohort 0)`);
            return; // Skip this cohort
        }

        sowCohorts.push({
            arrivalMonth: Math.floor(arrival.day / 30),
            count: arrival.count,
            cohortId: arrival.cohortId,
            isInitialStock: arrival.cohortId && (
                String(arrival.cohortId).startsWith('AUTO-SS') ||
                String(arrival.cohortId) === 'COHORT-0-INITIAL'
            ),
            ageInMonths: 0,
            leadTime: arrival.leadTime !== undefined ? arrival.leadTime : undefined // Preserve per-cohort leadTime
        });
    });

    // Track replacement gilts with lead time (separate from giltArrivals to avoid accumulation)
    const replacementGiltTracking = [];

    // Calculate population for each month
    for (let m = 0; m < totalMonths; m++) {
        const monthYear = getMonthYear(m, inputs.projectStartDate);
        const year = Math.floor(m / 12) + 1;

        // Age all existing cohorts
        sowCohorts.forEach(cohort => {
            if (cohort.arrivalMonth <= m) {
                cohort.ageInMonths = m - cohort.arrivalMonth;
            }
        });

        // === CULLING CALCULATION ===
        // Cohort 0 will be processed in the standard culling loop below
        let annualCullingRate;

        // CHECK ID directly from the cohort object in the loop logic below
        // But here we calculate a BASE rate. We need to apply rate PER COHORT.

        // REFACTOR: Determine rate inside the cohort loop (lines 563+) OR split cohorts.
        // Current logic filters "activeCohorts" and applies a global rate "monthlyCullingRate".
        // This is problematic if we have mixed rates.

        // MODIFIED LOGIC:
        // We calculate "Total Cull Target" by summing target culls from each cohort based on its specific rate.

        // === DETERMINING CULLING TARGETS ===

        // This is the driver for "Stable Herd" culling (One In, One Out).
        // Only count gilts that are part of the 'Stable' replenishment stream.
        // Lead time from user setup (default 45 days = 1.5 months)
        const leadTime = inputs.giltLeadTime !== undefined ? inputs.giltLeadTime : 1.5;

        // Debug: Log lead time
        if (m === 0) {
            console.log(`🔍 LEAD TIME: ${leadTime} months (from setup: ${inputs.giltLeadTime})`);
        }

        const stableGiltsProductiveCount = giltArrivals
            .filter(g => {
                const productiveMonth = Math.floor(g.day / 30) + leadTime;
                const isStableReplacement = g.cohortId && String(g.cohortId).includes('Stable');
                return productiveMonth === m && isStableReplacement;
            })
            .reduce((sum, g) => sum + g.count, 0);

        let totalTargetCull = 0;
        const replacementGiltTracking = []; // Track replacement gilts to add to sowCohorts

        let activeCohorts = sowCohorts.filter(c => {
            // Fix: Include initial stock immediately as Active (if lead time satisfies or it's initial)
            const cohortLeadTime = c.leadTime !== undefined ? c.leadTime : leadTime;
            return (c.arrivalMonth + cohortLeadTime <= m || c.isInitialStock) && c.count > 0;
        });

        // DEBUG: Show active cohorts for Month 0
        if (m === 0) {
            console.log("\n🔍 DEBUG M0 Active Cohorts:");
            activeCohorts.forEach(c => {
                console.log(`  - ID: ${c.cohortId}, Count: ${c.count}, ArrMonth: ${c.arrivalMonth}, isInitialStock: ${c.isInitialStock}`);
            });
            console.log(`  Total Active Sows M0: ${activeCohorts.reduce((sum, c) => sum + c.count, 0)}\n`);
        }

        // CRITICAL: Calculate TOTAL STABLE POPULATION first
        // This includes Cohort 0 + all productive replacement gilts (REPL-C0-*)
        // Culling should be based on TOTAL stable population, not just Cohort 0's declining count
        const totalStablePopulation = activeCohorts
            .filter(c => {
                const isStable = c.isInitialStock
                    || (c.cohortId && String(c.cohortId).includes('Stable'))
                    || (c.cohortId && String(c.cohortId).startsWith('REPL-C0-'));

                // Only count productive stable cohorts (past their lead time)
                const cohortLeadTime = c.leadTime !== undefined ? c.leadTime : leadTime;
                const isProductive = c.arrivalMonth + cohortLeadTime <= m || c.isInitialStock;

                return isStable && isProductive && c.count > 0;
            })
            .reduce((sum, c) => sum + c.count, 0);

        // === CULLING & REPLACEMENT CALCULATION ===
        // Simple logic: Each cohort culls based on its count × replacement rate
        // CRITICAL: Use a SNAPSHOT of sowCohorts to avoid processing newly added gilts in same month!

        let totalCulledThisMonth = 0;
        let totalGiltArrThisMonth = 0;
        const replacementGilts = []; // Track gilts to add to sowCohorts
        const pendingCullsThisMonth = []; // Track culls to execute when gilts become productive

        // Create snapshot to avoid processing gilts created this month
        const cohortsToProcess = [...sowCohorts];

        // === NEW DELAYED CULLING LOGIC ===
        // Key Principle: Culling happens WHEN replacement gilts become productive
        // Step 1: Calculate culling demand and generate replacement gilts (Gilt Arr)
        // Step 2: When those gilts become productive (Sow Prod), execute the actual culling (Culled)
        // This ensures: Culled appears with Sow Prod, NOT with Gilt Arr

        // === CALCULATE SOW PROD FIRST (BEFORE CULLING) ===
        // CRITICAL: Calculate BEFORE culling so pre-populated gilts are counted with their original count
        let sowProdThisMonth = 0;
        const productiveCohortsThisMonth = [];

        cohortsToProcess.forEach(c => {
            const cohortLeadTime = c.leadTime !== undefined ? c.leadTime : leadTime;
            const productiveMonth = Math.round(c.arrivalMonth + cohortLeadTime);
            if (productiveMonth === m && !c.isInitialStock) {
                sowProdThisMonth += c.count;
                productiveCohortsThisMonth.push(c.cohortId);

                if (m === 0) {
                    console.log(`✅ M0 Sow Prod BEFORE culling: ${c.cohortId} (Arr=${c.arrivalMonth}, Lead=${cohortLeadTime}, Count=${c.count})`);
                }
            }
        });

        if (m === 0) {
            console.log(`✅ M0 TOTAL Sow Prod BEFORE culling: ${sowProdThisMonth}`);
        }

        // === AGGREGATE CULLING FOR STABLE FARM ===
        // Identify Stable Farm cohorts (Cohort 0 + Replacements)
        const stableCols = cohortsToProcess.filter(c =>
            c.cohortId === 'COHORT-0-INITIAL' || c.isInitialStock || c.isReplacementFromCohort0
        );

        // Calculate Total Demand for Stable Herd
        // COHORT 0: Always use Y3+ rate (stable farm, already >3 years old)
        // REPLACEMENT GILTS: Use progressive culling based on their individual age SINCE ENTRY
        let stableDemand = 0;

        stableCols.forEach(c => {
            // Only cull cohorts that are already productive
            const cohortLeadTime = c.leadTime !== undefined ? c.leadTime : leadTime;
            const productiveStartMonth = c.arrivalMonth + cohortLeadTime;
            const isProductive = productiveStartMonth <= m || c.isInitialStock;

            if (!isProductive) {
                // Skip - cohort not yet productive, cannot be culled
                return;
            }

            // Calculate months since this cohort became PRODUCTIVE (not since arrival)
            const productiveAgeMonths = c.isInitialStock ? 36 : (m - productiveStartMonth);

            let annualReplacementRate = 0;

            // STABLE FARM (Cohort 0): ALL cohorts use Y3+ rate to maintain stable population
            // This includes initial stock AND all replacement gilts from Cohort 0
            if (c.cohortId === 'COHORT-0-INITIAL' || c.isInitialStock || c.isReplacementFromCohort0) {
                annualReplacementRate = inputs.cullingRateY3Plus || 0.40;

                // Debug log
                if (m <= 36 && annualReplacementRate > 0 && m % 6 === 0) {
                    console.log(`🔍 M${m} Stable ${c.cohortId}: ProdAge=${productiveAgeMonths}mo, Rate=${(annualReplacementRate * 100).toFixed(0)}% (Stable Farm - always Y3+)`);
                }
            }

            const monthlyRate = annualReplacementRate / 12;
            stableDemand += c.count * monthlyRate;
        });

        // Add residue and determine integer target
        const totalStableNeed = stableDemand + stableCullResidue;
        const stableTarget = Math.floor(totalStableNeed);
        stableCullResidue = totalStableNeed - stableTarget; // Save new residue

        // Distribute culling (FIFO - oldest first)
        let remainingStableCull = stableTarget;

        // Sort stable cols by arrival month (oldest first)
        stableCols.sort((a, b) => a.arrivalMonth - b.arrivalMonth);

        const stableCulls = new Map(); // Store cull amount per cohort ID

        for (const c of stableCols) {
            if (remainingStableCull <= 0) break;
            const cohortLeadTime = c.leadTime !== undefined ? c.leadTime : leadTime;
            const isProductive = c.arrivalMonth + cohortLeadTime <= m || c.isInitialStock;
            if (c.arrivalMonth > m || !isProductive) continue;

            // Take as much as possible from this cohort
            const take = Math.min(c.count, remainingStableCull);
            stableCulls.set(c.cohortId, (stableCulls.get(c.cohortId) || 0) + take);
            remainingStableCull -= take;
        }

        // === APPLY CULLING LOOP ===
        // Debug: Show all cohorts being processed
        if (m <= 24 && m % 6 === 0) {
            console.log(`\n🔍 M${m} Culling Loop - Processing ${cohortsToProcess.length} cohorts:`);
        }

        cohortsToProcess.forEach(c => {
            // Skip cohorts that haven't arrived yet
            if (c.arrivalMonth > m) return;

            let cullRounded = 0;

            // Case 1: Stable Farm Cohort
            if (stableCulls.has(c.cohortId)) {
                cullRounded = stableCulls.get(c.cohortId);
            }
            // Case 2: Other Cohorts (Manual/Growth) - Use per-cohort calculation
            else if (!(c.cohortId === 'COHORT-0-INITIAL' || c.isInitialStock || c.isReplacementFromCohort0)) {
                // Only cull cohorts that are already productive
                const cohortLeadTime = c.leadTime !== undefined ? c.leadTime : leadTime;
                const productiveStartMonth = c.arrivalMonth + cohortLeadTime;
                const isProductive = productiveStartMonth <= m;

                // Debug: Show cohort evaluation
                if (m <= 24 && m % 6 === 0) {
                    console.log(`  Cohort ${c.cohortId}: Arr=M${c.arrivalMonth}, Lead=${cohortLeadTime}, ProdStart=M${productiveStartMonth}, IsProductive=${isProductive}`);
                }

                if (!isProductive) {
                    // Skip - cohort not yet productive, cannot be culled
                    return;
                }

                // Calculate months since this cohort became PRODUCTIVE (not since arrival)
                const productiveAgeMonths = m - productiveStartMonth;

                let annualReplacementRate = 0;
                if (productiveAgeMonths < 12) {
                    annualReplacementRate = inputs.cullingRateY1 || 0;      // Year 1: 0%
                } else if (productiveAgeMonths < 24) {
                    annualReplacementRate = inputs.cullingRateY2 || 0.30;   // Year 2: 30%
                } else {
                    annualReplacementRate = inputs.cullingRateY3Plus || 0.40; // Year 3+: 40%
                }

                const cullAmount = c.count * (annualReplacementRate / 12);
                cullRounded = Math.round(cullAmount);

                // Debug logging for manual cohorts
                if (m <= 36 && cullRounded > 0) {
                    const monthlyRate = (annualReplacementRate / 12 * 100).toFixed(2);
                    const exactCull = cullAmount.toFixed(2);
                    console.log(`🔍 M${m} Manual ${c.cohortId}: ProdAge=${productiveAgeMonths}mo, AnnualRate=${(annualReplacementRate * 100).toFixed(0)}%, MonthlyRate=${monthlyRate}%, Count=${c.count}, ExactCull=${exactCull}, Rounded=${cullRounded}`);
                }
            }

            // CULLING LOGIC: Stable Farm vs New Farm
            if (cullRounded > 0) {
                totalGiltArrThisMonth += cullRounded;

                // CRITICAL: Mark if this is a replacement from Cohort 0
                const isFromCohort0 = c.cohortId === 'COHORT-0-INITIAL' || c.isInitialStock || c.isReplacementFromCohort0;
                const cohortLeadTime = c.leadTime !== undefined ? c.leadTime : leadTime;
                const replacementCohortId = `REPL-${c.cohortId}-M${m}`;

                replacementGilts.push({
                    cohortId: replacementCohortId,
                    count: cullRounded,
                    arrivalMonth: m,
                    isInitialStock: false,
                    isReplacementFromCohort0: isFromCohort0, // Inherit
                    ageInMonths: 0,
                    leadTime: cohortLeadTime // Inherit parent's leadTime
                });

                // STABLE FARM: Immediate culling (replacement gilts already available from previous months)
                // NEW FARM: Delayed culling (wait for replacement gilts to become productive)
                if (isFromCohort0) {
                    // IMMEDIATE CULLING for stable farm
                    // Cull happens NOW because replacement gilts from previous months are becoming productive NOW
                    c.count -= cullRounded;
                    totalCulledThisMonth += cullRounded;

                    if (m <= 24) {
                        console.log(`✂️ M${m} IMMEDIATE CULL (Stable Farm): ${cullRounded} from ${c.cohortId} - replacement gilts from previous months are productive now`);
                    }
                } else {
                    // DELAYED CULLING for new farm
                    // Track pending cull: will execute when this replacement becomes productive
                    pendingCullsThisMonth.push({
                        sourceCohortId: c.cohortId,
                        replacementCohortId: replacementCohortId,
                        cullAmount: cullRounded,
                        executeMonth: m + cohortLeadTime // Execute when replacement becomes productive
                    });

                    if (m <= 24) {
                        console.log(`📅 M${m} SCHEDULE CULL (New Farm): ${cullRounded} from ${c.cohortId}, Lead: ${cohortLeadTime}mo → Will execute M${m + cohortLeadTime}`);
                    }
                }
            }
        });


        // === ADD REPLACEMENT GILTS TO SOW COHORTS ===
        // Add all replacement gilts to sowCohorts so they can become productive in future months
        replacementGilts.forEach(rg => {
            sowCohorts.push(rg);

            // Also count Lead=0 replacement gilts as productive THIS month
            const cohortLeadTime = rg.leadTime !== undefined ? rg.leadTime : leadTime;
            const productiveMonth = Math.round(rg.arrivalMonth + cohortLeadTime);
            if (productiveMonth === m && !rg.isInitialStock) {
                sowProdThisMonth += rg.count;
                productiveCohortsThisMonth.push(rg.cohortId);

                if (m === 0) {
                    console.log(`✅ M0 Sow Prod (Lead=0 replacement): ${rg.cohortId} (Count=${rg.count})`);
                }
            }
        });

        // === EXECUTE PENDING CULLS ===
        // Execute culls for replacement gilts that became productive THIS month
        if (!pendingCulls) pendingCulls = [];

        // Add new pending culls to the queue
        pendingCulls.push(...pendingCullsThisMonth);

        // Execute culls scheduled for this month
        const cullsToExecute = pendingCulls.filter(pc => pc.executeMonth === m);

        if (m <= 24 && cullsToExecute.length > 0) {
            console.log(`\n✂️ M${m} EXECUTING CULLS (${cullsToExecute.length} pending culls scheduled for this month):`);
        }

        cullsToExecute.forEach(pc => {
            // Find the source cohort and reduce its count
            const sourceCohort = sowCohorts.find(c => c.cohortId === pc.sourceCohortId);
            if (sourceCohort && sourceCohort.count >= pc.cullAmount) {
                sourceCohort.count -= pc.cullAmount;
                totalCulledThisMonth += pc.cullAmount;

                if (m <= 24) {
                    const isFromCohort0 = sourceCohort.cohortId === 'COHORT-0-INITIAL' || sourceCohort.isInitialStock;
                    console.log(`  ✂️ Culled ${pc.cullAmount} from ${pc.sourceCohortId}${isFromCohort0 ? ' (COHORT 0)' : ''} - replacement ${pc.replacementCohortId} is now productive`);
                }
            }
        });

        // Remove executed culls from pending queue
        pendingCulls = pendingCulls.filter(pc => pc.executeMonth > m);

        if (m <= 3) {
            console.log(`\n📊 Month ${m} Summary:`);
            console.log(`  Total Culled: ${totalCulledThisMonth}`);
            console.log(`  Total Gilt Arr: ${totalGiltArrThisMonth}`);
            console.log(`  Replacement Gilts Added: ${replacementGilts.length} cohorts`);
        }


        // === GILT ARR CALCULATION ===
        // Gilt Arr = Replacement gilts generated this month (already calculated)
        const giltsArrivingThisMonth = totalGiltArrThisMonth;

        // === SOW PROD ALREADY CALCULATED ===
        // sowProdThisMonth was calculated earlier in the culling logic section
        // Use that value directly as giltsProductiveThisMonth
        const giltsProductiveThisMonth = sowProdThisMonth;

        // Enhanced debug logging
        if (m <= 24 && (giltsArrivingThisMonth > 0 || sowProdThisMonth > 0 || totalCulledThisMonth > 0)) {
            console.log(`\n📊 M${m} Summary:`);
            console.log(`  Gilt Arr: ${giltsArrivingThisMonth} (replacements generated from culling)`);
            console.log(`  Sow Prod: ${sowProdThisMonth} (gilts from PREVIOUS months becoming productive)`);
            console.log(`  Culled: ${totalCulledThisMonth} (productive sows culled)`);
            console.log(`  Net Change: ${sowProdThisMonth - totalCulledThisMonth}`);
        }


        // === ACTIVE SOW CALCULATION ===
        // Active Sow = Sum of all cohorts that are productive
        const activeSowsEndMonth = sowCohorts
            .filter(c => {
                const cohortLeadTime = c.leadTime !== undefined ? c.leadTime : leadTime;
                return (c.arrivalMonth + cohortLeadTime <= m || c.isInitialStock) && c.count > 0;
            })
            .reduce((sum, c) => sum + c.count, 0);

        // Net Change = Sow Prod - Culled
        const netChange = (giltsProductiveThisMonth || 0) - (totalCulledThisMonth || 0);

        if (m <= 3) {
            console.log(`📊 Active Sows M${m}: ${Math.round(activeSowsEndMonth)}`);
            console.log(`📊 Net Change M${m}: ${netChange} (Sow Prod ${giltsProductiveThisMonth} - Culled ${totalCulledThisMonth})`);
        }

        monthlyPopulation.push({
            month: m + 1,
            monthYear,
            year,

            // Population dynamics
            activeSows: Math.round(activeSowsEndMonth) || 0,

            // Monthly changes
            giltsArrived: Math.round(giltsArrivingThisMonth) || 0,
            giltsProductive: Math.round(giltsProductiveThisMonth) || 0,
            sowsCulled: Math.round(totalCulledThisMonth) || 0,
            netChange: Math.round(netChange) || 0,
        });
    }

    return monthlyPopulation;
};

// INTEGRATED CALCULATION ENGINE (COMPREHENSIVE BIO-MODEL)
function calculateIntegratedMode(cohorts, params, costParams, months, integratedInputs, nurseryExitPoints, fatteningExitPoints) {
    const projectStartDate = integratedInputs.projectStartDate || '2026-06-01';
    // Debug Log for cohort verification
    if (cohorts && cohorts.length > 0) {
        console.log(`\n=== COHORT DEBUG START ===`);
        console.log(`Project Start Date: ${projectStartDate}`);
        cohorts.forEach((c, idx) => {
            console.log(`Cohort ${idx}: ID=${c.id}, Entry=${c.entryDate}, Count=${c.numberOfGilts}, DaysToFirstMating=${c.daysToFirstMating}`);
        });
        console.log(`=== COHORT DEBUG END ===\n`);
    }

    // Construct consolidated Inputs object
    const inputs = {
        ...integratedInputs,
        projectDuration: Math.ceil(months / 12) || 3,
        projectStartDate,
        giltToFirstMating: integratedInputs.giltToFirstMating || 45,
        gestationDays: integratedInputs.gestationDays || 116,
        lactationDays: integratedInputs.lactationDays || 24,
        drySowDays: integratedInputs.drySowDays || 10,
        nurseryAllocationPercent: integratedInputs.nurseryAllocationPercent || 0,
        // Use explicit fattening allocation if provided (for Breeding Mode), otherwise calculate from nursery
        fatteningAllocationPercent: integratedInputs.fatteningAllocationPercent !== undefined
            ? integratedInputs.fatteningAllocationPercent
            : (1 - (integratedInputs.nurseryAllocationPercent || 0)),
        nurseryExitPoints: nurseryExitPoints,
        fatteningExitPoints: fatteningExitPoints,

        // Culling & Replacement
        cohort0ReplacementRate: integratedInputs.cohort0ReplacementRate !== undefined ? integratedInputs.cohort0ReplacementRate : 40,
        // DYNAMIC CAPACITY: Use the higher of configured capacity OR total manual gilts to ensure replacements scale
        breedingSowCapacity: (() => {
            const manualTotal = cohorts
                .filter(c => !c.autoGenerated)
                .reduce((sum, c) => sum + (parseInt(c.numberOfGilts) || 0), 0);
            const rawCap = parseFloat(integratedInputs.breedingSowCapacity) || 0;
            return Math.max(rawCap, manualTotal);
        })(),
        rawBreedingSowCapacity: parseFloat(integratedInputs.breedingSowCapacity) || 0, // Store raw for logic checks

        cullingRateY1: integratedInputs.cullingRateY1 ?? 0,
        cullingRateY2: integratedInputs.cullingRateY2 ?? 0.30,
        cullingRateY3Plus: integratedInputs.cullingRateY3Plus ?? 0.40,

        // Financial Switches
        includeGiltCost: integratedInputs.includeGiltCost !== false, // Default true
        // Auto-calculate lead time from First Mating delay (Days -> Months)
        giltLeadTime: Math.round((!isNaN(parseFloat(integratedInputs.giltToFirstMating)) ? parseFloat(integratedInputs.giltToFirstMating) : 45) / 30),

        // Params from Breeding/Fattening defaults if missing in integratedInputs
        farrowingRateY1: params.breeding?.farrowingRateY1 !== undefined ? params.breeding.farrowingRateY1 : 0.85,
        farrowingRateY2: params.breeding?.farrowingRateY2 !== undefined ? params.breeding.farrowingRateY2 : 0.90,
        bornAliveY1: params.breeding?.bornAliveY1 !== undefined ? params.breeding.bornAliveY1 : 12,
        bornAliveY2: params.breeding?.bornAliveY2 !== undefined ? params.breeding.bornAliveY2 : 13,
        preWeaningMortalityY1: params.breeding?.preWeaningMortalityY1 !== undefined ? params.breeding.preWeaningMortalityY1 : 0.10,
        preWeaningMortalityY2: params.breeding?.preWeaningMortalityY2 !== undefined ? params.breeding.preWeaningMortalityY2 : 0.08,

        // Growth
        nurseryAdg: !isNaN(parseFloat(integratedInputs.nurseryAdg)) ? parseFloat(integratedInputs.nurseryAdg) : 0.4,
        nurseryMortality: !isNaN(parseFloat(integratedInputs.nurseryMortality)) ? parseFloat(integratedInputs.nurseryMortality) : 0.02,
        fatteningAdg: !isNaN(parseFloat(params.fattening?.adg)) ? parseFloat(params.fattening.adg) : 0.75,
        fatteningMortality: !isNaN(parseFloat(params.fattening?.mortality)) ? parseFloat(params.fattening.mortality) : 0.04,
        y1FatMortalityAdj: 1.25, // Higher mortality in Y1

        weanWeight: 7, // kg

        // Mating
        matingSystem: integratedInputs.matingSystem || 'weekly',
        batchInterval: integratedInputs.batchInterval || 'weekly',

        // Derived Params for Calculation Logic
        giltLeadTime: Math.ceil((integratedInputs.giltToFirstMating || 45) / 30), // Convert days to months
        // Cost Params (passed for financial calc)
        costParams: costParams,
        fatteningCostParams: integratedInputs.fatteningCostParams // Assuming this might be needed or we use passed objects
    };

    // --- INTELLIGENT MODE SWITCHING ---
    // If user has defined a Manual Cohort entering within the first ~4 months,
    // we assume "Manual Initialization" and FORCE the engine into Growth Mode.
    // This suppresses BOTH the Initial Auto-SS AND the Stable-Herd Replacement Logic.
    const hasManualEarlyCohort = cohorts && cohorts.some(c => {
        if (!c.autoGenerated && c.entryDate && projectStartDate) {
            const cDate = new Date(c.entryDate);
            const pDate = new Date(projectStartDate);
            // Limit check to ~120 days
            const cutoffDate = new Date(pDate);
            cutoffDate.setDate(cutoffDate.getDate() + 120);
            return cDate <= cutoffDate;
        }
        return false;
    });

    if (hasManualEarlyCohort) {
        // console.log("DEBUG: FORCED MANUAL MODE - Suppressing Auto-SS and Stable Replacements");
        inputs.rawBreedingSowCapacity = 0; // DISABLE Stable Herd Logic
        inputs.breedingSowCapacity = 0;    // Prevent Auto-SS loop
    }
    // ----------------------------------

    const totalDays = months * 30 + 1000; // Buffer
    const totalMonths = months;

    // Helper: Convert day to date
    const getDayDate = (dayNumber) => {
        const date = new Date(projectStartDate);
        date.setDate(date.getDate() + dayNumber);
        return date.toISOString().split('T')[0];
    };

    // Event Arrays
    const giltArrivals = [];
    const matingEvents = [];
    const farrowingEvents = [];
    const weaningEvents = [];
    const nurseryEntries = [];
    const nurserySales = [];
    const nurseryDeaths = []; // NEW: Track deaths
    const fatteningEntries = [];
    const fatteningSales = [];
    const fatteningDeaths = []; // NEW: Track deaths

    // === STEP 1: Schedule gilt arrivals ===
    // === STEP 1a: AUTO-GENERATE COHORT 0 FROM CURRENT POPULATION ===
    // If "Current Population" field (breedingSowCapacity) has a value AND it's NOT a new farm, create Cohort 0 (Initial Stock)
    // This cohort represents existing inventory and should be immediately active
    const currentPopulation = parseFloat(integratedInputs.breedingSowCapacity) || 0;
    const isNewFarm = integratedInputs.isNewFarm !== false; // Default to true if undefined
    const manualCohorts = cohorts ? cohorts.filter(c => !c.autoGenerated) : [];
    let effectiveCohorts = [];

    // ONLY generate Cohort 0 for EXISTING FARMS with current population
    if (currentPopulation > 0 && !isNewFarm) {
        console.log(`🏠 Auto-generating Cohort 0 from Current Population: ${currentPopulation} sows (Existing Farm)`);
        effectiveCohorts.push({
            id: 'COHORT-0-INITIAL',
            name: 'Cohort 0 (Initial Stock)',
            numberOfGilts: currentPopulation,
            entryDate: projectStartDate,
            daysToFirstMating: 0, // Force immediate activation
            autoGenerated: true,
            isInitialStock: true,
            isCohort0: true // Special flag for Cohort 0
        });
    } else if (isNewFarm) {
        console.log(`🆕 New Farm Mode: Skipping Cohort 0 auto-generation. Use manual cohorts only.`);
    }

    // Add user-defined cohorts (these will be Cohort 1, 2, 3, ...)
    effectiveCohorts = [...effectiveCohorts, ...(cohorts || [])];

    // === STEP 1b: AUTO-POPULATION - Steady State Initialization ===
    // NOTE: We now SKIP the old Auto-SS logic because Cohort 0 is handled above
    // If user wants a stable herd, they should use Current Population field

    // === OLD AUTO-SS LOGIC (COMPLETELY DISABLED) ===
    // This logic is now replaced by the simpler Cohort 0 auto-generation above
    // Commenting out the entire block to prevent conflicts with Cohort 0
    /*
    // AUTO-POPULATION: Steady State Initialization
    // If breedingSowCapacity > 0, we simulate an existing herd distributed across the cycle
    // We do THIS ALWAYS as a baseline if capacity is set. Manual cohorts are ADDITIVE.
    // We do THIS ALWAYS as a baseline if capacity is set. Manual cohorts are ADDITIVE.
    // CHECK RAW INPUT: Only auto-populate if user explicitly requested a Stable Herd (Capacity > 0).
    // CHECK RAW INPUT: Only auto-populate if user explicitly requested a Stable Herd (Capacity > 0).
    // Note: If hasManualEarlyCohort is true, inputs.rawBreedingSowCapacity is already forced to 0 above,
    // so this block will naturally be skipped without complex duplicate checks.
    const rawUserCap = inputs.rawBreedingSowCapacity; // Use the (possibly overridden) value
 
    if (rawUserCap > 0) {
        // FIX: Use ONLY the raw user capacity for Auto-SS generation.
        // Do NOT use the dynamic 'inputs.breedingSowCapacity' because that includes manual cohorts,
        // leading to double counting (AutoSS=ManualTotal + ManualCohorts = 2x).
        const capacity = rawUserCap;
 
        // Distribute sows to ensure events happen weekly immediately from Start
        // Cycle is approx 21 weeks. We cover 26 weeks to be safe and ensure overlap.
        const conversionFactor = 26;
 
 
        const batchSize = capacity / conversionFactor;
 
        // Base back-date: Just the Gilt Mating delay. 
        // We want the freshest cohort to be ready to Mate at Day 0.
        // So Entry Day should be -giltToFirstMating.
        const baseOffset = (inputs.giltToFirstMating || 45);
 
        for (let w = 0; w < conversionFactor; w++) {
            const daysBack = baseOffset + (w * 7);
 
            effectiveCohorts.push({
                id: `AUTO-SS-${w}`,
                entryDate: inputs.projectStartDate,
                numberOfGilts: batchSize,
                ageAtEntry: 7,
                costPerHead: costParams.giltPrice,
                isAutoStart: true,
                forceDayOffset: -daysBack // Negative day!
            });
        }
    }
    */

    // DEBUG: Show effectiveCohorts after Cohort 0 generation
    console.log(`\n=== EFFECTIVE COHORTS AFTER COHORT 0 GEN ===`);
    console.log(`Total effectiveCohorts: ${effectiveCohorts.length}`);
    effectiveCohorts.forEach((c, idx) => {
        console.log(`  [${idx}] ID=${c.id}, Name=${c.name || 'N/A'}, Count=${c.numberOfGilts}, Entry=${c.entryDate}, isCohort0=${c.isCohort0}, autoGen=${c.autoGenerated}`);
    });
    console.log(`=== END EFFECTIVE COHORTS ===\n`);

    // 1b. Process Arrivals
    if (effectiveCohorts.length > 0) {
        effectiveCohorts.forEach(c => {
            // For integrated, let's treat manual cohorts as initial stock
            // SKIP Cohort 0 - it's handled separately as currentPopulation parameter
            if (c.isCohort0) {
                console.log(`⏭️ Skipping Cohort 0 in giltArrivals loop (handled as currentPopulation)`);
                return; // Skip this iteration
            }

            if (!c.autoGenerated || c.isAutoStart) {
                let arrivalDay = 0;

                if (c.forceDayOffset !== undefined) {
                    arrivalDay = c.forceDayOffset;
                }
                else if (c.isAutoStart) {
                    arrivalDay = 0;
                }
                else if (c.entryDate && projectStartDate) {
                    const start = new Date(projectStartDate);
                    const entry = new Date(c.entryDate);

                    console.log(`📅 Date Parsing: Cohort=${c.id}, ProjectStart="${projectStartDate}" -> ${start}, Entry="${c.entryDate}" -> ${entry}`);

                    if (!isNaN(start.getTime()) && !isNaN(entry.getTime())) {
                        // Calculate precise month difference
                        const monthsDiff = (entry.getFullYear() - start.getFullYear()) * 12 + (entry.getMonth() - start.getMonth());
                        // Set day to middle of that month index (e.g. Index 2 -> Day 60) to ensure it lands in correct bin
                        arrivalDay = Math.max(0, monthsDiff * 30);
                        console.log(`📊 Month Calc: monthsDiff=${monthsDiff}, arrivalDay=${arrivalDay}`);
                    }
                }

                // SMART LEAD TIME:
                // Priority 1: Cohort 0 (Initial Stock) is ALWAYS immediately active
                // Priority 2: If a Manual Cohort arrives in the first month (Day <= 30) AND user hasn't set custom lead time,
                //             we assume it is "Existing Inventory" that is already active. Force Lead Time to 0.
                // Priority 3: Respect user's explicit override
                let computedLeadTime = inputs.giltLeadTime;

                // Sanitize user override
                let userLeadDays = c.daysToFirstMating;
                if (userLeadDays === "" || userLeadDays === null || isNaN(parseFloat(userLeadDays))) {
                    userLeadDays = undefined;
                } else {
                    userLeadDays = parseFloat(userLeadDays);
                }

                // PRIORITY 1: Cohort 0 is always immediately active
                if (c.isCohort0) {
                    computedLeadTime = 0;
                    console.log(`🏠 Cohort 0 (Initial Stock): Forced LeadTime=0`);
                }
                // PRIORITY 2: Smart Lead Time for Month 0 arrivals
                else if (arrivalDay <= 30 && userLeadDays === undefined) {
                    computedLeadTime = 0;
                    console.log(`🔍 Smart Lead Time: Month 0 arrival, LeadTime=0`);
                }
                // PRIORITY 3: User explicit override
                else if (userLeadDays !== undefined) {
                    computedLeadTime = Math.ceil(userLeadDays / 30);
                    console.log(`👤 User Override: LeadTime=${computedLeadTime} months (${userLeadDays} days)`);
                }

                console.log(`🔍 Smart Lead Time: Cohort=${c.id}, ArrivalDay=${arrivalDay}, UserDays=${userLeadDays}, FinalLead=${computedLeadTime}`);

                giltArrivals.push({
                    day: arrivalDay || 0, // Fallback to 0 if NaN
                    count: parseFloat(c.numberOfGilts) || 0,
                    cohortId: c.id,
                    year: Math.floor((arrivalDay || 0) / 365) + 1,
                    quarter: Math.floor(((arrivalDay || 0) % 365) / 90) + 1,
                    // Use Computed Lead Time
                    leadTime: computedLeadTime
                });

                console.log(`✅ Gilt Arrival Added: Day=${arrivalDay}, Count=${c.numberOfGilts}, LeadTime=${computedLeadTime}`);

            }
        });
    }


    // === STEP 2: Calculate sow population with culling ===
    // FIX: Use 'inputs' to ensure projectDuration is available
    // Pass currentPopulation as initialStableHerd (Cohort 0 - existing productive sows)
    const sowPopulation = calculateSowPopulationWithCulling(inputs, giltArrivals, currentPopulation);

    // === STEP 3: Schedule mating events ===
    // FIX: Default to 'batch' if matingSystem is undefined or invalid
    const matingSystem = (integratedInputs.matingSystem === 'batch' || integratedInputs.matingSystem === 'continuous')
        ? integratedInputs.matingSystem
        : 'batch'; // Default to batch

    console.log(`🔍 DEBUG: matingSystem = "${integratedInputs.matingSystem}" -> using "${matingSystem}"`);

    if (matingSystem === 'batch') {
        // BATCH MATING LOGIC

        // === COHORT 0 (CURRENT POPULATION) MATING EVENTS ===
        // Handle Cohort 0 separately since it's not in giltArrivals
        console.log(`🔍 DEBUG: currentPopulation = ${currentPopulation}`);
        if (currentPopulation > 0) {
            const cycleDays = inputs.lactationDays + inputs.drySowDays + inputs.gestationDays;

            // Backdate events to simulate stable farm
            // User requested NO ZERO MONTHS.
            // PREVIOUS LOGIC: ceil(cycleDays / 29) -> Interval ~25 days. Causes overlapping chunks (e.g. 34 vs 17) in monthly view.
            // NEW LOGIC: round(cycleDays / 30.5) -> Interval ~30 days. Aligns better with monthly grid, reducing double-spikes.
            const roughBatches = cycleDays / 30.5;
            const numBatches = Math.max(5, Math.round(roughBatches));

            const sowsPerBatch = currentPopulation / numBatches;
            // Let's use exact float to avoiding rounding errors summing up? 
            // Better to round `sowsPerBatch` once? Or keep it float? 
            // If we round 16.66 -> 17. 17 * 6 = 102. Extra 2.
            // If we round 16.66 -> 16. 16 * 6 = 96. Missing 4.
            // Let's use Math.round for now as per previous logic.
            const sowsPerBatchRounded = Math.round(sowsPerBatch);

            console.log(`🏠 Creating mating events for Cohort 0: Pop=${currentPopulation}, Batches=${numBatches}, Sows/Batch=${sowsPerBatch} (Rounded=${sowsPerBatchRounded})`);

            // FIX: Declare farrowingRate outside loops so it's accessible in both
            const year = 1; // Cohort 0 is always Year 1
            const farrowingRate = inputs.farrowingRateY1;

            for (let batch = 0; batch < numBatches; batch++) {
                const backdateOffset = batch * (cycleDays / numBatches);
                // For stable farm, start much earlier to ensure weaning happens before M0
                // Need: Mating -> Gestation (116d) -> Lactation (24d) -> Weaning (140d total)
                // Then: Weaning -> Nursery raising (40d) -> Nursery output (180d from mating)
                // Then: Weaning -> Fattening raising (144d) -> Fattening output (284d from mating)
                // To have output in M0 (day 0-30), we need mating to start at least 180d before M0
                // To have output in M5 (day 150), we need mating at day 150-284 = -134
                // Let's backdate by 2 full cycles to ensure coverage
                let matingDay = -backdateOffset - (2 * cycleDays); // Start 2 cycles in past
                let cycleNum = 1;

                // Loop to project events forward for the entire project duration
                while (matingDay < totalDays) {
                    const year = Math.floor((matingDay + backdateOffset) / 365) + 1; // Approx year calculation
                    const currentFarrowingRate = year === 1 ? inputs.farrowingRateY1 : inputs.farrowingRateY2;

                    // FIX: Separate Raw Mated from Successful
                    const rawMated = Math.round(sowsPerBatch);
                    const successful = Math.round(rawMated * currentFarrowingRate);

                    matingEvents.push({
                        day: matingDay,
                        cohortId: 'COHORT-0-INITIAL',
                        sowsMated: rawMated, // RAW INSEMINATION COUNT (For Table)
                        successfulMatings: successful, // SUCCESSFUL PREGNANCIES (For Farrowing)
                        cycleNumber: cycleNum,
                        farrowingDay: matingDay + inputs.gestationDays,
                        weaningDay: matingDay + inputs.gestationDays + inputs.lactationDays,
                        system: 'batch',
                        isBackdated: matingDay < 0
                    });

                    // Advance to next cycle
                    matingDay += cycleDays;
                    cycleNum++;
                }

                console.log(`  Batch ${batch + 1}: Projection complete (Cycles: ${cycleNum})`);
            }
        }

        // === COHORT 1+ (GILT ARRIVALS) MATING EVENTS ===
        giltArrivals.forEach(arrival => {
            // FIX for Bug #6 (Double Mating):
            // If in Stable Mode (Capacity > 0), the initial Batch Loop (Cohort 0) simulates the FULL PRODUCTION CAPACITY constant flow.
            // Replacement Gilts are just there to "fill the holes" in inventory/cost, but they do NOT add *extra* mating events 
            // because the Cohort 0 loop already assumes "full batch size" forever.
            // Therefore, we MUST skip mating event generation for Replacements in Stable Mode.
            const isStableMode = inputs.breedingSowCapacity > 0;
            const cid = String(arrival.cohortId || '');
            const isReplacement = arrival.isReplacement ||
                arrival.isReplacementFromCohort0 ||
                cid.includes('Stable') ||
                cid.startsWith('REPL') || // Catch generated IDs
                cid.startsWith('GILT-REP'); // Catch internal IDs

            if (isStableMode && isReplacement) {
                // console.log(`⏭️ Skipping Mating Event for Replacement Gilt ${arrival.cohortId} (Stable Mode)`);
                return; // Skip: Production is already covered by Cohort 0 Batch Loop
            }

            const cycleDays = inputs.lactationDays + inputs.drySowDays + inputs.gestationDays;

            // FIX: Distribute cohort into monthly batches for stable production
            // Instead of mating all sows every 150 days, split them into ~5 batches
            // so that there's a batch mating every month
            const numBatches = Math.max(5, Math.round(cycleDays / 30)); // ~5 batches for 150-day cycle
            const sowsPerBatch = arrival.count / numBatches;

            // Create mating events for each batch
            for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
                // Stagger first mating by 30 days per batch
                const firstMatingDay = arrival.day + inputs.giltToFirstMating + (batchIdx * 30);
                let matingDay = firstMatingDay;
                let cycleNum = 1;

                while (matingDay < totalDays) {
                    const year = Math.floor(matingDay / 365) + 1;
                    const farrowingRate = year === 1 ? inputs.farrowingRateY1 : inputs.farrowingRateY2;

                    // FIX: Separate Raw Mated from Successful
                    const rawMated = Math.round(sowsPerBatch);
                    const successful = Math.round(rawMated * farrowingRate);

                    matingEvents.push({
                        day: matingDay,
                        cohortId: arrival.cohortId,
                        sowsMated: rawMated, // RAW INSEMINATION COUNT
                        successfulMatings: successful, // SUCCESSFUL PREGNANCIES
                        cycleNumber: cycleNum,
                        batchIndex: batchIdx, // Track which batch this is
                        farrowingDay: matingDay + inputs.gestationDays,
                        weaningDay: matingDay + inputs.gestationDays + inputs.lactationDays,
                        system: 'batch'
                    });

                    matingDay += cycleDays; // Each batch repeats every cycle
                    cycleNum++;
                }
            }
        });
    } else {
        // WEEKLY MATING LOGIC
        // If Stable Herd (Capacity > 0), Start simulation 1 year back to pre-fill pipeline
        // FIX: Use rawBreedingSowCapacity to distinguish TRUE Stable Mode vs Manual Growth
        const isStableHerd = (inputs.rawBreedingSowCapacity && parseFloat(inputs.rawBreedingSowCapacity) > 0);
        const startDay = isStableHerd ? -380 : 0;

        // TARGET CALCULATION (User Formula)
        // Cycle = Gestation + Lactation + Dry
        const cycleDays = inputs.lactationDays + inputs.drySowDays + inputs.gestationDays;
        const littersPerSowPerYear = 365 / cycleDays;
        const totalLittersPerYear = (isStableHerd ? parseFloat(inputs.breedingSowCapacity) : 0) * littersPerSowPerYear;
        const targetFarrowingPerWeek = totalLittersPerYear / 52;

        for (let day = startDay; day < totalDays; day += 7) {
            const monthIndex = getMonthFromDay(day);
            const useIndex = Math.max(0, monthIndex);
            if (useIndex >= sowPopulation.length && monthIndex >= 0) break;

            const year = Math.floor(day / 365) + 1;
            const farrowingRate = year === 1 ? inputs.farrowingRateY1 : inputs.farrowingRateY2;

            let sowsToMate;

            if (isStableHerd && day < 0) {
                // STABLE HERD (PRE-START): Force Target to prime pipeline
                // Sows to mate per week = Farrowing per week / Farrowing rate
                sowsToMate = targetFarrowingPerWeek / farrowingRate;
            } else {
                // PRODUCTION PHASE (Day 0+): Use Availability (Active Sows)
                // This ensures that if Population expands (Manual Cohorts), production expands too.
                const activeSowsThisWeek = sowPopulation[useIndex]?.activeSows || 0;
                const cyclesPerYear = 365 / cycleDays;
                const weeklyMatingRate = cyclesPerYear / 52;

                // Effective Mating Calculation
                sowsToMate = activeSowsThisWeek * weeklyMatingRate;
            }

            if (sowsToMate > 0) {
                // FIX: Separate Raw Mated (Inseminated) from Successful (Pregnant)
                const effectiveMated = sowsToMate * farrowingRate;

                matingEvents.push({
                    day: day,
                    sowsMated: sowsToMate, // RAW INSEMINATION COUNT (For Table)
                    successfulMatings: effectiveMated, // SUCCESSFUL PREGNANCIES (For Farrowing)

                    weekNumber: Math.floor(day / 7) + 1,
                    farrowingDay: day + inputs.gestationDays,
                    weaningDay: day + inputs.gestationDays + inputs.lactationDays,
                    system: 'weekly'
                });
            }
        }
    }

    // === STEP 4: Calculate farrowings ===
    matingEvents.forEach(mating => {
        const year = Math.floor(mating.day / 365) + 1;
        const bornAlive = year === 1 ? inputs.bornAliveY1 : inputs.bornAliveY2;
        const preWeanMort = year === 1 ? inputs.preWeaningMortalityY1 : inputs.preWeaningMortalityY2;

        // FIX: Use successfulMatings if available (Batch), otherwise fallback to sowsMated (Weekly legacy or if uncalc)
        const sowsFarrowing = mating.successfulMatings !== undefined ? mating.successfulMatings : mating.sowsMated;

        // CORRECT PSY FORMULA: Weaned = Farrowing × Born Alive × (1 - Pre-wean Mortality)
        const pigletsPerFarrowing = bornAlive * (1 - preWeanMort);
        const totalPiglets = sowsFarrowing * pigletsPerFarrowing;

        farrowingEvents.push({
            day: mating.farrowingDay,
            farrowingCount: sowsFarrowing, // Correctly use successful count
            piglets: totalPiglets,
            weaningDay: mating.weaningDay
        });

        // Debug: Log first 10 farrowing events
        if (farrowingEvents.length <= 10) {
            console.log(`🔍 Farrowing Event ${farrowingEvents.length}: Day=${mating.farrowingDay}, Count=${mating.sowsMated}, Piglets=${totalPiglets.toFixed(1)}, CohortID=${mating.cohortId}`);
        }
    });

    // === STEP 5: Calculate weanings ===
    farrowingEvents.forEach(farrowing => {
        weaningEvents.push({
            day: farrowing.weaningDay,
            piglets: farrowing.piglets,
            weaningId: `WEAN-D${farrowing.weaningDay}`
        });
    });

    // === STEP 6: Allocate to nursery/fattening ===
    console.log(`🔍 Allocation Debug: Nursery%=${inputs.nurseryAllocationPercent}, Fattening%=${inputs.fatteningAllocationPercent}`);

    weaningEvents.forEach(weaning => {
        const nurseryCount = weaning.piglets * inputs.nurseryAllocationPercent;
        const fatteningCount = weaning.piglets * inputs.fatteningAllocationPercent;

        // Console log sample allocation for first event
        if (weaning.day < 200) {
            console.log(`🔍 Allocation Sample: Day=${weaning.day}, Weaned=${weaning.piglets} -> Nursery=${nurseryCount}, Fattening=${fatteningCount}`);
        }

        if (nurseryCount > 0) {
            nurseryEntries.push({
                day: weaning.day,
                count: nurseryCount,
                weaningId: weaning.weaningId
            });
        }

        if (fatteningCount > 0) {
            fatteningEntries.push({
                day: weaning.day,
                count: fatteningCount,
                weaningId: weaning.weaningId
            });
        }
    });

    // === STEP 7: Calculate nursery sales ===
    inputs.nurseryExitPoints?.filter(ep => ep.active).forEach(exit => {
        const raisingDays = Math.round((exit.targetWeight - inputs.weanWeight) / inputs.nurseryAdg);

        nurseryEntries.forEach(entry => {
            const saleDay = entry.day + raisingDays;
            if (saleDay < totalDays) {
                const pigsToSell = entry.count * (exit.percentage / 100);
                // Depletion Logic: Sold = In * (1 - Depletion%)
                // If depletion is mortality:
                const depletionRate = (inputs.nurseryDepletion || 0) / 100;
                const pigsSold = pigsToSell * (1 - depletionRate);

                // Revenue calculation (Million IDR)
                const revenue = (pigsSold * exit.targetWeight * exit.pricePerKg) / 1000000;

                const deaths = pigsToSell - pigsSold;
                if (deaths > 0) {
                    nurseryDeaths.push({
                        day: saleDay, // Deaths distributed over time? Simplified: Record roughly at sale time or split? 
                        // For cumulative math, recording at saleDay works to clear them from "Active" count EVENTUALLY. 
                        // But wait, if they die Day 1, they shouldn't eat Day 2-30.
                        // Recording deaths at 'saleDay' means they are considered "Active" until Sale Day.
                        // This implies we PAY for their feed until they would have been sold. 
                        // This is an overestimation of cost, BUT significantly better than paying forever.
                        // For a perfected model, we'd distribute deaths. For this fix, "SaleDay" is a safe 'clearance' timestamp.
                        count: deaths
                    });
                }

                nurserySales.push({
                    day: saleDay,
                    count: pigsSold,
                    weight: exit.targetWeight,
                    pricePerKg: exit.pricePerKg,
                    revenue: revenue
                });
            }
        });
    });

    // === STEP 8: Calculate fattening sales ===
    inputs.fatteningExitPoints?.filter(ep => ep.active).forEach(exit => {
        const raisingDays = Math.round((exit.targetWeight - inputs.weanWeight) / inputs.fatteningAdg);

        fatteningEntries.forEach(entry => {
            const saleDay = entry.day + raisingDays;
            if (saleDay < totalDays) {
                const year = Math.floor(entry.day / 365) + 1;
                // Depletion Logic: Sold = In * (1 - Depletion%)
                const depletionRate = (inputs.fatteningDepletion || 0) / 100;

                const pigsToSell = entry.count * (exit.percentage / 100);
                const pigsSold = pigsToSell * (1 - depletionRate);

                // Revenue calculation (Million IDR)
                const revenue = (pigsSold * exit.targetWeight * exit.pricePerKg) / 1000000;

                const deaths = pigsToSell - pigsSold;
                if (deaths > 0) {
                    fatteningDeaths.push({
                        day: saleDay,
                        count: deaths
                    });
                }

                fatteningSales.push({
                    day: saleDay,
                    count: pigsSold,
                    weight: exit.targetWeight,
                    pricePerKg: exit.pricePerKg,
                    revenue: revenue
                });
            }
        });
    });

    // === STEP 9: Aggregate to monthly view ===
    const monthlyData = [];

    for (let m = 0; m < totalMonths; m++) {
        const monthStartDay = m * 30;
        const monthEndDay = (m + 1) * 30;

        // Get sow population from tracking
        const popData = sowPopulation[m] || {};

        // Events this month
        const monthlyMatingCount = matingEvents
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.sowsMated, 0);

        const monthlyFarrowingCount = farrowingEvents
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.farrowingCount, 0);

        const monthlyPigletsWeaned = weaningEvents
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.piglets, 0);

        const monthlyNurseryIn = nurseryEntries
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.count, 0);

        const monthlyNurserySold = nurserySales
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.count, 0);

        const monthlyNurseryRevenue = nurserySales
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.revenue, 0);

        const monthlyFatteningIn = fatteningEntries
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.count, 0);

        const monthlyFatteningSold = fatteningSales
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.count, 0);

        const monthlyFatteningRevenue = fatteningSales
            .filter(e => e.day >= monthStartDay && e.day < monthEndDay)
            .reduce((sum, e) => sum + e.revenue, 0);


        // --- COSTS CALCULATION (Integrated) ---
        // Calculate year index for escalation (based on calendar year, not gilt age)
        const yearIndex = Math.floor(m / 12);

        // Apply escalation factors
        const feedEscalationFactor = Math.pow(1 + (costParams.feedEscalation || 0), yearIndex);
        const giltEscalationFactor = Math.pow(1 + (costParams.giltCostEscalation || 0), yearIndex);
        const ahpEscalationFactor = Math.pow(1 + (costParams.ahpEscalation || 0), yearIndex);
        const laborEscalationFactor = Math.pow(1 + (costParams.laborEscalation || 0), yearIndex);
        const overheadEscalationFactor = Math.pow(1 + (costParams.overheadEscalation || 0), yearIndex);
        const utilitiesEscalationFactor = Math.pow(1 + (costParams.utilitiesEscalation || 0), yearIndex);

        // Breeding Costs
        // 1. Breeding Feed Costs (Active Sows * Feed/Day) with escalation
        const breedingFeedCost = (popData.activeSows || 0) * (inputs.sowFeedPerDay || 2.5) * 30 * (costParams.feedPricePerKg || 8000) * feedEscalationFactor / 1000000;

        // 2. Nursery Feed Costs (Active Inventory Estimation) with escalation
        const cumNurIn = nurseryEntries.filter(e => e.day < monthEndDay).reduce((sum, e) => sum + e.count, 0);
        const cumNurOut = nurserySales.filter(e => e.day < monthEndDay).reduce((sum, e) => sum + e.count, 0);
        const cumNurDead = nurseryDeaths.filter(e => e.day < monthEndDay).reduce((sum, e) => sum + e.count, 0);
        const activeNur = Math.max(0, cumNurIn - cumNurOut - cumNurDead);
        const nurseryFeedCost = activeNur * (inputs.nurseryAdg || 0.4) * (inputs.nurseryFcr || 1.5) * 30 * (costParams.feedPricePerKg || 8000) * feedEscalationFactor / 1000000;

        // 3. Fattening Feed Costs (Active Inventory Estimation) with escalation
        const cumFatIn = fatteningEntries.filter(e => e.day < monthEndDay).reduce((sum, e) => sum + e.count, 0);
        const cumFatOut = fatteningSales.filter(e => e.day < monthEndDay).reduce((sum, e) => sum + e.count, 0);
        const cumFatDead = fatteningDeaths.filter(e => e.day < monthEndDay).reduce((sum, e) => sum + e.count, 0);
        const activeFat = Math.max(0, cumFatIn - cumFatOut - cumFatDead);
        const fatteningFeedCost = activeFat * (inputs.fatteningAdg || 0.75) * (inputs.fatteningFcr || 2.4) * 30 * (costParams.feedPricePerKg || 8000) * feedEscalationFactor / 1000000;

        // 4. Cull Revenue
        const cullRevenue = (popData.sowsCulled || 0) * 150 * (costParams.giltPrice / 1000000); // Rough est: Sell cull sow at Gilt Price? No, usually lower. 
        // Let's assume Cull Price ~ 60% of Gilt Price or just use a fixed low price? 
        // For now, let's omit Cull Revenue or verify if we have a param. 
        // Inputs don't have cull price. Let's use 0 for safety or simple logic.
        // Actually old code had `cullRev` variable. Let's assume it was 0 or from somewhere. 
        // We'll set it to 0 for now to avoid reference errors and add TODO.
        // 4. Gilt Purchase Costs (Initial + Replacements) with escalation
        // Only include if toggle is ON
        let monthlyGiltCost = 0;
        if (inputs.includeGiltCost) {
            monthlyGiltCost = (popData.giltsArrived || 0) * (costParams.giltPrice / 1000000) * giltEscalationFactor;
        }

        // 4. Cull Revenue
        // inputs.cullSowWeight (default ~150kg? or 250kg?)
        // costParams.cullSowPrice (default 25000?)
        const cullWeight = inputs.cullSowWeight || 180; // Default 180kg
        const cullPrice = costParams.cullSowPrice || 25000;
        const monthlyCullRevenue = (popData.sowsCulled || 0) * cullWeight * (cullPrice / 1000000);

        // 5. Weaner Revenue (for Breeding Mode - when no nursery/fattening)
        // If nursery and fattening allocation is 0, all weaned piglets are sold as weaners
        const isBreedingMode = (inputs.nurseryAllocationPercent === 0 && inputs.fatteningAllocationPercent === 0);
        const weanerPrice = params?.breeding?.weanerPrice || 1200000; // Default 1.2M IDR per head
        const monthlyWeanerRevenue = isBreedingMode ? (monthlyPigletsWeaned * weanerPrice / 1000000) : 0;

        // Debug logging for first few months
        if (m <= 2) {
            console.log(`\n🔍 M${m} BREEDING MODE REVENUE CHECK:`);
            console.log(`  isBreedingMode: ${isBreedingMode}`);
            console.log(`  nurseryAlloc: ${inputs.nurseryAllocationPercent}`);
            console.log(`  fatteningAlloc: ${inputs.fatteningAllocationPercent}`);
            console.log(`  weanerPrice: ${weanerPrice}`);
            console.log(`  pigletsWeaned: ${monthlyPigletsWeaned}`);
            console.log(`  weanerRevenue: ${monthlyWeanerRevenue} Million IDR`);
            console.log(`  cullRevenue: ${monthlyCullRevenue} Million IDR`);
            console.log(`  nurseryRevenue: ${monthlyNurseryRevenue} Million IDR`);
            console.log(`  fatteningRevenue: ${monthlyFatteningRevenue} Million IDR`);
            console.log(`  TOTAL Revenue: ${monthlyNurseryRevenue + monthlyFatteningRevenue + monthlyCullRevenue + monthlyWeanerRevenue} Million IDR`);
            console.log(`  Year Index: ${yearIndex}, Feed Escalation: ${feedEscalationFactor.toFixed(4)}`);
        }

        // TOTALS
        const totalRevenue = monthlyNurseryRevenue + monthlyFatteningRevenue + monthlyCullRevenue + monthlyWeanerRevenue;

        // Fixed costs breakdown with escalation
        const ahpCost = (costParams.ahpPerMonth || 0) * ahpEscalationFactor / 1000000;
        const laborCost = (costParams.laborPerMonth || 0) * laborEscalationFactor / 1000000;
        const overheadCost = (costParams.overheadPerMonth || 0) * overheadEscalationFactor / 1000000;
        const utilityCost = (costParams.utilitiesPerMonth || 0) * utilitiesEscalationFactor / 1000000;
        const fixedCosts = ahpCost + laborCost + overheadCost + utilityCost;

        const totalFeedCost = breedingFeedCost + nurseryFeedCost + fatteningFeedCost;
        const totalCost = totalFeedCost + fixedCosts + monthlyGiltCost;

        monthlyData.push({
            month: m + 1,
            monthLabel: getMonthYear(m, inputs.projectStartDate),

            // Sow Population Dynamics
            activeSows: popData.activeSows || 0,
            activeCohortsDetail: popData.activeCohortsDetail || '',
            sowsInLeadTime: popData.sowsInLeadTime || 0,
            giltsArrived: popData.giltsArrived || 0,
            giltsProductive: popData.giltsProductive || 0,
            sowsCulled: popData.sowsCulled || 0,
            netChange: popData.netChange || 0,

            // Events
            matingCount: monthlyMatingCount,
            sowsMated: monthlyMatingCount, // Compat alias
            farrowingCount: monthlyFarrowingCount,
            pigletsWeaned: monthlyPigletsWeaned,

            // Nursery Flow
            nurseryPigIn: monthlyNurseryIn,
            nurserySold: monthlyNurserySold,

            // Fattening Flow
            fatteningPigIn: monthlyFatteningIn,
            fatteningSold: monthlyFatteningSold,
            exitDetails: [], // Detailed exit breakdown if needed

            // Financials (Top Level)
            revenue: totalRevenue,
            totalRevenue: totalRevenue,
            costs: totalCost,
            totalCost: totalCost,
            netProfit: totalRevenue - totalCost,

            // Detailed Breakdown
            revenueDetails: {
                weaner: monthlyWeanerRevenue,
                cullSow: monthlyCullRevenue,
                nursery: monthlyNurseryRevenue,
                fattening: monthlyFatteningRevenue
            },
            costDetails: {
                // For Integrated Mode compatibility
                breeding: breedingFeedCost,
                nurseryFeed: nurseryFeedCost,
                fatteningFeed: fatteningFeedCost,
                giltCost: monthlyGiltCost,
                fixed: fixedCosts,

                // For Breeding/Fattening Mode breakdown
                giltPurchase: monthlyGiltCost,
                feed: totalFeedCost,
                ahp: ahpCost,
                labor: laborCost,
                overhead: overheadCost,
                utility: utilityCost
            }
        });
    }

    // === STEP 10: Final Aggregation ===
    const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalCosts = monthlyData.reduce((sum, m) => sum + m.costs, 0);
    const totalNetProfit = totalRevenue - totalCosts;

    return {
        timeline: monthlyData,
        summary: {
            totalRevenue,
            totalCosts,
            totalNetProfit,
            avgMonthlyProfit: totalMonths > 0 ? totalNetProfit / totalMonths : 0,
            netMargin: totalRevenue > 0 ? totalNetProfit / totalRevenue : 0,
            // ROI etc can be calculated in UI or here
            roi: totalCosts > 0 ? (totalNetProfit / totalCosts) * 100 : 0
        },
        dailyEvents: {
            matingEvents,
            farrowingEvents,
            weaningEvents
        },
        debug: {
            inputs,
            giltArrivals,
            sowPopulation: sowPopulation.slice(0, 15) // First 15 months
        }
    };
}


// Helper: Calculate cohort population with progressive culling
function calculateCohortPopulation(cohort, monthsInHerd, params) {
    const yearsComplete = Math.floor(monthsInHerd / 12);
    let population = cohort.numberOfGilts;
    let culledThisMonth = 0;

    for (let year = 1; year <= yearsComplete; year++) {
        let rate;
        if (year === 1) rate = params.year1CullingRate;
        else if (year === 2) rate = params.year2CullingRate;
        else rate = params.year3PlusCullingRate;

        const culled = Math.round(population * rate);
        population -= culled;

        if (monthsInHerd === year * 12) {
            culledThisMonth = culled;
        }
    }

    return {
        active: population,
        culled: culledThisMonth
    };
}

// ============================================
// EXTRACTED COMPONENTS (To fix focus issues)
// ============================================

const CostParametersSection = ({ mode, MODES, costParams, setCostParams, currency, t }) => {
    const updateCost = (field, value) => {
        setCostParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    const updateEscalation = (field, value) => {
        setCostParams(prev => ({ ...prev, [field]: parseFloat(value) / 100 || 0 }));
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-800">💰 {t.calculator.costParams.title}</h3>

            {/* Direct Costs */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 bg-red-50 px-3 py-2 rounded">
                    {t.calculator.costParams.directCosts}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {mode === MODES.BREEDING || mode === MODES.INTEGRATED ? `${t.calculator.costParams.giltPrice} (${currency})` : `${t.calculator.costParams.weanerPrice} (${currency})`}
                        </label>
                        <input
                            type="number"
                            value={costParams.giltPrice}
                            onChange={(e) => updateCost('giltPrice', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.calculator.costParams.feedPrice} ({currency}/{t.calculator.common.kg})
                        </label>
                        <input
                            type="number"
                            value={costParams.feedPricePerKg}
                            onChange={(e) => updateCost('feedPricePerKg', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                    {(mode === MODES.BREEDING || mode === MODES.INTEGRATED) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t.calculator.costParams.sowFeedPerDay} ({t.calculator.common.kg})
                            </label>
                            <input
                                type="number"
                                value={costParams.sowFeedPerDay}
                                onChange={(e) => updateCost('sowFeedPerDay', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                step="0.1"
                            />
                        </div>
                    )}
                    {(mode === MODES.BREEDING || mode === MODES.INTEGRATED) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t.calculator.costParams.cullSowPrice} ({currency}/{t.calculator.common.kg})
                            </label>
                            <input
                                type="number"
                                value={costParams.cullSowPrice}
                                onChange={(e) => updateCost('cullSowPrice', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    )}
                    {(mode === MODES.BREEDING || mode === MODES.INTEGRATED) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t.calculator.costParams.cullSowWeight} ({t.calculator.common.kg})
                            </label>
                            <input
                                type="number"
                                value={costParams.cullSowWeight}
                                onChange={(e) => updateCost('cullSowWeight', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Monthly Operating Costs */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 bg-orange-50 px-3 py-2 rounded">
                    {t.calculator.costParams.monthlyOperatingCosts}
                </h4>
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                        <strong>ℹ️ Info:</strong> {t.calculator.costParams.infoText}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.calculator.costParams.ahpPerMonth} ({currency})
                        </label>
                        <input
                            type="number"
                            value={costParams.ahpPerMonth}
                            onChange={(e) => updateCost('ahpPerMonth', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">{t.calculator.costParams.medicineVaccines}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.calculator.costParams.laborPerMonth} ({currency})
                        </label>
                        <input
                            type="number"
                            value={costParams.laborPerMonth}
                            onChange={(e) => updateCost('laborPerMonth', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">{t.calculator.costParams.workersSalaries}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.calculator.costParams.overheadPerMonth} ({currency})
                        </label>
                        <input
                            type="number"
                            value={costParams.overheadPerMonth}
                            onChange={(e) => updateCost('overheadPerMonth', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">{t.calculator.costParams.managementAdmin}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.calculator.costParams.utilitiesPerMonth} ({currency})
                        </label>
                        <input
                            type="number"
                            value={costParams.utilitiesPerMonth}
                            onChange={(e) => updateCost('utilitiesPerMonth', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">{t.calculator.costParams.electricityWater}</p>
                    </div>
                </div>
            </div>

            {/* Escalation Rates */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 bg-amber-50 px-3 py-2 rounded">
                    {t.calculator.costParams.annualCostEscalation}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.costParams.giltWeaner}</label>
                        <input
                            type="number"
                            value={costParams.giltCostEscalation * 100}
                            onChange={(e) => updateEscalation('giltCostEscalation', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.costParams.feed}</label>
                        <input
                            type="number"
                            value={costParams.feedEscalation * 100}
                            onChange={(e) => updateEscalation('feedEscalation', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.costParams.ahp}</label>
                        <input
                            type="number"
                            value={costParams.ahpEscalation * 100}
                            onChange={(e) => updateEscalation('ahpEscalation', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.costParams.labor}</label>
                        <input
                            type="number"
                            value={costParams.laborEscalation * 100}
                            onChange={(e) => updateEscalation('laborEscalation', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.costParams.overhead}</label>
                        <input
                            type="number"
                            value={costParams.overheadEscalation * 100}
                            onChange={(e) => updateEscalation('overheadEscalation', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.costParams.utilities}</label>
                        <input
                            type="number"
                            value={costParams.utilitiesEscalation * 100}
                            onChange={(e) => updateEscalation('utilitiesEscalation', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ModeSelector = ({ mode, setMode, MODES, t }) => (
    <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-xl shadow-sm border inline-flex">
            <button
                onClick={() => setMode(MODES.BREEDING)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${mode === MODES.BREEDING
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
            >
                <div className="flex items-center gap-2">
                    <PiggyBank size={18} />
                    <div className="text-left">
                        <div className="font-bold">{t.calculator.modes.breeding}</div>
                        <div className="text-[10px] opacity-80">{t.calculator.modes.breedingDesc}</div>
                    </div>
                    {mode === MODES.BREEDING && (
                        <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px]">{t.calculator.modes.active}</span>
                    )}
                </div>
            </button>
            <button
                onClick={() => setMode(MODES.FATTENING)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${mode === MODES.FATTENING
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
            >
                <div className="flex items-center gap-2">
                    <TrendingUp size={18} />
                    <div className="text-left">
                        <div className="font-bold">{t.calculator.modes.fattening}</div>
                        <div className="text-[10px] opacity-80">{t.calculator.modes.fatteningDesc}</div>
                    </div>
                    {mode === MODES.FATTENING && (
                        <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px]">{t.calculator.modes.active}</span>
                    )}
                </div>
            </button>
            <button
                onClick={() => setMode(MODES.INTEGRATED)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${mode === MODES.INTEGRATED
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
            >
                <div className="flex items-center gap-2">
                    <Factory size={18} />
                    <div className="text-left">
                        <div className="font-bold">{t.calculator.modes.integrated}</div>
                        <div className="text-[10px] opacity-80">{t.calculator.modes.integratedDesc}</div>
                    </div>
                    {mode === MODES.INTEGRATED && (
                        <span className="mt-3 px-3 py-1 bg-indigo-600 text-white text-xs rounded-full">{t.calculator.modes.active}</span>
                    )}
                </div>
            </button>
        </div>
    </div>
);

// ============================================
// EXTRACTED COMPONENTS (Batch 1)
// ============================================

const CostReferenceGuide = ({ t }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white rounded-lg shadow-sm border-2 border-blue-200 overflow-hidden mt-8">
            {/* Header - Always Visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Info className="text-blue-600" size={24} />
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-gray-800">
                                📚 {t.calculator.costGuide.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {t.calculator.costGuide.subtitle}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-blue-600 font-medium">
                            {isExpanded ? t.calculator.costGuide.collapse : t.calculator.costGuide.expand}
                        </span>
                        {isExpanded ? (
                            <ChevronUp className="text-blue-600" size={20} />
                        ) : (
                            <ChevronDown className="text-blue-600" size={20} />
                        )}
                    </div>
                </div>
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="px-6 py-6 space-y-6">
                    {/* Info Banner */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                            <strong>ℹ️ {t.calculator.costGuide.howToUse}</strong> {t.calculator.costGuide.howToUseText}
                        </p>
                    </div>

                    {/* OVERHEAD COST Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b-2 border-purple-200">
                            <DollarSign className="text-purple-600" size={24} />
                            <h4 className="text-xl font-bold text-gray-800">
                                💼 {t.calculator.costGuide.overheadTitle}
                            </h4>
                        </div>

                        {/* Management & Administration */}
                        <div className="pl-6">
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                                <h5 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                    👔 {t.calculator.costGuide.managementAdmin}
                                </h5>
                                <div className="space-y-2">
                                    {[
                                        t.calculator.costGuide.items.farmManager,
                                        t.calculator.costGuide.items.vetFees,
                                        t.calculator.costGuide.items.adminStaff,
                                        t.calculator.costGuide.items.officeSupplies,
                                        t.calculator.costGuide.items.communication,
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Facility & Compliance */}
                        <div className="pl-6">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                                <h5 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    🏢 {t.calculator.costGuide.facilityCompliance}
                                </h5>
                                <div className="space-y-2">
                                    {[
                                        t.calculator.costGuide.items.landRental,
                                        t.calculator.costGuide.items.propertyInsurance,
                                        t.calculator.costGuide.items.licenses,
                                        t.calculator.costGuide.items.wasteManagement,
                                        t.calculator.costGuide.items.security,
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* General Maintenance */}
                        <div className="pl-6">
                            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                                <h5 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                    🔧 {t.calculator.costGuide.generalMaintenance}
                                </h5>
                                <div className="space-y-2">
                                    {[
                                        t.calculator.costGuide.items.buildingRepairs,
                                        t.calculator.costGuide.items.equipmentMaintenance,
                                        t.calculator.costGuide.items.pestControl,
                                        t.calculator.costGuide.items.farmUpkeep,
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Others */}
                        <div className="pl-6">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    📋 {t.calculator.costGuide.others}
                                </h5>
                                <div className="space-y-2">
                                    {[
                                        t.calculator.costGuide.items.accounting,
                                        t.calculator.costGuide.items.training,
                                        t.calculator.costGuide.items.bankCharges,
                                        t.calculator.costGuide.items.miscAdmin,
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Key Principle */}
                        <div className="pl-6 p-4 bg-purple-100 border-l-4 border-purple-600 rounded">
                            <p className="text-sm text-purple-900">
                                <strong>🔑 {t.calculator.costGuide.keyPrinciple}</strong> {t.calculator.costGuide.overheadPrinciple}
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-gray-300"></div>

                    {/* UTILITIES COST Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b-2 border-orange-200">
                            <Zap className="text-orange-600" size={24} />
                            <h4 className="text-xl font-bold text-gray-800">
                                ⚡ {t.calculator.costGuide.utilitiesTitle}
                            </h4>
                        </div>

                        {/* Energy */}
                        <div className="pl-6">
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-100 rounded-lg p-4">
                                <h5 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                                    🔌 {t.calculator.costGuide.energy}
                                </h5>
                                <div className="space-y-2">
                                    {[
                                        t.calculator.costGuide.items.electricity,
                                        t.calculator.costGuide.items.generatorFuel,
                                        t.calculator.costGuide.items.gasHeating,
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Water */}
                        <div className="pl-6">
                            <div className="bg-gradient-to-r from-cyan-50 to-blue-100 rounded-lg p-4">
                                <h5 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    💧 {t.calculator.costGuide.water}
                                </h5>
                                <div className="space-y-2">
                                    {[
                                        t.calculator.costGuide.items.waterDrinking,
                                        t.calculator.costGuide.items.waterCleaning,
                                        t.calculator.costGuide.items.waterCooling,
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Operational Supplies */}
                        <div className="pl-6">
                            <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg p-4">
                                <h5 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
                                    🧰 {t.calculator.costGuide.operationalSupplies}
                                </h5>

                                {/* Processing Supplies */}
                                <div className="mb-4">
                                    <h6 className="text-sm font-semibold text-teal-800 mb-2">{t.calculator.costGuide.items.processingSupplies}</h6>
                                    <div className="space-y-1 pl-4">
                                        {[
                                            t.calculator.costGuide.items.ironInjection,
                                            t.calculator.costGuide.items.earTags,
                                            t.calculator.costGuide.items.castration,
                                            t.calculator.costGuide.items.umbilical,
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                                <span className="text-teal-600">•</span>
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sanitation Materials */}
                                <div className="mb-4">
                                    <h6 className="text-sm font-semibold text-teal-800 mb-2">{t.calculator.costGuide.items.sanitationMaterials}</h6>
                                    <div className="space-y-1 pl-4">
                                        {[
                                            t.calculator.costGuide.items.disinfectantsRoutine,
                                            t.calculator.costGuide.items.cleaningAgents,
                                            t.calculator.costGuide.items.handSanitizers,
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                                <span className="text-teal-600">•</span>
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Farrowing-Specific */}
                                <div>
                                    <h6 className="text-sm font-semibold text-teal-800 mb-2">{t.calculator.costGuide.items.farrowingSpecific}</h6>
                                    <div className="space-y-1 pl-4">
                                        {[
                                            t.calculator.costGuide.items.extraBedding,
                                            t.calculator.costGuide.items.heatLamps,
                                            t.calculator.costGuide.items.specialCleaning,
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                                <span className="text-teal-600">•</span>
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Principle */}
                        <div className="pl-6 p-4 bg-orange-100 border-l-4 border-orange-600 rounded">
                            <p className="text-sm text-orange-900">
                                <strong>🔑 {t.calculator.costGuide.keyPrinciple}</strong> {t.calculator.costGuide.utilitiesKeyPrinciple}
                            </p>
                        </div>
                    </div>

                    {/* Pro Tips Section */}
                    <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                        <h5 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-2">
                            💡 PRO TIPS FOR ACCURATE BUDGETING
                        </h5>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">1️⃣</span>
                                <div>
                                    <p className="font-semibold text-indigo-900">OVERHEAD:</p>
                                    <p className="text-sm text-gray-700">
                                        Review your actual fixed monthly bills (salary, insurance, rent). Sum them up.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">2️⃣</span>
                                <div>
                                    <p className="font-semibold text-indigo-900">UTILITIES:</p>
                                    <p className="text-sm text-gray-700">
                                        Check last 6 months of electricity/water bills. Calculate average monthly amount.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">3️⃣</span>
                                <div>
                                    <p className="font-semibold text-indigo-900">SEASONAL:</p>
                                    <p className="text-sm text-gray-700">
                                        Factor in higher utilities during summer (cooling) or winter (heating) if applicable.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">4️⃣</span>
                                <div>
                                    <p className="font-semibold text-indigo-900">BUFFER:</p>
                                    <p className="text-sm text-gray-700">
                                        Add 10-15% buffer for unexpected costs and price fluctuations.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FatteningCostSection = ({ fatteningParams, setFatteningParams, fatteningCostParams, setFatteningCostParams, formatNumber, currency }) => {
    const monthlyThroughput = fatteningParams.monthlyPigletPurchase;

    const autoCalcCosts = {
        ahpPerPig: monthlyThroughput > 0 ? fatteningCostParams.ahpPerMonth / monthlyThroughput : 0,
        laborPerPig: monthlyThroughput > 0 ? fatteningCostParams.laborPerMonth / monthlyThroughput : 0,
        overheadPerPig: monthlyThroughput > 0 ? fatteningCostParams.overheadPerMonth / monthlyThroughput : 0,
        utilitiesPerPig: monthlyThroughput > 0 ? fatteningCostParams.utilitiesPerMonth / monthlyThroughput : 0,
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-800">💰 Fattening Cost Parameters</h3>

            {/* Monthly Operating Costs */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 bg-orange-50 px-3 py-2 rounded">
                    Monthly Operating Costs (Total for Whole Farm)
                </h4>
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                        <strong>ℹ️ Info:</strong> Enter your total monthly budget for non-feed costs.
                        Auto-calculated per-pig costs will show based on monthly throughput.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            AHP per Month ({currency})
                        </label>
                        <input
                            type="number"
                            value={fatteningCostParams.ahpPerMonth}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, ahpPerMonth: parseFloat(e.target.value) || 0
                            }))}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Medicine, vaccines, supplements</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Labor per Month ({currency})
                        </label>
                        <input
                            type="number"
                            value={fatteningCostParams.laborPerMonth}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, laborPerMonth: parseFloat(e.target.value) || 0
                            }))}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Workers, salaries, benefits</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Overhead per Month ({currency})
                        </label>
                        <input
                            type="number"
                            value={fatteningCostParams.overheadPerMonth}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, overheadPerMonth: parseFloat(e.target.value) || 0
                            }))}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Management, admin, insurance</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Utilities per Month ({currency})
                        </label>
                        <input
                            type="number"
                            value={fatteningCostParams.utilitiesPerMonth}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, utilitiesPerMonth: parseFloat(e.target.value) || 0
                            }))}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Electricity, water, gas</p>
                    </div>
                </div>
            </div>

            {/* Auto-Calculated Display */}
            {monthlyThroughput > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 bg-purple-50 px-3 py-2 rounded">
                        📊 Auto-Calculated Unit Costs
                    </h4>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 mb-3">
                            Based on <strong>{formatNumber(monthlyThroughput)} pigs/month</strong> throughput
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">• AHP per Pig:</span>
                                <span className="font-semibold">{formatNumber(autoCalcCosts.ahpPerPig, 0)} {currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">• Labor per Pig:</span>
                                <span className="font-semibold">{formatNumber(autoCalcCosts.laborPerPig, 0)} {currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">• Overhead per Pig:</span>
                                <span className="font-semibold">{formatNumber(autoCalcCosts.overheadPerPig, 0)} {currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">• Utilities per Pig:</span>
                                <span className="font-semibold">{formatNumber(autoCalcCosts.utilitiesPerPig, 0)} {currency}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Escalation Rates */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 bg-amber-50 px-3 py-2 rounded">
                    Annual Cost Escalation (%)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Weaner</label>
                        <input
                            type="number"
                            value={fatteningCostParams.weanerEscalation * 100}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, weanerEscalation: parseFloat(e.target.value) / 100 || 0
                            }))}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Feed</label>
                        <input
                            type="number"
                            value={fatteningCostParams.feedEscalation * 100}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, feedEscalation: parseFloat(e.target.value) / 100 || 0
                            }))}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">AHP</label>
                        <input
                            type="number"
                            value={fatteningCostParams.ahpEscalation * 100}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, ahpEscalation: parseFloat(e.target.value) / 100 || 0
                            }))}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Labor</label>
                        <input
                            type="number"
                            value={fatteningCostParams.laborEscalation * 100}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, laborEscalation: parseFloat(e.target.value) / 100 || 0
                            }))}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Overhead</label>
                        <input
                            type="number"
                            value={fatteningCostParams.overheadEscalation * 100}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, overheadEscalation: parseFloat(e.target.value) / 100 || 0
                            }))}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Utilities</label>
                        <input
                            type="number"
                            value={fatteningCostParams.utilitiesEscalation * 100}
                            onChange={(e) => setFatteningCostParams(prev => ({
                                ...prev, utilitiesEscalation: parseFloat(e.target.value) / 100 || 0
                            }))}
                            className="w-full px-2 py-1.5 text-sm border rounded"
                            step="0.1"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// MultiExitSalesSection removed - now using per-barn exit points

const BreedingSetup = ({ cohorts, setCohorts, addCohort, deleteCohort, updateCohort, breedingParams, setBreedingParams, generateReplacementCohorts, mode, MODES, costParams, setCostParams, integratedInputs, setIntegratedInputs, currency, t }) => (
    <div className="space-y-6">
        {/* CALCULATION DATE */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-semibold text-green-800 mb-1">📅 {t.calculator.setup.calculationDate}</h4>
                    <p className="text-xs text-green-600">{t.calculator.setup.calculationDateInfo}</p>
                </div>
                <div className="w-48">
                    <input
                        type="month"
                        value={integratedInputs.projectStartDate || '2026-06'}
                        onChange={(e) => setIntegratedInputs(p => ({ ...p, projectStartDate: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium"
                    />
                </div>
            </div>
        </div>

        {/* FINANCIAL CONFIGURATION */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 flex justify-between items-center shadow-sm">
            <div>
                <h4 className="font-bold text-green-900 flex items-center gap-2">
                    <DollarSign size={18} /> {t.calculator.setup.financialConfig}
                </h4>
                <p className="text-xs text-green-700 mt-1">{t.calculator.setup.financialConfigInfo}</p>
            </div>

            {/* Gilt Cost Toggle */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-green-100 shadow-sm">
                <label className="text-sm font-semibold text-gray-700 cursor-pointer select-none" htmlFor="breedingIncludeGiltCost">
                    {t.calculator.setup.includeGiltCost}
                </label>
                <button
                    id="breedingIncludeGiltCost"
                    onClick={() => setIntegratedInputs(p => ({ ...p, includeGiltCost: !p.includeGiltCost }))}
                    className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 ring-green-400 ring-offset-2 ${integratedInputs.includeGiltCost !== false ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${integratedInputs.includeGiltCost !== false ? 'translate-x-6' : ''}`} />
                </button>
                <div className="text-xs font-mono w-8 text-right text-gray-500">
                    {integratedInputs.includeGiltCost !== false ? 'ON' : 'OFF'}
                </div>
            </div>
        </div>

        {/* Farm Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🏢 {t.calculator.setup.farmInfo}</h2>

            {/* Farm Type Selection */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Factory size={18} className="text-blue-600" />
                    <label className="text-sm font-semibold text-gray-700">{t.calculator.setup.farmType}</label>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIntegratedInputs({ ...integratedInputs, isNewFarm: false })}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${integratedInputs.isNewFarm === false
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <div className="font-semibold">{t.calculator.setup.existingFarm}</div>
                        <div className="text-xs opacity-70">{t.calculator.setup.existingFarmDesc}</div>
                    </button>
                    <button
                        onClick={() => setIntegratedInputs({ ...integratedInputs, isNewFarm: true, breedingSowCapacity: 0, farmStartDate: '' })}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${integratedInputs.isNewFarm === true
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <div className="font-semibold">{t.calculator.setup.newFarm}</div>
                        <div className="text-xs opacity-70">{t.calculator.setup.newFarmDesc}</div>
                    </button>
                </div>
            </div>

            {/* Existing Farm Fields */}
            {integratedInputs.isNewFarm === false && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.calculator.setup.currentSowPopulation}
                        </label>
                        <input
                            type="number"
                            value={integratedInputs.breedingSowCapacity || ''}
                            onChange={(e) => setIntegratedInputs({ ...integratedInputs, breedingSowCapacity: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="e.g., 100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.calculator.setup.farmStartDate}
                            <span className="text-xs text-gray-500 ml-2">{t.calculator.setup.farmStartDateHint}</span>
                        </label>
                        <input
                            type="date"
                            value={integratedInputs.farmStartDate || ''}
                            onChange={(e) => setIntegratedInputs({ ...integratedInputs, farmStartDate: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>

        {/* PROGRESSIVE CULLING STRATEGY */}
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <h3 className="font-bold text-emerald-800 mb-4">
                🔄 {t.calculator.setup.progressiveCulling}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.year1Culling}</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={(integratedInputs.cullingRateY1 || 0) * 100}
                            onChange={(e) => setIntegratedInputs(p => ({ ...p, cullingRateY1: parseFloat(e.target.value) / 100 || 0 }))}
                            className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                            min="0" max="100"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-400 font-medium text-xs">%</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.year2Culling}</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={(integratedInputs.cullingRateY2 || 0.30) * 100}
                            onChange={(e) => setIntegratedInputs(p => ({ ...p, cullingRateY2: parseFloat(e.target.value) / 100 || 0 }))}
                            className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                            min="0" max="100"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-400 font-medium text-xs">%</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.year3Culling}</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={(integratedInputs.cullingRateY3Plus !== undefined ? integratedInputs.cullingRateY3Plus : 0.40) * 100}
                            onChange={(e) => setIntegratedInputs(p => ({ ...p, cullingRateY3Plus: parseFloat(e.target.value) / 100 || 0 }))}
                            className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                            min="0" max="100"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-400 font-medium text-xs">%</span>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <div className="text-xs text-blue-800">
                    <strong>ℹ️ {t.calculator.setup.cullingInfo}</strong> {t.calculator.setup.cullingInfoText}
                </div>
            </div>
        </div>

        {/* Gilt Cohorts */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">🐷 {t.calculator.setup.giltCohorts}</h2>
                <button
                    onClick={addCohort}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                    <Plus size={16} /> {t.calculator.setup.addCohort}
                </button>
            </div>

            {/* Info message explaining Cohort 0 */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                <span className="text-lg">ℹ️</span>
                <div>
                    <strong>{t.calculator.setup.cohortInfo}</strong> {t.calculator.setup.cohortInfoText}
                    <br />
                    {t.calculator.setup.cohortInfoText2} <strong>{t.calculator.setup.cohortInfoText3}</strong> {t.calculator.setup.cohortInfoText4}
                </div>
            </div>

            <div className="space-y-4">
                {cohorts.map((cohort, idx) => (
                    <div key={cohort.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{t.calculator.setup.cohortNumber}{idx + 1}</h3>
                                {cohort.autoGenerated && (
                                    <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">
                                        🔄 {t.calculator.setup.autoGenerated}
                                    </span>
                                )}
                            </div>
                            {cohorts.length > 1 && (
                                <button
                                    onClick={() => deleteCohort(cohort.id)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        {cohort.autoGenerated && cohort.generationReason && (
                            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-700">
                                <strong>📋 {t.calculator.setup.purpose}</strong> {cohort.generationReason}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t.calculator.setup.cohortName}</label>
                                <input
                                    type="text"
                                    value={cohort.name}
                                    onChange={(e) => updateCohort(cohort.id, 'name', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t.calculator.setup.numberOfGilts}</label>
                                <input
                                    type="number"
                                    value={cohort.numberOfGilts}
                                    onChange={(e) => updateCohort(cohort.id, 'numberOfGilts', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t.calculator.setup.entryDate}</label>
                                <input
                                    type="date"
                                    value={cohort.entryDate}
                                    onChange={(e) => updateCohort(cohort.id, 'entryDate', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t.calculator.setup.daysToFirstMating}
                                    <span className="text-xs text-gray-500 ml-2">{t.calculator.setup.leaveEmptyAuto}</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={cohort.daysToFirstMating === undefined ? '' : cohort.daysToFirstMating}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || val === null) {
                                                updateCohort(cohort.id, 'daysToFirstMating', undefined);
                                            } else {
                                                updateCohort(cohort.id, 'daysToFirstMating', parseInt(val) || 0);
                                            }
                                        }}
                                        className="flex-1 px-3 py-2 border rounded-lg"
                                        placeholder={t.calculator.setup.autoPlaceholder}
                                    />
                                    <button
                                        onClick={() => updateCohort(cohort.id, 'daysToFirstMating', undefined)}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                                        title="Clear to use auto lead time"
                                    >
                                        {t.calculator.setup.clear}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Progressive Culling (Only show in Breeding Mode, hidden in Integrated as it has its own section) */}
        {/* Breeding Parameters - Year 1 vs Year 2+ */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">⚙️ {t.calculator.setup.breedingParams}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* YEAR 1 PARAMETERS (Ramp-up period) */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
                        📊 {t.calculator.setup.year1Rampup}
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.farrowingRateY1}</label>
                            <input
                                type="number"
                                value={(breedingParams.farrowingRateY1 !== undefined ? breedingParams.farrowingRateY1 : 0.85) * 100}
                                onChange={(e) => setBreedingParams(prev => ({ ...prev, farrowingRateY1: parseFloat(e.target.value) / 100 || 0 }))}
                                className="w-full px-2 py-1.5 text-sm border rounded"
                                step="1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.bornAliveY1}</label>
                            <input
                                type="number"
                                value={breedingParams.bornAliveY1 !== undefined ? breedingParams.bornAliveY1 : 12}
                                onChange={(e) => setBreedingParams(prev => ({ ...prev, bornAliveY1: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-2 py-1.5 text-sm border rounded"
                                step="0.1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.preWeanMortalityY1}</label>
                            <input
                                type="number"
                                value={(breedingParams.preWeaningMortalityY1 !== undefined ? breedingParams.preWeaningMortalityY1 : 0.10) * 100}
                                onChange={(e) => setBreedingParams(prev => ({ ...prev, preWeaningMortalityY1: parseFloat(e.target.value) / 100 || 0 }))}
                                className="w-full px-2 py-1.5 text-sm border rounded"
                                step="0.1"
                            />
                        </div>
                    </div>
                </div>

                {/* YEAR 2+ PARAMETERS (Full production) */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <h4 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                        ✅ {t.calculator.setup.year2FullProduction}
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.farrowingRateY2}</label>
                            <input
                                type="number"
                                value={(breedingParams.farrowingRateY2 !== undefined ? breedingParams.farrowingRateY2 : 0.90) * 100}
                                onChange={(e) => setBreedingParams(prev => ({ ...prev, farrowingRateY2: parseFloat(e.target.value) / 100 || 0 }))}
                                className="w-full px-2 py-1.5 text-sm border rounded"
                                step="1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.bornAliveY2}</label>
                            <input
                                type="number"
                                value={breedingParams.bornAliveY2 !== undefined ? breedingParams.bornAliveY2 : 13}
                                onChange={(e) => setBreedingParams(prev => ({ ...prev, bornAliveY2: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-2 py-1.5 text-sm border rounded"
                                step="0.1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t.calculator.setup.preWeanMortalityY2}</label>
                            <input
                                type="number"
                                value={(breedingParams.preWeaningMortalityY2 !== undefined ? breedingParams.preWeaningMortalityY2 : 0.08) * 100}
                                onChange={(e) => setBreedingParams(prev => ({ ...prev, preWeaningMortalityY2: parseFloat(e.target.value) / 100 || 0 }))}
                                className="w-full px-2 py-1.5 text-sm border rounded"
                                step="0.1"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* PSY Preview (Auto-Calculated) */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                    📊 {t.calculator.setup.psyPreview}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-xs text-gray-600 mb-1">{t.calculator.setup.cycleDays}</div>
                        <div className="text-2xl font-bold text-blue-700">
                            {(() => {
                                const gestation = integratedInputs?.gestationDays || breedingParams.gestationPeriod || 114;
                                const lactation = integratedInputs?.lactationDays || breedingParams.lactationPeriod || 28;
                                const drySow = integratedInputs?.drySowDays || breedingParams.recoveryDays || 7;
                                return gestation + lactation + drySow;
                            })()}
                        </div>
                        <div className="text-[10px] text-gray-500">
                            {(() => {
                                const gestation = integratedInputs?.gestationDays || breedingParams.gestationPeriod || 114;
                                const lactation = integratedInputs?.lactationDays || breedingParams.lactationPeriod || 28;
                                const drySow = integratedInputs?.drySowDays || breedingParams.recoveryDays || 7;
                                const cycleDays = gestation + lactation + drySow;
                                return (365 / cycleDays).toFixed(1);
                            })()} {t.calculator.setup.littersPerYear}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-600 mb-1">{t.calculator.setup.psyYear1}</div>
                        <div className="text-2xl font-bold text-orange-600">
                            {(() => {
                                const gestation = integratedInputs?.gestationDays || breedingParams.gestationPeriod || 114;
                                const lactation = integratedInputs?.lactationDays || breedingParams.lactationPeriod || 28;
                                const drySow = integratedInputs?.drySowDays || breedingParams.recoveryDays || 7;
                                const cycleDays = gestation + lactation + drySow;
                                const littersPerYear = 365 / cycleDays;
                                const farrowingRate = breedingParams.farrowingRateY1 !== undefined ? breedingParams.farrowingRateY1 : 0.85;
                                const bornAlive = breedingParams.bornAliveY1 !== undefined ? breedingParams.bornAliveY1 : 12;
                                const mortality = breedingParams.preWeaningMortalityY1 !== undefined ? breedingParams.preWeaningMortalityY1 : 0.10;
                                return (farrowingRate * bornAlive * (1 - mortality) * littersPerYear).toFixed(1);
                            })()}
                        </div>
                        <div className="text-[10px] text-gray-500">{t.calculator.setup.pigsSowYear}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-600 mb-1">{t.calculator.setup.psyYear2}</div>
                        <div className="text-2xl font-bold text-green-600">
                            {(() => {
                                const gestation = integratedInputs?.gestationDays || breedingParams.gestationPeriod || 114;
                                const lactation = integratedInputs?.lactationDays || breedingParams.lactationPeriod || 28;
                                const drySow = integratedInputs?.drySowDays || breedingParams.recoveryDays || 7;
                                const cycleDays = gestation + lactation + drySow;
                                const littersPerYear = 365 / cycleDays;
                                const farrowingRate = breedingParams.farrowingRateY2 !== undefined ? breedingParams.farrowingRateY2 : 0.90;
                                const bornAlive = breedingParams.bornAliveY2 !== undefined ? breedingParams.bornAliveY2 : 13;
                                const mortality = breedingParams.preWeaningMortalityY2 !== undefined ? breedingParams.preWeaningMortalityY2 : 0.08;
                                return (farrowingRate * bornAlive * (1 - mortality) * littersPerYear).toFixed(1);
                            })()}
                        </div>
                        <div className="text-[10px] text-gray-500">{t.calculator.setup.pigsSowYear}</div>
                    </div>
                </div>
            </div>

            {/* Weaner Price */}
            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.calculator.setup.weanerPrice} ({currency})</label>
                <input
                    type="number"
                    value={breedingParams.weanerPrice || 0}
                    onChange={(e) => setBreedingParams(prev => ({ ...prev, weanerPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 1200000"
                />
            </div>
        </div>

        {/* Cost Parameters Section */}
        <CostParametersSection mode={mode} MODES={MODES} costParams={costParams} setCostParams={setCostParams} currency={currency} t={t} />
    </div>
);

// ============================================
// EXTRACTED COMPONENTS (Batch 2)
// ============================================

// Barn Management Section for Fattening Mode
const BarnManagementSection = ({
    fatteningBarns,
    setFatteningBarns,
    addBarn,
    deleteBarn,
    updateBarn,
    barnAllocationMethod,
    setBarnAllocationMethod,
    fatteningParams,
    formatNumber,
    currency
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg shadow-sm border border-orange-200 p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Factory size={20} className="text-orange-600" />
                    <h2 className="text-xl font-bold text-gray-800">🏭 Barn / Cohort Management</h2>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                        {fatteningBarns.length} Barn{fatteningBarns.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-600 hover:text-gray-800"
                >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {isExpanded && (
                <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800">
                            <strong>ℹ️ Info:</strong> Manage individual barns/cohorts with staggered pig-in dates.
                            Each barn operates independently with its own production cycle and cost allocation.
                        </p>
                    </div>

                    {/* Allocation Method Selector */}
                    <div className="mb-4 bg-white rounded-lg border p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fixed Cost Allocation Method
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                onClick={() => setBarnAllocationMethod('perCapita')}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${barnAllocationMethod === 'perCapita'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-xs font-semibold">Per Capita</div>
                                <div className="text-[10px] text-gray-500">By headcount</div>
                            </button>
                            <button
                                onClick={() => setBarnAllocationMethod('equalSplit')}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${barnAllocationMethod === 'equalSplit'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-xs font-semibold">Equal Split</div>
                                <div className="text-[10px] text-gray-500">Per active barn</div>
                            </button>
                            <button
                                onClick={() => setBarnAllocationMethod('biomass')}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${barnAllocationMethod === 'biomass'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-xs font-semibold">Biomass ⭐</div>
                                <div className="text-[10px] text-gray-500">Recommended</div>
                            </button>
                        </div>
                    </div>

                    {/* Add Barn Button */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Barn List</h3>
                        <button
                            onClick={addBarn}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                        >
                            <Plus size={16} /> Add Barn
                        </button>
                    </div>

                    {/* Barns List */}
                    {fatteningBarns.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Factory size={48} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500 text-sm">No barns added yet. Click "Add Barn" to start.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {fatteningBarns.map((barn, idx) => (
                                <div key={barn.id} className="border rounded-lg p-4 bg-white">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <Factory size={18} className="text-orange-600" />
                                            <input
                                                type="text"
                                                value={barn.name}
                                                onChange={(e) => updateBarn(barn.id, 'name', e.target.value)}
                                                className="font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-orange-500 outline-none"
                                            />
                                        </div>
                                        {fatteningBarns.length > 1 && (
                                            <button
                                                onClick={() => deleteBarn(barn.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Population (heads)</label>
                                            <input
                                                type="number"
                                                value={barn.population}
                                                onChange={(e) => updateBarn(barn.id, 'population', parseInt(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Pig-In Date</label>
                                            <input
                                                type="date"
                                                value={barn.pigInDate}
                                                onChange={(e) => updateBarn(barn.id, 'pigInDate', e.target.value)}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Weight In (kg)
                                                {barn.weightIn === null && <span className="text-orange-500 ml-1">*</span>}
                                            </label>
                                            <input
                                                type="number"
                                                value={barn.weightIn ?? fatteningParams.weanerPurchaseWeight}
                                                onChange={(e) => updateBarn(barn.id, 'weightIn', e.target.value ? parseFloat(e.target.value) : null)}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                                placeholder={`Default: ${fatteningParams.weanerPurchaseWeight}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                ADG (kg/day)
                                                {barn.adg === null && <span className="text-orange-500 ml-1">*</span>}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={barn.adg ?? fatteningParams.adg}
                                                onChange={(e) => updateBarn(barn.id, 'adg', e.target.value ? parseFloat(e.target.value) : null)}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                                placeholder={`Default: ${fatteningParams.adg}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                FCR
                                                {barn.fcr === null && <span className="text-orange-500 ml-1">*</span>}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={barn.fcr ?? fatteningParams.fcr}
                                                onChange={(e) => updateBarn(barn.id, 'fcr', e.target.value ? parseFloat(e.target.value) : null)}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                                placeholder={`Default: ${fatteningParams.fcr}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Mortality (%)
                                                {barn.mortality === null && <span className="text-orange-500 ml-1">*</span>}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={barn.mortality !== null ? barn.mortality * 100 : fatteningParams.mortality * 100}
                                                onChange={(e) => updateBarn(barn.id, 'mortality', e.target.value ? parseFloat(e.target.value) / 100 : null)}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                                placeholder={`Default: ${fatteningParams.mortality * 100}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Culling Rate (%)
                                                {barn.cullingRate === null && <span className="text-orange-500 ml-1">*</span>}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={barn.cullingRate !== null ? barn.cullingRate * 100 : (fatteningParams.cullingRate || 0) * 100}
                                                onChange={(e) => updateBarn(barn.id, 'cullingRate', e.target.value ? parseFloat(e.target.value) / 100 : null)}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                                placeholder={`Default: ${(fatteningParams.cullingRate || 0) * 100}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Piglet Price ({currency})
                                                {barn.pigletPrice === null && <span className="text-orange-500 ml-1">*</span>}
                                            </label>
                                            <input
                                                type="number"
                                                value={barn.pigletPrice ?? fatteningParams.weanerPurchasePrice}
                                                onChange={(e) => updateBarn(barn.id, 'pigletPrice', e.target.value ? parseFloat(e.target.value) : null)}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                                placeholder={`Default: ${formatNumber(fatteningParams.weanerPurchasePrice)}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-500">
                                        <span className="text-orange-500">*</span> = Using farm default value
                                    </div>

                                    {/* Per-Barn Exit Points */}
                                    <div className="mt-4 border-t pt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-semibold text-gray-700">🎯 Exit Points (Sales Strategy)</h4>
                                            <button
                                                onClick={() => {
                                                    const newExitPoints = [...(barn.exitPoints || [])];
                                                    const newId = newExitPoints.length > 0 ? Math.max(...newExitPoints.map(e => e.id)) + 1 : 1;
                                                    newExitPoints.push({
                                                        id: newId,
                                                        active: true,
                                                        exitMonth: 5,
                                                        targetWeight: 115,
                                                        percentage: 0,
                                                        pricePerKg: 45000
                                                    });
                                                    updateBarn(barn.id, 'exitPoints', newExitPoints);
                                                }}
                                                className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Add Exit Point
                                            </button>
                                        </div>

                                        {/* Exit Points List */}
                                        {barn.exitPoints && barn.exitPoints.length > 0 ? (
                                            <div className="space-y-2">
                                                {barn.exitPoints.map((exit, exitIdx) => {
                                                    const weightIn = barn.weightIn ?? fatteningParams.weanerPurchaseWeight;
                                                    const adg = barn.adg ?? fatteningParams.adg;
                                                    const fcr = barn.fcr ?? fatteningParams.fcr;
                                                    const weightGain = Math.max(0, exit.targetWeight - weightIn);
                                                    const daysInFattening = adg > 0 ? Math.round(weightGain / adg) : 0;
                                                    const feedPerPig = weightGain * fcr;
                                                    const pigsAtExit = Math.round(barn.population * exit.percentage / 100);
                                                    const revenuePerPig = exit.targetWeight * exit.pricePerKg;

                                                    return (
                                                        <div key={exit.id} className="bg-orange-50 border border-orange-200 rounded p-3">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={exit.active}
                                                                        onChange={(e) => {
                                                                            const newExitPoints = [...barn.exitPoints];
                                                                            newExitPoints[exitIdx].active = e.target.checked;
                                                                            updateBarn(barn.id, 'exitPoints', newExitPoints);
                                                                        }}
                                                                        className="rounded"
                                                                    />
                                                                    <span className="text-xs font-semibold text-gray-700">Exit Point #{exitIdx + 1}</span>
                                                                </div>
                                                                {barn.exitPoints.length > 1 && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const newExitPoints = barn.exitPoints.filter(e => e.id !== exit.id);
                                                                            updateBarn(barn.id, 'exitPoints', newExitPoints);
                                                                        }}
                                                                        className="text-red-600 hover:text-red-700"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                <div>
                                                                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Target Weight (kg)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={exit.targetWeight}
                                                                        onChange={(e) => {
                                                                            const newExitPoints = [...barn.exitPoints];
                                                                            newExitPoints[exitIdx].targetWeight = parseFloat(e.target.value) || 0;
                                                                            updateBarn(barn.id, 'exitPoints', newExitPoints);
                                                                        }}
                                                                        className="w-full px-2 py-1 border rounded text-xs"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-medium text-gray-600 mb-1">% of Pigs Sold</label>
                                                                    <input
                                                                        type="number"
                                                                        value={exit.percentage}
                                                                        onChange={(e) => {
                                                                            const newExitPoints = [...barn.exitPoints];
                                                                            newExitPoints[exitIdx].percentage = parseFloat(e.target.value) || 0;
                                                                            updateBarn(barn.id, 'exitPoints', newExitPoints);
                                                                        }}
                                                                        className="w-full px-2 py-1 border rounded text-xs"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Price per kg ({currency})</label>
                                                                    <input
                                                                        type="number"
                                                                        value={exit.pricePerKg}
                                                                        onChange={(e) => {
                                                                            const newExitPoints = [...barn.exitPoints];
                                                                            newExitPoints[exitIdx].pricePerKg = parseFloat(e.target.value) || 0;
                                                                            updateBarn(barn.id, 'exitPoints', newExitPoints);
                                                                        }}
                                                                        className="w-full px-2 py-1 border rounded text-xs"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Days</label>
                                                                    <div className="px-2 py-1 bg-gray-100 border rounded text-xs text-center font-semibold text-gray-700">
                                                                        {daysInFattening}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Exit Point Summary */}
                                                            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                                                                <div className="text-gray-600">
                                                                    🐷 Pigs: <strong>{pigsAtExit}</strong> heads
                                                                </div>
                                                                <div className="text-gray-600">
                                                                    🌾 Feed: <strong>{feedPerPig.toFixed(1)}</strong> kg/pig
                                                                </div>
                                                                <div className="text-green-700">
                                                                    💰 Revenue: <strong>{formatNumber(Math.round(revenuePerPig))}</strong> IDR/pig
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Total Percentage Validation */}
                                                {(() => {
                                                    const totalPct = barn.exitPoints
                                                        .filter(e => e.active)
                                                        .reduce((sum, e) => sum + parseFloat(e.percentage || 0), 0);
                                                    const isValid = Math.abs(totalPct - 100) < 0.01;

                                                    return (
                                                        <div className={`mt-2 p-2 rounded text-xs ${isValid
                                                            ? 'bg-green-50 border border-green-200 text-green-700'
                                                            : 'bg-red-50 border border-red-200 text-red-700'
                                                            }`}>
                                                            <strong>Total:</strong> {totalPct.toFixed(1)}% {isValid ? '✅' : '⚠️ Must equal 100%'}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-500 text-center py-2">
                                                No exit points defined. Click "Add Exit Point" to start.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {fatteningBarns.length > 0 && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="text-sm text-green-800">
                                <strong>✅ Total Capacity:</strong> {fatteningBarns.reduce((sum, b) => sum + b.population, 0)} heads across {fatteningBarns.length} barn{fatteningBarns.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const FatteningSetup = ({
    fatteningParams, setFatteningParams,
    fatteningCostParams, setFatteningCostParams,
    exitPoints, setExitPoints, addExitPoint, deleteExitPoint, updateExitPoint,
    fatteningBarns, setFatteningBarns, addBarn, deleteBarn, updateBarn,
    barnAllocationMethod, setBarnAllocationMethod,
    formatNumber,
    currency,
    t
}) => (
    <div className="space-y-6">
        {/* Barn/Cohort Management Section - MOVED TO TOP */}
        <BarnManagementSection
            fatteningBarns={fatteningBarns}
            setFatteningBarns={setFatteningBarns}
            addBarn={addBarn}
            deleteBarn={deleteBarn}
            updateBarn={updateBarn}
            barnAllocationMethod={barnAllocationMethod}
            setBarnAllocationMethod={setBarnAllocationMethod}
            fatteningParams={fatteningParams}
            formatNumber={formatNumber}
            currency={currency}
        />

        <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🥩 Fattening Parameters</h2>

            {/* Info message when barns exist */}
            {fatteningBarns.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>ℹ️ Barn Mode Active:</strong> Piglet purchases are managed per-barn. Total capacity: <strong>{fatteningBarns.reduce((sum, b) => sum + b.population, 0)} heads</strong> across {fatteningBarns.length} barn{fatteningBarns.length !== 1 ? 's' : ''}.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weaner Price ({currency})</label>
                    <input
                        type="number"
                        value={fatteningParams.weanerPurchasePrice}
                        onChange={(e) => setFatteningParams(prev => ({ ...prev, weanerPurchasePrice: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., 1200000"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ADG (kg/day)</label>
                    <input
                        type="number"
                        value={fatteningParams.adg}
                        onChange={(e) => setFatteningParams(prev => ({ ...prev, adg: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        step="0.01"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FCR</label>
                    <input
                        type="number"
                        value={fatteningParams.fcr}
                        onChange={(e) => setFatteningParams(prev => ({ ...prev, fcr: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        step="0.1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mortality (%)</label>
                    <input
                        type="number"
                        value={fatteningParams.mortality * 100}
                        onChange={(e) => setFatteningParams(prev => ({ ...prev, mortality: parseFloat(e.target.value) / 100 || 0 }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        step="0.1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Culling Rate (%)</label>
                    <input
                        type="number"
                        value={(fatteningParams.cullingRate || 0) * 100}
                        onChange={(e) => setFatteningParams(prev => ({ ...prev, cullingRate: parseFloat(e.target.value) / 100 || 0 }))}
                        className="w-full px-3 py-2 border rounded-lg"
                        step="0.1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cleaning Period (days)</label>
                    <input
                        type="number"
                        value={fatteningParams.cleaningPeriodDays || 14}
                        onChange={(e) => setFatteningParams(prev => ({ ...prev, cleaningPeriodDays: parseInt(e.target.value) || 14 }))}
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feed Price ({currency}/kg)</label>
                    <input
                        type="number"
                        value={fatteningParams.feedPrice}
                        onChange={(e) => setFatteningParams(prev => ({ ...prev, feedPrice: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
            </div>
        </div>

        {/* New Cost Section */}
        <FatteningCostSection
            fatteningParams={fatteningParams}
            setFatteningParams={setFatteningParams}
            fatteningCostParams={fatteningCostParams}
            setFatteningCostParams={setFatteningCostParams}
            formatNumber={formatNumber}
            currency={currency}
        />
    </div>
);

// Generic Multi-Exit Strategy Component (Reusable for Nursery & Fattening)
const MultiExitStrategy = ({
    title,
    icon,
    colorTheme, // 'purple', 'orange', 'blue'
    exitPoints,
    setExitPoints,
    addExitPoint,
    deleteExitPoint,
    updateExitPoint,
    baseWeight, // Weight at start of this phase (weaner weight for nursery, nursery weight for fattening)
    adg,
    fcr,
    feedCostPerKg,
    totalPigsIn,
    mortalityRate,
    priceLabel = "Price per kg",
    formatNumber,
    currency
}) => {
    const totalPercentage = exitPoints
        .filter(e => e.active)
        .reduce((sum, e) => sum + parseFloat(e.percentage || 0), 0);

    const isValid = Math.abs(totalPercentage - 100) < 0.01;

    // Theme colors
    const themes = {
        purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', borderActive: 'border-purple-300' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', borderActive: 'border-orange-300' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', borderActive: 'border-blue-300' },
    };
    const theme = themes[colorTheme] || themes.blue;

    return (
        <div className={`bg-white rounded-lg shadow-sm border p-6 space-y-4`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <h3 className={`text-lg font-bold ${theme.text}`}>{title}</h3>
                </div>
                <button
                    onClick={addExitPoint}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                >
                    <Plus size={14} /> Add Exit Point
                </button>
            </div>

            <div className={`p-3 rounded-lg border ${theme.border} ${theme.bg}`}>
                <p className={`text-sm ${theme.text}`}>
                    <strong>ℹ️ Info:</strong> Define multiple exit points. Total percentage must equal 100%.
                </p>
            </div>

            {/* Exit Points List */}
            <div className="space-y-3">
                {exitPoints.map((exit, idx) => {
                    // Start weight logic: 
                    // If existing logic assumes 'baseWeight' as input weight
                    const weightGain = Math.max(0, exit.targetWeight - baseWeight);
                    const daysInPhase = adg > 0 ? weightGain / adg : 0;
                    const feedNeeded = weightGain * fcr;

                    // Simple population model for this specific line (ignoring complex monthly flow here, just unit check)
                    const pigsAtThisExit = Math.round(
                        totalPigsIn *
                        (exit.percentage / 100)
                    );

                    return (
                        <div
                            key={exit.id}
                            className={`border-2 rounded-lg p-4 ${exit.active ? `${theme.borderActive} ${theme.bg}` : 'border-gray-200 bg-gray-50'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-semibold text-gray-800">Exit Point #{idx + 1}</h4>
                                <div className="flex gap-2">
                                    <label className="flex items-center gap-1 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={exit.active}
                                            onChange={(e) => updateExitPoint(exit.id, 'active', e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        Active
                                    </label>
                                    {exitPoints.length > 1 && (
                                        <button
                                            onClick={() => deleteExitPoint(exit.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Exit Month (from Entry)
                                    </label>
                                    <input
                                        type="number"
                                        value={exit.exitMonth}
                                        onChange={(e) => updateExitPoint(exit.id, 'exitMonth', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-lg"
                                        step="0.5"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Target Weight (kg)
                                    </label>
                                    <input
                                        type="number"
                                        value={exit.targetWeight}
                                        onChange={(e) => updateExitPoint(exit.id, 'targetWeight', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        % of Pigs Sold
                                    </label>
                                    <input
                                        type="number"
                                        value={exit.percentage}
                                        onChange={(e) => updateExitPoint(exit.id, 'percentage', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-lg"
                                        min="0"
                                        max="100"
                                        step="1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        {priceLabel} ({currency})
                                    </label>
                                    <input
                                        type="number"
                                        value={exit.pricePerKg}
                                        onChange={(e) => updateExitPoint(exit.id, 'pricePerKg', parseFloat(e.target.value) || 0)}
                                        className="w-full px-2 py-1.5 text-sm border rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Calculated Metrics */}
                            {exit.active && (
                                <div className="p-3 bg-white rounded-lg border">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700">
                                        <div>
                                            <span className="block text-gray-500">Weight Gain</span>
                                            <span className="font-semibold">{weightGain.toFixed(1)} kg</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500">Days in Phase</span>
                                            <span className="font-semibold">{Math.round(daysInPhase)} days</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500">Feed/Pig</span>
                                            <span className="font-semibold">{feedNeeded.toFixed(1)} kg</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-500">Est. Revenue/Hd</span>
                                            <span className="font-semibold text-green-600">
                                                {formatNumber(exit.targetWeight * exit.pricePerKg / 1000, 0)}K
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Validation Summary */}
            <div className={`p-4 rounded-lg border-2 ${isValid ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                <div className="flex justify-between items-center text-sm">
                    <span>Total % Allocated:</span>
                    <span className={`font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {totalPercentage.toFixed(1)}% {isValid ? '✓' : '✗ Must be 100%'}
                    </span>
                </div>
            </div>
        </div>
    );
};

// HELPER: Mating System Calculations
const calculateNumberOfBatches = (inputs) => {
    if (inputs.matingSystem === 'weekly') return 1;
    const cycleDays = (inputs.lactationDays || 24) + (inputs.drySowDays || 10) + (inputs.gestationDays || 116);
    if (inputs.batchInterval === 'weekly') return Math.ceil(cycleDays / 7);
    if (inputs.batchInterval === 'biweekly') return Math.ceil(cycleDays / 14);
    return Math.ceil(cycleDays / 30);
};

const calculateWeeklySowsMated = (inputs) => {
    const cycleDays = (inputs.lactationDays || 24) + (inputs.drySowDays || 10) + (inputs.gestationDays || 116);
    const cyclesPerYear = 365 / cycleDays;
    return ((inputs.breedingSowCapacity || 100) * cyclesPerYear) / 52;
};

const calculateWeeklyPiglets = (inputs) => {
    const weeklyMatings = calculateWeeklySowsMated(inputs);
    const farrowingRate = inputs.farrowingRateY2 || 0.90;
    const bornAlive = inputs.bornAliveY2 || 13;
    const preWeanMort = inputs.preWeaningMortalityY2 || 0.10;
    return weeklyMatings * farrowingRate * bornAlive * (1 - preWeanMort);
};

const InputField = ({ label, value, onChange, suffix, type = 'number', small, step }) => (
    <div className="mb-2">
        <label className={`block font-medium text-gray-700 mb-1 ${small ? 'text-xs' : 'text-sm'}`}>{label}</label>
        <div className="relative">
            <input
                type={type}
                value={(value === undefined || value === null || (type === 'number' && isNaN(value))) ? '' : value}
                onChange={(e) => {
                    const val = e.target.value;
                    onChange(type === 'number' ? (val === '' ? 0 : parseFloat(val)) : val);
                }}
                className={`w-full border rounded-lg ${small ? 'px-2 py-1 text-sm' : 'px-3 py-2'}`}
                step={step}
            />
            {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                    {suffix}
                </span>
            )}
        </div>
    </div>
);

const IntegratedSetup = ({
    integratedParams, setIntegratedParams,
    cohorts, setCohorts, addCohort, deleteCohort, updateCohort,
    breedingParams, setBreedingParams, generateReplacementCohorts,
    mode, MODES, costParams, setCostParams, formatNumber,
    // New Props for Integration
    nurseryExitPoints, setNurseryExitPoints,
    fatteningExitPoints, setFatteningExitPoints,
    integratedInputs, setIntegratedInputs,
    onSave, // NEW PROP
    currency,
    t
}) => {
    // Helper to manage Nursery Exit Points
    const addNurseryExit = () => {
        const newId = Math.max(...nurseryExitPoints.map(e => e.id), 0) + 1;
        setNurseryExitPoints([...nurseryExitPoints, {
            id: newId, active: true, exitMonth: 2.5, targetWeight: 20, percentage: 0, pricePerKg: 55000
        }]);
    };
    const updateNurseryExit = (id, field, val) => {
        setNurseryExitPoints(nurseryExitPoints.map(e => e.id === id ? { ...e, [field]: val } : e));
    };
    const deleteNurseryExit = (id) => {
        setNurseryExitPoints(nurseryExitPoints.filter(e => e.id !== id));
    };

    // Helper to manage Fattening Exit Points
    const addFatteningExit = () => {
        const newId = Math.max(...fatteningExitPoints.map(e => e.id), 0) + 1;
        setFatteningExitPoints([...fatteningExitPoints, {
            id: newId, active: true, exitMonth: 6, targetWeight: 110, percentage: 0, pricePerKg: 45000
        }]);
    };
    const updateFatteningExit = (id, field, val) => {
        setFatteningExitPoints(fatteningExitPoints.map(e => e.id === id ? { ...e, [field]: val } : e));
    };
    const deleteFatteningExit = (id) => {
        setFatteningExitPoints(fatteningExitPoints.filter(e => e.id !== id));
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Factory className="text-purple-600" /> Integrated Farm Setup
            </h3>

            {/* CALCULATION DATE - Placed before Financial Configuration */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-semibold text-green-800 mb-1">📅 {t.calculator.setup.calculationDate}</h4>
                        <p className="text-xs text-green-600">{t.calculator.setup.calculationDateInfo}</p>
                    </div>
                    <div className="w-48">
                        <input
                            type="month"
                            value={integratedInputs.projectStartDate || '2026-06'}
                            onChange={(e) => setIntegratedInputs(p => ({ ...p, projectStartDate: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* FINANCIAL SETTINGS CARD (Prominent) */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 flex justify-between items-center shadow-sm">
                <div>
                    <h4 className="font-bold text-green-900 flex items-center gap-2">
                        <DollarSign size={18} /> Financial Configuration
                    </h4>
                    <p className="text-xs text-green-700 mt-1">Adjust how costs are calculated in the financial report.</p>
                </div>

                {/* Gilt Cost Toggle */}
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-green-100 shadow-sm">
                    <label className="text-sm font-semibold text-gray-700 cursor-pointer select-none" htmlFor="includeGiltCost">
                        Include Gilt Purchase Cost
                    </label>
                    <button
                        id="includeGiltCost"
                        onClick={() => setIntegratedInputs(p => ({ ...p, includeGiltCost: !p.includeGiltCost }))}
                        className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 ring-green-400 ring-offset-2 ${integratedInputs.includeGiltCost !== false ? 'bg-green-600' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${integratedInputs.includeGiltCost !== false ? 'translate-x-6' : ''}`} />
                    </button>
                    <div className="text-xs font-mono w-8 text-right text-gray-500">
                        {integratedInputs.includeGiltCost !== false ? 'ON' : 'OFF'}
                    </div>
                </div>
            </div>

            {/* FARM INFORMATION INPUTS */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-gray-700">Farm Information</h4>
                </div>

                {/* FARM TYPE TOGGLE */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="font-bold text-blue-800 mb-1">🏭 Farm Type</h5>
                            <p className="text-xs text-blue-600">
                                {integratedInputs.isNewFarm
                                    ? "New farm - Build population using cohorts below"
                                    : "Existing farm - Enter current sow population"}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIntegratedInputs(p => ({ ...p, isNewFarm: false, breedingSowCapacity: p.isNewFarm ? 0 : p.breedingSowCapacity }))}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${!integratedInputs.isNewFarm
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                Existing Farm
                            </button>
                            <button
                                onClick={() => setIntegratedInputs(p => ({ ...p, isNewFarm: true, breedingSowCapacity: 0 }))}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${integratedInputs.isNewFarm
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                New Farm
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CONDITIONAL: Only show Farm Start Date and Current Population for EXISTING FARM */}
                    {!integratedInputs.isNewFarm && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Farm Start Date</label>
                                <input
                                    type="month"
                                    value={integratedInputs.farmStartDate || '2024-01'}
                                    onChange={(e) => setIntegratedInputs(p => ({ ...p, farmStartDate: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">When did the farm start operating?</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Population (Sows)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={integratedInputs.breedingSowCapacity}
                                        onChange={(e) => setIntegratedInputs(p => ({ ...p, breedingSowCapacity: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                                        min="0"
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-400 font-medium">Heads</span>
                                </div>
                                <p className="text-xs text-blue-600 mt-1 font-medium">Forms Cohort 0 (Stable Herd)</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* GILT COHORTS SECTION (Inline from BreedingSetup) */}
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

                {/* Info message explaining Cohort 0 */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-lg">ℹ️</span>
                    <div>
                        <strong>Cohort 0 (Initial Stock)</strong> is automatically created from the "Current Population" field above and is immediately active in Month 0.
                        <br />
                        Use this section to add <strong>future gilt purchases</strong> (Cohort 1, 2, 3, etc.).
                    </div>
                </div>

                <div className="space-y-4">
                    {cohorts.map((cohort, idx) => (
                        <div key={cohort.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">Cohort #{idx + 1}</h3>
                                    {cohort.autoGenerated && (
                                        <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">
                                            🔄 Auto-Generated
                                        </span>
                                    )}
                                </div>
                                {cohorts.length > 1 && (
                                    <button
                                        onClick={() => deleteCohort(cohort.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            {cohort.autoGenerated && cohort.generationReason && (
                                <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-700">
                                    <strong>📋 Purpose:</strong> {cohort.generationReason}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Name</label>
                                    <input
                                        type="text"
                                        value={cohort.name}
                                        onChange={(e) => updateCohort(cohort.id, 'name', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Gilts</label>
                                    <input
                                        type="number"
                                        value={cohort.numberOfGilts}
                                        onChange={(e) => updateCohort(cohort.id, 'numberOfGilts', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
                                    <input
                                        type="date"
                                        value={cohort.entryDate}
                                        onChange={(e) => updateCohort(cohort.id, 'entryDate', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Days to First Mating
                                        <span className="text-xs text-gray-500 ml-2">(Leave empty for auto)</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <input
                                            type="number"
                                            value={cohort.daysToFirstMating === undefined ? '' : cohort.daysToFirstMating}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || val === null) {
                                                    updateCohort(cohort.id, 'daysToFirstMating', undefined);
                                                } else {
                                                    updateCohort(cohort.id, 'daysToFirstMating', parseInt(val) || 0);
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 border rounded-lg"
                                            placeholder="Auto (0 for Month 0)"
                                        />
                                        <button
                                            onClick={() => updateCohort(cohort.id, 'daysToFirstMating', undefined)}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                                            title="Clear to use auto lead time"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PROGRESSIVE CULLING STRATEGY */}
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200 mb-6">
                <h3 className="font-bold text-emerald-800 mb-4">
                    🔄 Progressive Culling & Replacement Strategy
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <InputField label="Year 1 Culling & Replacement (%)"
                        value={(integratedInputs.cullingRateY1 || 0) * 100}
                        onChange={(v) => setIntegratedInputs(p => ({ ...p, cullingRateY1: v / 100 }))}
                        suffix="%" small />
                    <InputField label="Year 2 Culling & Replacement (%)"
                        value={(integratedInputs.cullingRateY2 || 0.30) * 100}
                        onChange={(v) => setIntegratedInputs(p => ({ ...p, cullingRateY2: v / 100 }))}
                        suffix="%" small />
                    <div className="">
                        <label className="block text-xs font-medium text-gray-700 mb-1" style={{ fontSize: '0.65rem', lineHeight: '1rem' }}>Year 3+ and Stable Farm Culling & Replacement (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={(integratedInputs.cullingRateY3Plus !== undefined ? integratedInputs.cullingRateY3Plus : 0.40) * 100}
                                onChange={(e) => setIntegratedInputs(p => ({ ...p, cullingRateY3Plus: parseFloat(e.target.value) / 100 || 0 }))}
                                className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                                min="0" max="100"
                            />
                            <span className="absolute right-2 top-1.5 text-gray-400 font-medium text-xs">%</span>
                        </div>
                    </div>


                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <div className="text-xs text-blue-800">
                        <strong>ℹ️ How it works:</strong> Replacement gilts added monthly based on culling.
                        Monthly rate = (Annual Culling % × Cohort Population) ÷ 12.
                    </div>
                </div>
            </div>

            {/* BREEDING PARAMETERS - YEAR 1 vs YEAR 2+ */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">⚙️ Breeding Parameters (Year 1 vs Year 2+)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* YEAR 1 PARAMETERS (Ramp-up period) */}
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                            <span>📅</span> Year 1 (Ramp-up)
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Farrowing Rate Y1 (%)</label>
                                <input
                                    type="number"
                                    value={(integratedParams.breeding.farrowingRateY1 ?? 0.85) * 100}
                                    onChange={(e) => setIntegratedParams(prev => ({
                                        ...prev,
                                        breeding: { ...prev.breeding, farrowingRateY1: parseFloat(e.target.value) / 100 || 0 }
                                    }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    step="1"
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Born Alive per Litter Y1</label>
                                <input
                                    type="number"
                                    value={integratedParams.breeding.bornAliveY1 ?? 12}
                                    onChange={(e) => setIntegratedParams(prev => ({
                                        ...prev,
                                        breeding: { ...prev.breeding, bornAliveY1: parseFloat(e.target.value) || 0 }
                                    }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Wean Mortality Y1 (%)</label>
                                <input
                                    type="number"
                                    value={(integratedParams.breeding.preWeaningMortalityY1 ?? 0.10) * 100}
                                    onChange={(e) => setIntegratedParams(prev => ({
                                        ...prev,
                                        breeding: { ...prev.breeding, preWeaningMortalityY1: parseFloat(e.target.value) / 100 || 0 }
                                    }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    step="1"
                                    min="0"
                                    max="100"
                                />
                            </div>
                        </div>
                    </div>

                    {/* YEAR 2+ PARAMETERS (Stable/Full Production) */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                            <span>✅</span> Year 2+ (Full Production)
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Farrowing Rate Y2+ (%)</label>
                                <input
                                    type="number"
                                    value={(integratedParams.breeding.farrowingRateY2 ?? 0.90) * 100}
                                    onChange={(e) => setIntegratedParams(prev => ({
                                        ...prev,
                                        breeding: { ...prev.breeding, farrowingRateY2: parseFloat(e.target.value) / 100 || 0 }
                                    }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    step="1"
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Born Alive per Litter Y2+</label>
                                <input
                                    type="number"
                                    value={integratedParams.breeding.bornAliveY2 ?? 13}
                                    onChange={(e) => setIntegratedParams(prev => ({
                                        ...prev,
                                        breeding: { ...prev.breeding, bornAliveY2: parseFloat(e.target.value) || 0 }
                                    }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    step="0.1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Wean Mortality Y2+ (%)</label>
                                <input
                                    type="number"
                                    value={(integratedParams.breeding.preWeaningMortalityY2 ?? 0.08) * 100}
                                    onChange={(e) => setIntegratedParams(prev => ({
                                        ...prev,
                                        breeding: { ...prev.breeding, preWeaningMortalityY2: parseFloat(e.target.value) / 100 || 0 }
                                    }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    step="1"
                                    min="0"
                                    max="100"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* PSY PREVIEW - Auto Calculated */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">📊 PSY Preview (Auto-Calculated)</h4>
                    {(() => {
                        const gestationDays = integratedInputs.gestationDays || 116;
                        const lactationDays = integratedInputs.lactationDays || 24;
                        const drySowDays = integratedInputs.drySowDays || 10;
                        const cycleDays = gestationDays + lactationDays + drySowDays;
                        const littersPerYear = 365 / cycleDays;

                        const farrowingRateY1 = integratedParams.breeding.farrowingRateY1 ?? 0.85;
                        const bornAliveY1 = integratedParams.breeding.bornAliveY1 ?? 12;
                        const preWeanMortY1 = integratedParams.breeding.preWeaningMortalityY1 ?? 0.10;

                        const farrowingRateY2 = integratedParams.breeding.farrowingRateY2 ?? 0.90;
                        const bornAliveY2 = integratedParams.breeding.bornAliveY2 ?? 13;
                        const preWeanMortY2 = integratedParams.breeding.preWeaningMortalityY2 ?? 0.08;

                        const psyY1 = littersPerYear * farrowingRateY1 * bornAliveY1 * (1 - preWeanMortY1);
                        const psyY2 = littersPerYear * farrowingRateY2 * bornAliveY2 * (1 - preWeanMortY2);

                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                                <div className="bg-white p-3 rounded-lg">
                                    <div className="text-xs text-gray-500">Cycle Days</div>
                                    <div className="text-2xl font-bold text-gray-700">{cycleDays}</div>
                                    <div className="text-xs text-gray-400">{littersPerYear.toFixed(2)} litters/year</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg">
                                    <div className="text-xs text-gray-500">PSY Year 1</div>
                                    <div className="text-2xl font-bold text-yellow-600">{psyY1.toFixed(1)}</div>
                                    <div className="text-xs text-gray-400">pigs/sow/year</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg">
                                    <div className="text-xs text-gray-500">PSY Year 2+</div>
                                    <div className="text-2xl font-bold text-green-600">{psyY2.toFixed(1)}</div>
                                    <div className="text-xs text-gray-400">pigs/sow/year</div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Legacy Weaner Price */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weaner Price ({currency})</label>
                    <input
                        type="number"
                        value={integratedParams.breeding.weanerPrice}
                        onChange={(e) => setIntegratedParams(prev => ({
                            ...prev,
                            breeding: { ...prev.breeding, weanerPrice: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg max-w-xs"
                    />
                </div>
            </div>

            {/* COST PARAMETERS SECTION */}
            <CostParametersSection mode={mode} MODES={MODES} costParams={costParams} setCostParams={setCostParams} currency={currency} t={t} />

            {/* NEW: BIOLOGICAL CYCLE PARAMETERS */}
            <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                <h3 className="font-bold text-pink-800 mb-4 flex items-center gap-2">
                    🔬 BIOLOGICAL CYCLE PARAMETERS (Days)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* GILT CYCLE */}
                    <div className="bg-white p-3 rounded-lg border">
                        <InputField
                            label="Days to First Mating"
                            value={integratedInputs.giltToFirstMating || 45}
                            onChange={(v) => setIntegratedInputs(p => ({ ...p, giltToFirstMating: v }))}
                            suffix="days"
                            small
                        />
                        <div className="text-xs text-gray-500 mt-1">Acclimatization + Puberty</div>
                    </div>

                    {/* REPRODUCTION */}
                    <div className="bg-white p-3 rounded-lg border">
                        <InputField label="Gestation Period" value={integratedInputs.gestationDays || 116}
                            onChange={(v) => setIntegratedInputs(p => ({ ...p, gestationDays: v }))} suffix="days" small />
                        <InputField label="Lactation Period" value={integratedInputs.lactationDays || 24}
                            onChange={(v) => setIntegratedInputs(p => ({ ...p, lactationDays: v }))} suffix="days" small />
                    </div>

                    {/* DRY SOW */}
                    <div className="bg-white p-3 rounded-lg border">
                        <InputField label="Dry Sow Days" value={integratedInputs.drySowDays || 10}
                            onChange={(v) => setIntegratedInputs(p => ({ ...p, drySowDays: v }))} suffix="days" small />
                        <div className="text-xs text-gray-500 mt-1">Weaning to next mating</div>
                    </div>

                    {/* AUTO-CALCULATED */}
                    <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                        <div className="text-xs text-gray-600">Gilt → 1st Wean:</div>
                        <div className="text-lg font-bold text-green-700">
                            {(integratedInputs.giltToFirstMating || 45) + (integratedInputs.gestationDays || 116) + (integratedInputs.lactationDays || 24)} days
                        </div>
                        <div className="text-xs text-gray-600 mt-2">Cycle Length:</div>
                        <div className="text-lg font-bold text-blue-700">
                            {(integratedInputs.lactationDays || 24) + (integratedInputs.drySowDays || 10) + (integratedInputs.gestationDays || 116)} days
                        </div>
                    </div>
                </div>
            </div>



            {/* MATING MANAGEMENT SYSTEM */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <h3 className="font-bold text-purple-800 mb-4">
                    💕 MATING MANAGEMENT SYSTEM
                </h3>

                {/* System Selection Cards */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* BATCH MATING */}
                    <div className={`p-4 rounded-lg border-2 cursor-pointer ${integratedInputs.matingSystem === 'batch'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white'
                        }`} onClick={() => setIntegratedInputs(p => ({ ...p, matingSystem: 'batch' }))}>
                        <div className="font-bold text-purple-800">📦 BATCH MATING</div>
                        <div className="text-xs text-gray-600 mt-1">
                            Sows grouped into batches. All batch members mated on same day.
                        </div>
                    </div>

                    {/* WEEKLY MATING */}
                    <div className={`p-4 rounded-lg border-2 cursor-pointer ${(integratedInputs.matingSystem || 'weekly') === 'weekly'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                        }`} onClick={() => setIntegratedInputs(p => ({ ...p, matingSystem: 'weekly' }))}>
                        <div className="font-bold text-green-800">📅 WEEKLY MATING</div>
                        <div className="text-xs text-gray-600 mt-1">
                            Continuous flow. Sows mated every week for smooth production.
                        </div>
                    </div>
                </div>

                {/* Batch Settings */}
                {integratedInputs.matingSystem === 'batch' && (
                    <div className="bg-white rounded-lg border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">Batch Interval</label>
                                <select value={integratedInputs.batchInterval || 'weekly'}
                                    onChange={(e) => setIntegratedInputs(p => ({ ...p, batchInterval: e.target.value }))}
                                    className="w-full px-2 py-1.5 text-sm border rounded">
                                    <option value="weekly">Weekly (7 days)</option>
                                    <option value="biweekly">Bi-weekly (14 days)</option>
                                    <option value="monthly">Monthly (30 days)</option>
                                </select>
                            </div>
                            <div>
                                <div className="text-xs text-gray-600 mb-1">Number of Batches</div>
                                <div className="text-2xl font-bold text-purple-600">
                                    {calculateNumberOfBatches(integratedInputs)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-600 mb-1">Sows per Batch</div>
                                <div className="text-2xl font-bold text-green-600">
                                    ~{Math.ceil((integratedInputs.breedingSowCapacity || 100) / calculateNumberOfBatches(integratedInputs))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Weekly Settings */}
                {(integratedInputs.matingSystem || 'weekly') === 'weekly' && (
                    <div className="bg-white rounded-lg border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <div className="text-xs text-gray-600 mb-1">Sows Mated/Week</div>
                                <div className="text-2xl font-bold text-green-600">
                                    ~{Math.ceil(calculateWeeklySowsMated(integratedInputs))}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-600 mb-1">Farrowings/Week</div>
                                <div className="text-2xl font-bold text-blue-600">
                                    ~{Math.ceil(calculateWeeklySowsMated(integratedInputs) * (integratedInputs.farrowingRateY2 || 0.90))}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-600 mb-1">Piglets/Week</div>
                                <div className="text-2xl font-bold text-purple-600">
                                    ~{Math.ceil(calculateWeeklyPiglets(integratedInputs))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PIGLET ALLOCATION STRATEGY */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-4 text-lg border-b border-blue-200 pb-2">
                    📊 PIGLET ALLOCATION STRATEGY
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Nursery Allocation */}
                    <div className="bg-white rounded-lg p-5 border-2 border-purple-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">🐖</span>
                            <div>
                                <div className="font-bold text-purple-700 text-lg">Nursery Program</div>
                                <div className="text-xs text-gray-500">Sell as weaners/piglets</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    % Piglets to Nursery Sales
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={integratedInputs.nurseryAllocationPercent * 100}
                                        onChange={(e) => setIntegratedInputs(p => ({ ...p, nurseryAllocationPercent: parseFloat(e.target.value) / 100 }))}
                                        className="w-full pl-3 pr-8 py-2 border rounded-lg text-lg font-semibold text-purple-700"
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nursery ADG</label>
                                    <input
                                        type="number"
                                        value={integratedInputs.nurseryAdg}
                                        onChange={(e) => setIntegratedInputs(p => ({ ...p, nurseryAdg: parseFloat(e.target.value) }))}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">% Depletion</label>
                                    <input
                                        type="number"
                                        value={integratedInputs.nurseryDepletion || 0}
                                        onChange={(e) => setIntegratedInputs(p => ({ ...p, nurseryDepletion: parseFloat(e.target.value) }))}
                                        className="w-full px-2 py-1 border rounded text-sm text-red-600 font-bold"
                                        step="0.1"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nursery FCR</label>
                                <input
                                    type="number"
                                    value={integratedInputs.nurseryFcr}
                                    onChange={(e) => setIntegratedInputs(p => ({ ...p, nurseryFcr: parseFloat(e.target.value) }))}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                    step="0.1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fattening Allocation */}
                    <div className="bg-white rounded-lg p-5 border-2 border-orange-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">🥩</span>
                            <div>
                                <div className="font-bold text-orange-700 text-lg">Fattening Program</div>
                                <div className="text-xs text-gray-500">Grow to finish</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    % Piglets to Fattening
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={(1 - integratedInputs.nurseryAllocationPercent) * 100}
                                        disabled
                                        className="w-full pl-3 pr-8 py-2 border rounded-lg bg-gray-100 text-lg font-semibold text-gray-500"
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
                                </div>
                                <p className="text-xs text-orange-600 mt-1">Auto-calculated (100% - Nursery)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Fattening ADG</label>
                                    <input
                                        type="number"
                                        value={integratedInputs.fatteningAdg}
                                        onChange={(e) => setIntegratedInputs(p => ({ ...p, fatteningAdg: parseFloat(e.target.value) }))}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">% Depletion</label>
                                    <input
                                        type="number"
                                        value={integratedInputs.fatteningDepletion || 0}
                                        onChange={(e) => setIntegratedInputs(p => ({ ...p, fatteningDepletion: parseFloat(e.target.value) }))}
                                        className="w-full px-2 py-1 border rounded text-sm text-red-600 font-bold"
                                        step="0.1"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Fattening FCR</label>
                                <input
                                    type="number"
                                    value={integratedInputs.fatteningFcr}
                                    onChange={(e) => setIntegratedInputs(p => ({ ...p, fatteningFcr: parseFloat(e.target.value) }))}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                    step="0.1"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Validation */}
            <div className={`mt-4 p-2 rounded text-center text-sm font-medium ${Math.abs(integratedInputs.nurseryAllocationPercent + (1 - integratedInputs.nurseryAllocationPercent) - 1.0) < 0.001
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}>
                Total Allocation: 100% {Math.abs(integratedInputs.nurseryAllocationPercent + (1 - integratedInputs.nurseryAllocationPercent) - 1.0) < 0.001 ? '✓' : '✗'}
            </div>

            {/* NURSERY PROGRAM STRATEGY */}
            {
                integratedInputs.nurseryAllocationPercent > 0 && (
                    <MultiExitStrategy
                        title="Nursery Sales Strategy"
                        icon="🐖"
                        colorTheme="purple"
                        exitPoints={nurseryExitPoints}
                        setExitPoints={setNurseryExitPoints}
                        addExitPoint={addNurseryExit}
                        deleteExitPoint={deleteNurseryExit}
                        updateExitPoint={updateNurseryExit}
                        baseWeight={7} // Assume ~7kg birth/early weight or standard base
                        adg={integratedInputs.nurseryAdg}
                        fcr={integratedInputs.nurseryFcr}
                        feedCostPerKg={costParams.feedPricePerKg}
                        totalPigsIn={100} // Dummy for unit display
                        mortalityRate={integratedInputs.nurseryMortality}
                        formatNumber={formatNumber}
                        currency={currency}
                    />
                )
            }

            {/* FATTENING PROGRAM STRATEGY */}
            {
                (1 - integratedInputs.nurseryAllocationPercent) > 0 && (
                    <MultiExitStrategy
                        title="Fattening Sales Strategy"
                        icon="🥩"
                        colorTheme="orange"
                        exitPoints={fatteningExitPoints}
                        setExitPoints={setFatteningExitPoints}
                        addExitPoint={addFatteningExit}
                        deleteExitPoint={deleteFatteningExit}
                        updateExitPoint={updateFatteningExit}
                        baseWeight={integratedInputs.nurseryTargetWeight} // Start from Nursery Target
                        adg={integratedParams.fattening.adg}
                        fcr={integratedParams.fattening.fcr}
                        feedCostPerKg={costParams.feedPricePerKg}
                        totalPigsIn={100} // Dummy
                        mortalityRate={integratedParams.fattening.mortality}
                        formatNumber={formatNumber}
                        currency={currency}
                    />
                )
            }
            {/* Save & Calculate Button */}
            <div className="flex justify-end pt-4 border-t mt-8">
                <button
                    onClick={() => {
                        const btn = document.getElementById('save-calc-btn');
                        if (btn) {
                            btn.innerHTML = '⚙️ Calculating...';
                            btn.classList.add('opacity-75', 'cursor-wait');
                        }
                        setTimeout(() => {
                            if (onSave) onSave();
                        }, 800);
                    }}
                    id="save-calc-btn"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md flex items-center gap-2 transition-all transform hover:scale-105"
                >
                    <span>💾 Save & Calculate</span>
                </button>
            </div>
        </div >
    );
};



const BiologicalTimelineExample = () => (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-100 mb-6 no-print">
        <h4 className="font-bold text-pink-800 mb-2 text-sm flex items-center gap-2">
            🧬 Biological Cycle Example (Day-Level)
        </h4>
        <div className="flex items-center gap-2 text-xs overflow-x-auto pb-2">
            <div className="flex flex-col items-center min-w-[80px]">
                <span className="font-bold text-gray-700">Day 0</span>
                <div className="w-3 h-3 rounded-full bg-gray-400 my-1"></div>
                <span className="text-gray-500">Gilt Est.</span>
            </div>
            <div className="h-0.5 w-10 bg-gray-300"></div>
            <div className="flex flex-col items-center min-w-[80px]">
                <span className="font-bold text-pink-600">Day 45</span>
                <div className="w-3 h-3 rounded-full bg-pink-500 my-1"></div>
                <span className="text-pink-700 font-semibold">1st Mating</span>
            </div>
            <div className="h-0.5 w-10 bg-gray-300"></div>
            <div className="flex flex-col items-center min-w-[80px]">
                <span className="font-bold text-purple-600">Day 161</span>
                <div className="w-3 h-3 rounded-full bg-purple-500 my-1"></div>
                <span className="text-purple-700 font-semibold">Farrowing</span>
                <span className="text-[10px] text-gray-400">(+116d Gest)</span>
            </div>
            <div className="h-0.5 w-10 bg-gray-300"></div>
            <div className="flex flex-col items-center min-w-[80px]">
                <span className="font-bold text-teal-600">Day 185</span>
                <div className="w-3 h-3 rounded-full bg-teal-500 my-1"></div>
                <span className="text-teal-700 font-semibold">Weaning</span>
                <span className="text-[10px] text-gray-400">(+24d Lact)</span>
            </div>
        </div>
    </div>
);

const MatingCohortTracker = ({ dailyEvents }) => {
    if (!dailyEvents || !dailyEvents.matingEvents) return null;

    // Show first 100 events
    const events = dailyEvents.matingEvents.slice(0, 100);

    return (
        <div className="bg-white rounded-lg shadow-sm border mt-6 overflow-hidden no-print">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-3 flex justify-between items-center">
                <span className="font-semibold flex items-center gap-2">
                    ❤️ Mating Cohort Tracker
                </span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    Trace Biological Cycles
                </span>
            </div>
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Cohort</th>
                            <th className="px-3 py-2 text-center">Cycle #</th>
                            <th className="px-3 py-2 text-right">Sows Mated</th>
                            <th className="px-3 py-2 text-right text-gray-500">Exp. Farrowing</th>
                            <th className="px-3 py-2 text-right text-gray-500">Exp. Weaning</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {events.map((evt, idx) => (
                            <tr key={idx} className="hover:bg-pink-50 transition-colors">
                                <td className="px-3 py-2 font-medium text-pink-700">
                                    {evt.date} <span className="text-gray-400 font-normal">(Day {evt.day})</span>
                                </td>
                                <td className="px-3 py-2">{evt.cohortId}</td>
                                <td className="px-3 py-2 text-center">
                                    <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px] font-bold">
                                        C{evt.cycleNumber}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-right font-bold">{Math.round(evt.count)}</td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                    Day {evt.farrowingDay}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                    Day {evt.weaningDay}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="bg-gray-50 p-2 text-xs text-center text-gray-500 border-t flex justify-between items-center">
                <span>Showing {events.length} scheduled mating events.</span>
                {events.length === 0 && (
                    <span className="text-orange-600 font-bold">⚠️ No events? Add Gilts in 'Manual Cohorts' above!</span>
                )}
            </div>
        </div>
    );
};

const ProductionTimeline = ({ mode, MODES, projection, formatNumber, fatteningBarns, fatteningParams, currency = 'USD', t }) => {
    // Get available years from timeline
    const availableYears = useMemo(() => {
        const years = new Set();
        projection.timeline.forEach(m => {
            const year = m.monthLabel?.split('-')[1];
            if (year) years.add(year);
        });
        return ['All Years', ...Array.from(years).sort()];
    }, [projection.timeline]);

    const [selectedYear, setSelectedYear] = useState('All Years');

    // Filter timeline data based on selected year
    const filteredTimeline = useMemo(() => {
        if (selectedYear === 'All Years') {
            return projection.timeline;
        }
        return projection.timeline.filter(m => {
            const year = m.monthLabel?.split('-')[1];
            return year === selectedYear;
        });
    }, [projection.timeline, selectedYear]);

    // Calculate production summary metrics for filtered data
    const productionSummary = useMemo(() => {
        if (mode === MODES.FATTENING) {
            // Fattening mode metrics
            const totalPigsIn = filteredTimeline.reduce((sum, m) => sum + (m.pigsIn || 0), 0);
            const totalPigsAfterMortality = filteredTimeline.reduce((sum, m) => sum + (m.pigsAfterMortality || 0), 0);
            const totalPigsSold = filteredTimeline.reduce((sum, m) => {
                const exitTotal = m.exitDetails ? m.exitDetails.reduce((s, e) => s + e.pigsOut, 0) : 0;
                return sum + exitTotal;
            }, 0);
            const avgMortality = totalPigsIn > 0 ? ((totalPigsIn - totalPigsAfterMortality) / totalPigsIn) * 100 : 0;

            return { totalPigsIn, totalPigsAfterMortality, totalPigsSold, avgMortality };
        } else {
            // Breeding/Integrated mode metrics
            const totalPigletsWeaned = filteredTimeline.reduce((sum, m) => sum + (m.pigletsWeaned || 0), 0);
            const totalCulledSows = filteredTimeline.reduce((sum, m) => sum + (m.sowsCulled || 0), 0);

            // Calculate PSY (Pigs per Sow per Year)
            const totalActiveSows = filteredTimeline.reduce((sum, m) => sum + (m.activeSows || 0), 0);
            const avgActiveSows = filteredTimeline.length > 0 ? totalActiveSows / filteredTimeline.length : 0;
            const monthsInPeriod = filteredTimeline.length;

            // Annualize PSY if period is less than 12 months
            const psy = avgActiveSows > 0
                ? (totalPigletsWeaned / avgActiveSows) * (12 / monthsInPeriod)
                : 0;

            return { totalPigletsWeaned, totalCulledSows, psy, avgActiveSows };
        }
    }, [filteredTimeline, mode, MODES]);

    return (
        <div className="space-y-6">
            {/* Print-only title */}
            <div className="print-title">Pig Farm Calculator - Production & Financial Report</div>

            {/* Barn Status Dashboard (only in barn mode) */}
            {mode === MODES.FATTENING && projection.isBarnMode && projection.barnResults && (() => {
                const today = new Date().toISOString().split('T')[0];

                return (
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">🏭 Barn Status Dashboard</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {projection.barnResults.map((barn) => {
                                const statusInfo = getBarnStatus(barn, today);

                                // Status colors and icons
                                const statusConfig = {
                                    notStarted: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', icon: '🕒', label: 'Not Started' },
                                    growing: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', icon: '🌱', label: 'Growing' },
                                    cleaning: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', icon: '🧹', label: 'Cleaning' },
                                    readyForNextBatch: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: '✅', label: 'Ready' },
                                };

                                const config = statusConfig[statusInfo.status] || statusConfig.notStarted;

                                return (
                                    <div key={barn.barnId} className={`${config.bg} border-2 ${config.border} rounded-lg p-4`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-800">{barn.barnName}</h4>
                                            <span className="text-2xl">{config.icon}</span>
                                        </div>

                                        <div className="space-y-1 text-sm">
                                            <div className={`font-semibold ${config.text}`}>
                                                {config.label}
                                            </div>
                                            <div className="text-gray-600">
                                                🐷 Population: <strong>{formatNumber(barn.population)}</strong>
                                            </div>

                                            {statusInfo.status === 'notStarted' && (
                                                <div className="text-gray-600">
                                                    📅 Starts in: <strong>{statusInfo.daysRemaining} days</strong>
                                                </div>
                                            )}

                                            {statusInfo.status === 'growing' && (
                                                <>
                                                    <div className="text-gray-600">
                                                        📆 Day: <strong>{statusInfo.dayInCycle} / {statusInfo.totalDays}</strong>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                                        <div
                                                            className="bg-green-600 h-2 rounded-full transition-all"
                                                            style={{ width: `${Math.min(statusInfo.progressPercent, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="text-xs text-gray-500 text-right">
                                                        {statusInfo.progressPercent.toFixed(0)}% complete
                                                    </div>
                                                    <div className="text-gray-600">
                                                        📅 Pig-Out: <strong>{barn.pigOutDate}</strong>
                                                    </div>
                                                </>
                                            )}

                                            {statusInfo.status === 'cleaning' && (
                                                <>
                                                    <div className="text-gray-600">
                                                        🧹 Cleaning: <strong>{statusInfo.daysRemaining} days left</strong>
                                                    </div>
                                                    <div className="text-gray-600">
                                                        📅 Next Batch: <strong>{barn.nextBatchDate}</strong>
                                                    </div>
                                                </>
                                            )}

                                            {statusInfo.status === 'readyForNextBatch' && (
                                                <div className="text-gray-600">
                                                    ✅ Available for new batch
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Barn/Cohort Summary Table (only in barn mode) */}
            {mode === MODES.FATTENING && projection.isBarnMode && projection.barnResults && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">🏭 Barn / Cohort Summary</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Barn</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Population</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Pig-In Date</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Pig-Out Date</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Next Batch</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Days</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Exit</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Weight (kg)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Quantity</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Total Kg</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Revenue (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Cost (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Profit (M)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {projection.barnResults.map((barn, idx) => (
                                    <tr key={barn.barnId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{barn.barnName}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{formatNumber(barn.population)}</td>
                                        <td className="px-4 py-2 text-sm text-center text-gray-700">{barn.pigInDate}</td>
                                        <td className="px-4 py-2 text-sm text-center text-gray-700">{barn.pigOutDate}</td>
                                        <td className="px-4 py-2 text-sm text-center text-blue-600 font-semibold">{barn.nextBatchDate}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{barn.fatteningDays}</td>
                                        <td className="px-4 py-2 text-sm text-center text-gray-700">
                                            {barn.exitDetails && barn.exitDetails.length > 0 ? (
                                                <div className="space-y-1">
                                                    {barn.exitDetails.map((exit, exitIdx) => (
                                                        <div key={exitIdx} className="text-xs">
                                                            {barn.exitDetails.length > 1 ? (exitIdx + 1) : '-'}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                                            {barn.exitDetails && barn.exitDetails.length > 0 ? (
                                                <div className="space-y-1">
                                                    {barn.exitDetails.map((exit, exitIdx) => (
                                                        <div key={exitIdx} className="text-xs text-blue-600 font-medium">
                                                            {exit.targetWeight}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                                            {barn.exitDetails && barn.exitDetails.length > 0 ? (
                                                <div className="space-y-1">
                                                    {barn.exitDetails.map((exit, exitIdx) => (
                                                        <div key={exitIdx} className="text-xs text-green-700 font-semibold">
                                                            {formatNumber(exit.pigsOut)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{formatNumber(Math.round(barn.totalKgProduced))}</td>
                                        <td className="px-4 py-2 text-sm text-right text-green-700 font-semibold">{(barn.revenue.totalRevenue / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-red-700">{(barn.costs.totalCost / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right font-semibold " style={{ color: barn.grossProfit >= 0 ? '#059669' : '#DC2626' }}>
                                            {(barn.grossProfit / 1000000).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {/* Total Row */}
                                <tr className="bg-blue-50 font-semibold">
                                    <td className="px-4 py-2 text-sm text-gray-900">TOTAL</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">{formatNumber(projection.barnResults.reduce((sum, b) => sum + b.population, 0))}</td>
                                    <td className="px-4 py-2" colSpan="4"></td>
                                    <td className="px-4 py-2 text-sm text-center text-gray-500 text-xs">-</td>
                                    <td className="px-4 py-2 text-sm text-center text-gray-500 text-xs">-</td>
                                    <td className="px-4 py-2 text-sm text-center text-gray-500 text-xs">-</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">{formatNumber(Math.round(projection.barnResults.reduce((sum, b) => sum + b.totalKgProduced, 0)))}</td>
                                    <td className="px-4 py-2 text-sm text-right text-green-700">{(projection.barnResults.reduce((sum, b) => sum + b.revenue.totalRevenue, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right text-red-700">{(projection.barnResults.reduce((sum, b) => sum + b.costs.totalCost, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right" style={{ color: projection.barnResults.reduce((sum, b) => sum + b.grossProfit, 0) >= 0 ? '#059669' : '#DC2626' }}>
                                        {(projection.barnResults.reduce((sum, b) => sum + b.grossProfit, 0) / 1000000).toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Production Schedule (Forecasting) - only in barn mode */}
            {mode === MODES.FATTENING && projection.isBarnMode && fatteningBarns.length > 0 && (() => {
                // Generate future cohorts for 2 years
                const today = new Date();
                const endDate = new Date(today.getFullYear() + 2, 11, 31); // End of 2 years from now
                const startDate = fatteningBarns.reduce((earliest, barn) => {
                    const barnDate = new Date(barn.pigInDate);
                    return barnDate < earliest ? barnDate : earliest;
                }, new Date(fatteningBarns[0].pigInDate));

                const futureCohorts = generateFutureCohorts(fatteningBarns, fatteningParams, endDate.toISOString().split('T')[0]);

                // Period filter state
                const [selectedPeriod, setSelectedPeriod] = React.useState('all');

                // Get available years from cohorts
                const availableYears = React.useMemo(() => {
                    const years = new Set();
                    futureCohorts.forEach(c => {
                        const year = new Date(c.pigInDate).getFullYear();
                        years.add(year);
                    });
                    return Array.from(years).sort();
                }, [futureCohorts]);

                // Filter cohorts by period
                const filteredCohorts = React.useMemo(() => {
                    if (selectedPeriod === 'all') return futureCohorts;

                    return futureCohorts.filter(c => {
                        const pigInYear = new Date(c.pigInDate).getFullYear();
                        return pigInYear.toString() === selectedPeriod;
                    });
                }, [futureCohorts, selectedPeriod]);

                // Calculate summary metrics for filtered cohorts
                const filteredSummary = React.useMemo(() => {
                    const totalPigsIn = filteredCohorts.reduce((sum, c) => sum + c.population, 0);
                    const totalPigsSurvived = filteredCohorts.reduce((sum, c) => sum + c.pigsSurvived, 0);
                    const totalPigsDied = filteredCohorts.reduce((sum, c) => sum + c.pigsDied, 0);
                    const avgMortality = totalPigsIn > 0 ? (totalPigsDied / totalPigsIn) * 100 : 0;

                    return {
                        totalPigsIn,
                        totalPigsSurvived,
                        avgMortality
                    };
                }, [filteredCohorts]);

                // Sorting state
                const [sortConfig, setSortConfig] = React.useState({ key: 'cohortCode', direction: 'asc' });

                // Sort filtered cohorts based on current sort config
                const sortedCohorts = React.useMemo(() => {
                    const sorted = [...filteredCohorts];
                    sorted.sort((a, b) => {
                        let aVal = a[sortConfig.key];
                        let bVal = b[sortConfig.key];

                        // Handle date sorting
                        if (sortConfig.key === 'pigInDate' || sortConfig.key === 'pigOutDate') {
                            aVal = new Date(aVal);
                            bVal = new Date(bVal);
                        }

                        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                        return 0;
                    });
                    return sorted;
                }, [filteredCohorts, sortConfig]);

                // Handle sort click
                const handleSort = (key) => {
                    setSortConfig(prev => ({
                        key,
                        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
                    }));
                };

                // Sort indicator component
                const SortIndicator = ({ columnKey }) => {
                    if (sortConfig.key !== columnKey) return <span className="text-gray-400 ml-1">⇅</span>;
                    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
                };

                return (
                    <>
                        {/* Production Summary Boxes with Period Filter */}
                        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">📊 Production Summary</h3>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Period:</label>
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Years</option>
                                        {availableYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                    <div className="text-xs text-blue-600 font-semibold mb-1">Total Pigs Purchased</div>
                                    <div className="text-2xl font-bold text-blue-700">
                                        {formatNumber(filteredSummary.totalPigsIn)}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                    <div className="text-xs text-green-700 font-semibold mb-1">Total Pigs Sold</div>
                                    <div className="text-2xl font-bold text-green-800">
                                        {formatNumber(filteredSummary.totalPigsSurvived)}
                                    </div>
                                    <div className="text-[10px] text-green-600 mt-1">
                                        Survived: {formatNumber(filteredSummary.totalPigsSurvived)}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                                    <div className="text-xs text-orange-700 font-semibold mb-1">Avg Mortality Rate</div>
                                    <div className="text-2xl font-bold text-orange-800">
                                        {filteredSummary.avgMortality.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Production Schedule Table */}
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">📅 PRODUCTION SCHEDULE (Forecasting)</h3>
                                <div className="text-sm text-gray-600">
                                    Showing: <strong>{sortedCohorts.length}</strong> of <strong>{futureCohorts.length}</strong> cohorts
                                </div>
                            </div>

                            {/* Cohort Details Table - Full Page */}
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('cohortCode')}
                                            >
                                                Cohort Code <SortIndicator columnKey="cohortCode" />
                                            </th>
                                            <th
                                                className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('barnName')}
                                            >
                                                Barn <SortIndicator columnKey="barnName" />
                                            </th>
                                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Population</th>
                                            <th
                                                className="px-3 py-2 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('pigInDate')}
                                            >
                                                Pig-In Date <SortIndicator columnKey="pigInDate" />
                                            </th>
                                            <th
                                                className="px-3 py-2 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                                                onClick={() => handleSort('pigOutDate')}
                                            >
                                                Pig-Out Date <SortIndicator columnKey="pigOutDate" />
                                            </th>
                                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Days</th>
                                            <th className="px-3 py-2 text-center font-semibold text-gray-700">Exit</th>
                                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Weight (kg)</th>
                                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Quantity</th>
                                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Total Kg</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {(() => {
                                            // Determine which date field to use for grouping based on current sort
                                            const useDate = (sortConfig.key === 'pigInDate' || sortConfig.key === 'pigOutDate') ? sortConfig.key : 'pigOutDate';
                                            const dateLabel = useDate === 'pigInDate' ? 'Pig-In' : 'Pig-Out';

                                            // Group cohorts by year based on selected date field
                                            const cohortsByYear = {};
                                            sortedCohorts.forEach(cohort => {
                                                const year = cohort[useDate].split('-')[0];
                                                if (!cohortsByYear[year]) {
                                                    cohortsByYear[year] = [];
                                                }
                                                cohortsByYear[year].push(cohort);
                                            });

                                            const rows = [];
                                            let globalIdx = 0;

                                            Object.keys(cohortsByYear).sort().forEach(year => {
                                                const yearCohorts = cohortsByYear[year];

                                                // Add cohort rows for this year
                                                yearCohorts.forEach(cohort => {
                                                    rows.push(
                                                        <tr key={cohort.cohortCode} className={globalIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-3 py-2 font-mono text-blue-600 font-semibold">{cohort.cohortCode}</td>
                                                            <td className="px-3 py-2 text-gray-700">{cohort.barnName}</td>
                                                            <td className="px-3 py-2 text-right text-gray-700">{formatNumber(cohort.population)}</td>
                                                            <td className="px-3 py-2 text-center text-gray-700">{cohort.pigInDate}</td>
                                                            <td className="px-3 py-2 text-center text-gray-700">{cohort.pigOutDate}</td>
                                                            <td className="px-3 py-2 text-right text-gray-700">{cohort.fatteningDays}</td>
                                                            <td className="px-3 py-2 text-center text-gray-700">
                                                                {cohort.exitDetails && cohort.exitDetails.length > 0 ? (
                                                                    <div className="space-y-1">
                                                                        {cohort.exitDetails.map((exit, exitIdx) => (
                                                                            <div key={exitIdx} className="text-[10px]">
                                                                                {cohort.exitDetails.length > 1 ? (exitIdx + 1) : '-'}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 text-[10px]">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                {cohort.exitDetails && cohort.exitDetails.length > 0 ? (
                                                                    <div className="space-y-1">
                                                                        {cohort.exitDetails.map((exit, exitIdx) => (
                                                                            <div key={exitIdx} className="text-[10px] text-blue-600 font-medium">
                                                                                {exit.targetWeight}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 text-[10px]">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                {cohort.exitDetails && cohort.exitDetails.length > 0 ? (
                                                                    <div className="space-y-1">
                                                                        {cohort.exitDetails.map((exit, exitIdx) => (
                                                                            <div key={exitIdx} className="text-[10px] text-green-700 font-semibold">
                                                                                {formatNumber(exit.pigsOut)}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 text-[10px]">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-700">{formatNumber(Math.round(cohort.totalKgProduced))}</td>
                                                        </tr>
                                                    );
                                                    globalIdx++;
                                                });

                                                // Calculate year totals
                                                const yearTotalPopulation = yearCohorts.reduce((sum, c) => sum + c.population, 0);
                                                const yearTotalPigsSold = yearCohorts.reduce((sum, c) => {
                                                    if (c.exitDetails && c.exitDetails.length > 0) {
                                                        return sum + c.exitDetails.reduce((s, e) => s + e.pigsOut, 0);
                                                    }
                                                    return sum + c.pigsSurvived;
                                                }, 0);
                                                const yearTotalKg = yearCohorts.reduce((sum, c) => sum + c.totalKgProduced, 0);

                                                // Add year summary row
                                                rows.push(
                                                    <tr key={`year-${year}`} className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                                                        <td className="px-3 py-2 text-sm text-gray-900" colSpan="2">
                                                            📊 {year} TOTAL ({dateLabel})
                                                        </td>
                                                        <td className="px-3 py-2 text-sm text-right text-gray-900">{formatNumber(yearTotalPopulation)}</td>
                                                        <td className="px-3 py-2" colSpan="5"></td>
                                                        <td className="px-3 py-2 text-sm text-right text-green-700 font-bold">{formatNumber(yearTotalPigsSold)}</td>
                                                        <td className="px-3 py-2 text-sm text-right text-gray-900 font-bold">{formatNumber(Math.round(yearTotalKg))}</td>
                                                    </tr>
                                                );
                                            });

                                            return rows;
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* Monthly Production Report for Breeding/Integrated Mode */}
            {(mode === MODES.BREEDING || mode === MODES.INTEGRATED) && projection.timeline && projection.timeline.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 flex items-center justify-between">
                        <span className="font-semibold">
                            📊 {t.calculator.production.title}
                        </span>
                        <div className="flex items-center gap-2 no-print">
                            <label className="text-xs text-white/90">{t.calculator.production.filter}</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="px-3 py-1 border rounded-lg bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white"
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-2 py-2 text-left font-semibold sticky left-0 bg-gray-100 z-10 border-r">{t.calculator.production.month}</th>
                                    <th className="px-2 py-2 text-right font-semibold">{t.calculator.production.activeSows}</th>
                                    <th className="px-2 py-2 text-right font-semibold">{t.calculator.production.giltArrive}</th>
                                    <th className="px-2 py-2 text-right font-semibold">{t.calculator.production.sowProdIn}</th>
                                    <th className="px-2 py-2 text-right font-semibold">{t.calculator.production.sowCulled}</th>
                                    <th className="px-2 py-2 text-right font-semibold">{t.calculator.production.netChange}</th>
                                    <th className="px-2 py-2 text-right font-semibold">{t.calculator.production.mating}</th>
                                    <th className="px-2 py-2 text-right font-semibold">{t.calculator.production.farrowing}</th>
                                    <th className="px-2 py-2 text-right font-semibold">{t.calculator.production.weaning}</th>
                                    {mode === MODES.INTEGRATED && (
                                        <>
                                            <th className="px-2 py-2 text-right font-semibold">Nursery Piglet In</th>
                                            <th className="px-2 py-2 text-right font-semibold">Nursery Piglet Out</th>
                                            <th className="px-2 py-2 text-right font-semibold">Fattening Piglet In</th>
                                            <th className="px-2 py-2 text-right font-semibold">Fattening Piglet Out</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredTimeline.map((m, idx) => {
                                    // Check if this is December (month 12, 24, 36, etc.)
                                    const isDecember = m.month % 12 === 0;
                                    const yearNumber = Math.floor(m.month / 12);

                                    // Calculate year totals if this is December
                                    let yearTotals = null;
                                    if (isDecember) {
                                        const startMonth = (yearNumber - 1) * 12 + 1;
                                        const endMonth = yearNumber * 12;
                                        const yearData = projection.timeline.filter(tm => tm.month >= startMonth && tm.month <= endMonth);

                                        yearTotals = {
                                            giltsArrived: yearData.reduce((sum, tm) => sum + (tm.giltsArrived || 0), 0),
                                            giltsProductive: yearData.reduce((sum, tm) => sum + (tm.giltsProductive || 0), 0),
                                            sowsCulled: yearData.reduce((sum, tm) => sum + (tm.sowsCulled || 0), 0),
                                            netChange: yearData.reduce((sum, tm) => sum + (tm.netChange || 0), 0),
                                            matingCount: yearData.reduce((sum, tm) => sum + (tm.matingCount || 0), 0),
                                            farrowingCount: yearData.reduce((sum, tm) => sum + (tm.farrowingCount || 0), 0),
                                            pigletsWeaned: yearData.reduce((sum, tm) => sum + (tm.pigletsWeaned || 0), 0),
                                            avgActiveSows: yearData.reduce((sum, tm) => sum + (tm.activeSows || 0), 0) / yearData.length,
                                        };

                                        if (mode === MODES.INTEGRATED) {
                                            yearTotals.nurseryPigIn = yearData.reduce((sum, tm) => sum + (tm.nurseryPigIn || 0), 0);
                                            yearTotals.nurserySold = yearData.reduce((sum, tm) => sum + (tm.nurserySold || 0), 0);
                                            yearTotals.fatteningPigIn = yearData.reduce((sum, tm) => sum + (tm.fatteningPigIn || 0), 0);
                                            yearTotals.fatteningSold = yearData.reduce((sum, tm) => sum + (tm.fatteningSold || 0), 0);
                                        }
                                    }

                                    return (
                                        <React.Fragment key={idx}>
                                            <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-2 py-2 font-medium sticky left-0 z-10 border-r" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                                                    {m.monthLabel}
                                                </td>
                                                <td className="px-2 py-2 text-right">{formatNumber(m.activeSows || 0)}</td>
                                                <td className="px-2 py-2 text-right text-blue-600">{formatNumber(m.giltsArrived || 0)}</td>
                                                <td className="px-2 py-2 text-right text-green-600">{formatNumber(m.giltsProductive || 0)}</td>
                                                <td className="px-2 py-2 text-right text-red-600">{formatNumber(m.sowsCulled || 0)}</td>
                                                <td className="px-2 py-2 text-right font-semibold">{formatNumber(m.netChange || 0)}</td>
                                                <td className="px-2 py-2 text-right">{formatNumber(m.matingCount || 0)}</td>
                                                <td className="px-2 py-2 text-right">{formatNumber(m.farrowingCount || 0)}</td>
                                                <td className="px-2 py-2 text-right text-green-700 font-semibold">{formatNumber(m.pigletsWeaned || 0)}</td>
                                                {mode === MODES.INTEGRATED && (
                                                    <>
                                                        <td className="px-2 py-2 text-right text-blue-600">{formatNumber(m.nurseryPigIn || 0)}</td>
                                                        <td className="px-2 py-2 text-right text-blue-700 font-semibold">{formatNumber(m.nurserySold || 0)}</td>
                                                        <td className="px-2 py-2 text-right text-purple-600">{formatNumber(m.fatteningPigIn || 0)}</td>
                                                        <td className="px-2 py-2 text-right text-purple-700 font-semibold">{formatNumber(m.fatteningSold || 0)}</td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* Yearly Summary Row */}
                                            {isDecember && yearTotals && (
                                                <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                                                    <td className="px-2 py-2 sticky left-0 z-10 bg-blue-50 border-r">
                                                        Year {yearNumber} Summary
                                                    </td>
                                                    <td className="px-2 py-2 text-right">{formatNumber(Math.round(yearTotals.avgActiveSows))}</td>
                                                    <td className="px-2 py-2 text-right text-blue-700">{formatNumber(yearTotals.giltsArrived)}</td>
                                                    <td className="px-2 py-2 text-right text-green-700">{formatNumber(yearTotals.giltsProductive)}</td>
                                                    <td className="px-2 py-2 text-right text-red-700">{formatNumber(yearTotals.sowsCulled)}</td>
                                                    <td className="px-2 py-2 text-right">{formatNumber(yearTotals.netChange)}</td>
                                                    <td className="px-2 py-2 text-right">{formatNumber(yearTotals.matingCount)}</td>
                                                    <td className="px-2 py-2 text-right">{formatNumber(yearTotals.farrowingCount)}</td>
                                                    <td className="px-2 py-2 text-right text-green-800">{formatNumber(yearTotals.pigletsWeaned)}</td>
                                                    {mode === MODES.INTEGRATED && (
                                                        <>
                                                            <td className="px-2 py-2 text-right text-blue-700">{formatNumber(yearTotals.nurseryPigIn)}</td>
                                                            <td className="px-2 py-2 text-right text-blue-800">{formatNumber(yearTotals.nurserySold)}</td>
                                                            <td className="px-2 py-2 text-right text-purple-700">{formatNumber(yearTotals.fatteningPigIn)}</td>
                                                            <td className="px-2 py-2 text-right text-purple-800">{formatNumber(yearTotals.fatteningSold)}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Production Schedule Table */}
        </div>
    );
};

const FinancialTimeline = ({ mode, MODES, projection, formatNumber, formatCurrency, currency = 'USD', t }) => {
    // Get available years from timeline
    const availableYears = useMemo(() => {
        const years = new Set();
        projection.timeline.forEach(m => {
            // Handle both 'Jan 2026' and 'Jan-2026' formats
            const year = m.monthLabel?.includes('-')
                ? m.monthLabel.split('-')[1]
                : m.monthLabel?.split(' ')[1];
            if (year) years.add(year);
        });
        return ['All Years', ...Array.from(years).sort()];
    }, [projection.timeline]);

    const [selectedYear, setSelectedYear] = useState('All Years');

    // Filter timeline data based on selected year
    const filteredTimeline = useMemo(() => {
        if (selectedYear === 'All Years') {
            return projection.timeline;
        }
        return projection.timeline.filter(m => {
            // Handle both 'Jan 2026' and 'Jan-2026' formats
            const year = m.monthLabel?.includes('-')
                ? m.monthLabel.split('-')[1]
                : m.monthLabel?.split(' ')[1];
            return year === selectedYear;
        });
    }, [projection.timeline, selectedYear]);

    // Calculate financial summary metrics for filtered data
    const financialSummary = useMemo(() => {
        const totalRevenue = filteredTimeline.reduce((sum, m) => sum + (m.revenue || 0), 0);
        const totalCosts = filteredTimeline.reduce((sum, m) => sum + (m.costs || 0), 0);
        const totalNetProfit = filteredTimeline.reduce((sum, m) => sum + (m.netProfit || 0), 0);
        const netMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

        return { totalRevenue, totalCosts, totalNetProfit, netMargin };
    }, [filteredTimeline]);

    // Check if there is any meaningful production data (not just fixed costs)
    const hasProductionData = useMemo(() => {
        if (!projection.timeline || projection.timeline.length === 0) return false;
        // Check if there's any revenue or variable costs (not just fixed overhead/utilities)
        return projection.timeline.some(m =>
            (m.revenue && m.revenue > 0) ||
            (m.giltCost && m.giltCost > 0) ||
            (m.feedCost && m.feedCost > 0) ||
            (m.weanersSold && m.weanersSold > 0) ||
            (m.activeSows && m.activeSows > 0)
        );
    }, [projection.timeline]);

    return (
        <div className="space-y-6">
            {/* Print-only title */}
            <div className="print-title">Pig Farm Calculator - Production & Financial Report</div>

            {/* Barn Costing Table (only in barn mode) */}
            {mode === MODES.FATTENING && projection.isBarnMode && projection.barnResults && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Barn / Cohort Costing Analysis</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Barn</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Piglet Cost (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Feed Cost (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">AHP (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Labor (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Overhead (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Utilities (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Total Cost (M)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Cost/Pig</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Cost/Kg</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {projection.barnResults.map((barn, idx) => (
                                    <tr key={barn.barnId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{barn.barnName}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{(barn.costs.pigletCost / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{(barn.costs.feedCost / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{(barn.costs.ahpCost / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{(barn.costs.laborCost / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{(barn.costs.overheadCost / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{(barn.costs.utilitiesCost / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-red-700 font-semibold">{(barn.costs.totalCost / 1000000).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{formatNumber(Math.round(barn.costs.costPerPig))}</td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700">{barn.costs.costPerKg.toFixed(0)}</td>
                                    </tr>
                                ))}
                                {/* Total Row */}
                                <tr className="bg-blue-50 font-semibold">
                                    <td className="px-4 py-2 text-sm text-gray-900">TOTAL</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">{(projection.barnResults.reduce((sum, b) => sum + b.costs.pigletCost, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">{(projection.barnResults.reduce((sum, b) => sum + b.costs.feedCost, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">{(projection.barnResults.reduce((sum, b) => sum + b.costs.ahpCost, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">{(projection.barnResults.reduce((sum, b) => sum + b.costs.laborCost, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">{(projection.barnResults.reduce((sum, b) => sum + b.costs.overheadCost, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">{(projection.barnResults.reduce((sum, b) => sum + b.costs.utilitiesCost, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right text-red-700">{(projection.barnResults.reduce((sum, b) => sum + b.costs.totalCost, 0) / 1000000).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                                        {formatNumber(Math.round(projection.barnResults.reduce((sum, b) => sum + b.costs.totalCost, 0) / projection.barnResults.reduce((sum, b) => sum + b.pigsSurvived, 0)))}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                                        {(projection.barnResults.reduce((sum, b) => sum + b.costs.totalCost, 0) / projection.barnResults.reduce((sum, b) => sum + b.totalKgProduced, 0)).toFixed(0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Comparative Barn Performance Table (only in barn mode) */}
            {mode === MODES.FATTENING && projection.isBarnMode && projection.barnResults && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 Comparative Barn Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Barn</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">ADG (kg/day)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">FCR</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Mortality %</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Days to Market</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Revenue/Pig</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Cost/Pig</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Profit/Pig</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Revenue/Kg</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Cost/Kg</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Profit/Kg</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">ROI %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {projection.barnResults.map((barn, idx) => {
                                    const roi = barn.costs.totalCost > 0 ? (barn.grossProfit / barn.costs.totalCost) * 100 : 0;
                                    const mortalityPct = ((barn.population - barn.pigsSurvived) / barn.population) * 100;

                                    return (
                                        <tr key={barn.barnId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{barn.barnName}</td>
                                            <td className="px-4 py-2 text-sm text-right text-gray-700">{barn.effectiveParams.adg.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-sm text-right text-gray-700">{barn.effectiveParams.fcr.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-sm text-right text-gray-700">{mortalityPct.toFixed(1)}%</td>
                                            <td className="px-4 py-2 text-sm text-right text-gray-700">{barn.fatteningDays}</td>
                                            <td className="px-4 py-2 text-sm text-right text-green-700">{formatNumber(Math.round(barn.revenue.revenuePerPig))}</td>
                                            <td className="px-4 py-2 text-sm text-right text-red-700">{formatNumber(Math.round(barn.costs.costPerPig))}</td>
                                            <td className="px-4 py-2 text-sm text-right font-semibold" style={{ color: barn.profitPerPig >= 0 ? '#059669' : '#DC2626' }}>
                                                {formatNumber(Math.round(barn.profitPerPig))}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right text-green-700">{barn.revenue.revenuePerKg.toFixed(0)}</td>
                                            <td className="px-4 py-2 text-sm text-right text-red-700">{barn.costs.costPerKg.toFixed(0)}</td>
                                            <td className="px-4 py-2 text-sm text-right font-semibold" style={{ color: barn.profitPerKg >= 0 ? '#059669' : '#DC2626' }}>
                                                {barn.profitPerKg.toFixed(0)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right font-semibold" style={{ color: roi >= 0 ? '#059669' : '#DC2626' }}>
                                                {roi.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Average Row */}
                                <tr className="bg-blue-50 font-semibold">
                                    <td className="px-4 py-2 text-sm text-gray-900">AVERAGE</td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                                        {(projection.barnResults.reduce((sum, b) => sum + b.effectiveParams.adg, 0) / projection.barnResults.length).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                                        {(projection.barnResults.reduce((sum, b) => sum + b.effectiveParams.fcr, 0) / projection.barnResults.length).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                                        {(projection.barnResults.reduce((sum, b) => sum + ((b.population - b.pigsSurvived) / b.population * 100), 0) / projection.barnResults.length).toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-gray-900">
                                        {Math.round(projection.barnResults.reduce((sum, b) => sum + b.fatteningDays, 0) / projection.barnResults.length)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-green-700">
                                        {formatNumber(Math.round(projection.barnResults.reduce((sum, b) => sum + b.revenue.revenuePerPig, 0) / projection.barnResults.length))}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-red-700">
                                        {formatNumber(Math.round(projection.barnResults.reduce((sum, b) => sum + b.costs.costPerPig, 0) / projection.barnResults.length))}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right">
                                        {formatNumber(Math.round(projection.barnResults.reduce((sum, b) => sum + b.profitPerPig, 0) / projection.barnResults.length))}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-green-700">
                                        {(projection.barnResults.reduce((sum, b) => sum + b.revenue.revenuePerKg, 0) / projection.barnResults.length).toFixed(0)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right text-red-700">
                                        {(projection.barnResults.reduce((sum, b) => sum + b.costs.costPerKg, 0) / projection.barnResults.length).toFixed(0)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right">
                                        {(projection.barnResults.reduce((sum, b) => sum + b.profitPerKg, 0) / projection.barnResults.length).toFixed(0)}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-right">
                                        {(projection.barnResults.reduce((sum, b) => sum + (b.costs.totalCost > 0 ? (b.grossProfit / b.costs.totalCost) * 100 : 0), 0) / projection.barnResults.length).toFixed(1)}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Financial Summary Boxes - only show when data exists */}
            {hasProductionData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border-2 border-green-400 p-4">
                        <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
                        <div className="text-xl font-bold text-green-600">
                            {formatCurrency(financialSummary.totalRevenue, currency)}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border-2 border-red-400 p-4">
                        <div className="text-xs text-gray-500 mb-1">Total Costs</div>
                        <div className="text-xl font-bold text-red-600">
                            {formatCurrency(financialSummary.totalCosts, currency)}
                        </div>
                    </div>
                    <div className={`bg-white rounded-xl shadow-sm border-2 p-4 ${financialSummary.totalNetProfit >= 0 ? 'border-blue-400' : 'border-orange-400'}`}>
                        <div className="text-xs text-gray-500 mb-1">Net Profit</div>
                        <div className={`text-xl font-bold ${financialSummary.totalNetProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatCurrency(financialSummary.totalNetProfit, currency)}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border-2 border-purple-400 p-4">
                        <div className="text-xs text-gray-500 mb-1">Net Margin</div>
                        <div className="text-xl font-bold text-purple-600">
                            {financialSummary.netMargin.toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Cash Flow Table - only show when data exists */}
            {hasProductionData && (
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
                        <span className="font-semibold">
                            💰 {t.calculator.financial.title} ({currency} {t.calculator.financial.million})
                        </span>
                        <div className="flex items-center gap-2 no-print">
                            <label className="text-xs text-white/90">{t.calculator.financial.filter}</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="px-3 py-1 border rounded-lg bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white"
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {/* NEW: Yearly Financial Summary */}
                        {mode === MODES.INTEGRATED && (
                            <MoneyYearSummary timeline={projection.timeline} formatCurrency={formatCurrency} formatNumber={formatNumber} />
                        )}

                        <table className="min-w-full text-xs">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-2 py-2 text-left font-semibold sticky left-0 bg-gray-100 z-10 border-r">{t.calculator.financial.month}</th>

                                    {mode === MODES.INTEGRATED && (
                                        <>
                                            {/* Revenue Breakdown Group */}
                                            <th colSpan={4} className="px-2 py-1 text-center bg-green-50 border-b border-green-100 text-green-800 font-semibold border-r">
                                                {t.calculator.financial.revenueStreams}
                                            </th>
                                            {/* Costs Breakdown Group */}
                                            <th colSpan={7} className="px-2 py-1 text-center bg-red-50 border-b border-red-100 text-red-800 font-semibold border-r">
                                                {t.calculator.financial.operationalCosts}
                                            </th>
                                        </>
                                    )}
                                    <th className="px-2 py-2 text-right font-bold text-gray-800 bg-gray-200 sticky right-0 z-10">{t.calculator.financial.netProfit}</th>
                                </tr>
                                <tr className="bg-gray-50 text-[10px] text-gray-600">
                                    <th className="sticky left-0 bg-gray-50 border-r"></th>

                                    {mode === MODES.INTEGRATED && (
                                        <>
                                            {/* Revenue breakdown */}
                                            <th className="px-1 py-1 text-right bg-green-50/30">Nur</th>
                                            <th className="px-1 py-1 text-right bg-green-50/30">Fat</th>
                                            <th className="px-1 py-1 text-right bg-green-50/30">Cull</th>
                                            <th className="px-1 py-1 text-right bg-green-100/50 font-bold">{t.calculator.financial.total}</th>

                                            {/* Cost breakdown */}
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.gilt}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.feed}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.ahp}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">Labor</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">Overhead</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">Utility</th>
                                            <th className="px-1 py-1 text-right bg-red-100/50 font-bold">Total</th>
                                        </>
                                    )}
                                    {mode === MODES.BREEDING && (
                                        <>
                                            {/* Revenue Breakdown Group */}
                                            <th colSpan={3} className="px-2 py-1 text-center bg-green-50 border-b border-green-100 text-green-800 font-semibold border-r">
                                                {t.calculator.financial.revenueStreams}
                                            </th>
                                            {/* Costs Breakdown Group */}
                                            <th colSpan={7} className="px-2 py-1 text-center bg-red-50 border-b border-red-100 text-red-800 font-semibold border-r">
                                                {t.calculator.financial.operationalCosts}
                                            </th>
                                        </>
                                    )}
                                    {mode === MODES.FATTENING && (
                                        <>
                                            {/* Revenue - single column */}
                                            <th className="px-2 py-1 text-center bg-green-50 border-b border-green-100 text-green-800 font-semibold border-r">
                                                {t.calculator.financial.revenueStreams}
                                            </th>
                                            {/* Costs Breakdown Group */}
                                            <th colSpan={7} className="px-2 py-1 text-center bg-red-50 border-b border-red-100 text-red-800 font-semibold border-r">
                                                {t.calculator.financial.operationalCosts}
                                            </th>
                                        </>
                                    )}
                                    <th className="sticky right-0 bg-gray-200"></th>
                                </tr>
                                <tr className="bg-gray-50 text-[10px] text-gray-600">
                                    <th className="sticky left-0 bg-gray-50 border-r"></th>

                                    {mode === MODES.BREEDING && (
                                        <>
                                            {/* Revenue breakdown */}
                                            <th className="px-1 py-1 text-right bg-green-50/30">{t.calculator.financial.weaner}</th>
                                            <th className="px-1 py-1 text-right bg-green-50/30">{t.calculator.financial.cullSow}</th>
                                            <th className="px-1 py-1 text-right bg-green-100/50 font-bold">{t.calculator.financial.total}</th>

                                            {/* Cost breakdown */}
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.gilt}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.feed}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.ahp}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.labor}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.overhead}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.utility}</th>
                                            <th className="px-1 py-1 text-right bg-red-100/50 font-bold">{t.calculator.financial.total}</th>
                                        </>
                                    )}
                                    {mode === MODES.FATTENING && (
                                        <>
                                            {/* Revenue breakdown - only Fattening */}
                                            <th className="px-1 py-1 text-right bg-green-100/50 font-bold">Fattening</th>

                                            {/* Cost breakdown */}
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.weaner}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.feed}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.ahp}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.labor}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.overhead}</th>
                                            <th className="px-1 py-1 text-right bg-red-50/30">{t.calculator.financial.utility}</th>
                                            <th className="px-1 py-1 text-right bg-red-100/50 font-bold">{t.calculator.financial.total}</th>
                                        </>
                                    )}
                                    <th className="sticky right-0 bg-gray-200"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {filteredTimeline.map((m, idx) => {
                                    // Check if this is December (month 12, 24, 36, etc.)
                                    const isDecember = m.month % 12 === 0;
                                    const yearNumber = Math.floor(m.month / 12);

                                    // Calculate year totals if this is December
                                    let yearTotals = null;
                                    if (isDecember) {
                                        const startMonth = (yearNumber - 1) * 12 + 1;
                                        const endMonth = yearNumber * 12;
                                        const yearData = projection.timeline.filter(tm => tm.month >= startMonth && tm.month <= endMonth);

                                        if (mode === MODES.INTEGRATED) {
                                            yearTotals = {
                                                nurseryRevenue: yearData.reduce((sum, tm) => sum + (tm.revenueDetails?.nursery || 0), 0),
                                                fatteningRevenue: yearData.reduce((sum, tm) => sum + (tm.revenueDetails?.fattening || 0), 0),
                                                cullRevenue: yearData.reduce((sum, tm) => sum + (tm.revenueDetails?.cullSow || 0), 0),
                                                totalRevenue: yearData.reduce((sum, tm) => sum + (tm.revenue || 0), 0),
                                                giltCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.giltPurchase || 0), 0),
                                                feedCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.breeding || 0) + (tm.costDetails?.nurseryFeed || 0) + (tm.costDetails?.fatteningFeed || 0), 0),
                                                ahpCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.ahp || 0), 0),
                                                laborCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.labor || 0), 0),
                                                overheadCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.overhead || 0), 0),
                                                utilityCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.utility || 0), 0),
                                                totalCost: yearData.reduce((sum, tm) => sum + (tm.costs || 0), 0),
                                                netProfit: yearData.reduce((sum, tm) => sum + (tm.netProfit || 0), 0)
                                            };
                                        } else if (mode === MODES.BREEDING) {
                                            // For Breeding Mode
                                            yearTotals = {
                                                weanerRevenue: yearData.reduce((sum, tm) => sum + (tm.revenueDetails?.weaner || 0), 0),
                                                cullRevenue: yearData.reduce((sum, tm) => sum + (tm.revenueDetails?.cullSow || 0), 0),
                                                totalRevenue: yearData.reduce((sum, tm) => sum + (tm.revenue || 0), 0),
                                                giltCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.giltPurchase || 0), 0),
                                                feedCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.feed || 0), 0),
                                                ahpCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.ahp || 0), 0),
                                                laborCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.labor || 0), 0),
                                                overheadCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.overhead || 0), 0),
                                                utilityCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.utility || 0), 0),
                                                totalCost: yearData.reduce((sum, tm) => sum + (tm.costs || 0), 0),
                                                netProfit: yearData.reduce((sum, tm) => sum + (tm.netProfit || 0), 0)
                                            };
                                        } else if (mode === MODES.FATTENING) {
                                            // For Fattening Mode
                                            yearTotals = {
                                                totalRevenue: yearData.reduce((sum, tm) => sum + (tm.totalRevenue || tm.revenue || 0), 0),
                                                weanerCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.weaner || 0), 0),
                                                feedCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.feed || 0), 0),
                                                ahpCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.ahp || 0), 0),
                                                laborCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.labor || 0), 0),
                                                overheadCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.overhead || 0), 0),
                                                utilityCost: yearData.reduce((sum, tm) => sum + (tm.costDetails?.utilities || tm.costDetails?.utility || 0), 0),
                                                totalCost: yearData.reduce((sum, tm) => sum + (tm.costs?.total || tm.costs || 0), 0),
                                                netProfit: yearData.reduce((sum, tm) => sum + (tm.netProfit || 0), 0)
                                            };
                                        }
                                    }

                                    return (
                                        <React.Fragment key={idx}>
                                            <tr className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                <td className="px-2 py-2 font-medium sticky left-0 bg-inherit border-r z-10 whitespace-nowrap text-gray-700">
                                                    {m.monthLabel || `M${m.month}`}
                                                </td>

                                                {mode === MODES.INTEGRATED && (
                                                    <>
                                                        {/* Revenue Breakdown */}
                                                        <td className="px-2 py-2 text-right text-green-600">
                                                            {formatNumber(m.revenueDetails?.nursery || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-green-600">
                                                            {formatNumber(m.revenueDetails?.fattening || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-emerald-600">
                                                            {formatNumber(m.revenueDetails?.cullSow || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right font-bold text-green-700 bg-green-50/30">
                                                            {formatNumber(m.revenue, 1)}
                                                        </td>

                                                        {/* Cost Breakdown */}
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.giltPurchase || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber((m.costDetails?.breeding || 0) + (m.costDetails?.nurseryFeed || 0) + (m.costDetails?.fatteningFeed || 0), 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.ahp || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.labor || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.overhead || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.utility || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right font-bold text-red-700 bg-red-50/30">
                                                            {formatNumber(m.costs, 1)}
                                                        </td>
                                                    </>
                                                )}

                                                {mode === MODES.BREEDING && (
                                                    <>
                                                        {/* Revenue Breakdown */}
                                                        <td className="px-2 py-2 text-right text-green-600">
                                                            {formatNumber(m.revenueDetails?.weaner || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-emerald-600">
                                                            {formatNumber(m.revenueDetails?.cullSow || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right font-bold text-green-700 bg-green-50/30">
                                                            {formatNumber(m.revenue, 1)}
                                                        </td>

                                                        {/* Cost Breakdown */}
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.giltPurchase || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.feed || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.ahp || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.labor || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.overhead || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.utility || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right font-bold text-red-700 bg-red-50/30">
                                                            {formatNumber(m.costs, 1)}
                                                        </td>
                                                    </>
                                                )}
                                                {mode === MODES.FATTENING && (
                                                    <>
                                                        {/* Revenue - only Fattening */}
                                                        <td className="px-2 py-2 text-right font-bold text-green-700 bg-green-50/30">
                                                            {formatNumber(m.totalRevenue || m.revenue, 1)}
                                                        </td>

                                                        {/* Cost Breakdown */}
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.weaner || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.feed || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.ahp || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.labor || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.overhead || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-red-400">
                                                            {formatNumber(m.costDetails?.utilities || m.costDetails?.utility || 0, 1)}
                                                        </td>
                                                        <td className="px-2 py-2 text-right font-bold text-red-700 bg-red-50/30">
                                                            {formatNumber(m.costs?.total || m.costs, 1)}
                                                        </td>
                                                    </>
                                                )}

                                                <td className={`px-2 py-2 text-right font-bold border-l border-gray-300 sticky right-0 z-10 ${m.netProfit >= 0 ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'}`}>
                                                    {formatNumber(m.netProfit, 1)}
                                                </td>
                                            </tr>

                                            {/* Yearly Summary Row after December */}
                                            {isDecember && yearTotals && mode === MODES.INTEGRATED && (
                                                <tr className="bg-gray-700 text-white font-bold border-t-2 border-gray-600">
                                                    <td className="px-2 py-2 sticky left-0 bg-gray-700 border-r border-gray-600 z-10">
                                                        TOTAL {m.monthLabel.split('-')[1]}
                                                    </td>
                                                    {/* Revenue Breakdown */}
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.nurseryRevenue, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.fatteningRevenue, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-emerald-300">
                                                        {formatNumber(yearTotals.cullRevenue, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right bg-gray-600/50 text-green-300">
                                                        {formatNumber(yearTotals.totalRevenue, 1)}
                                                    </td>
                                                    {/* Cost Breakdown */}
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.giltCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.feedCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.ahpCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.laborCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.overheadCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.utilityCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right bg-gray-600/50 text-red-300">
                                                        {formatNumber(yearTotals.totalCost, 1)}
                                                    </td>
                                                    <td className={`px-2 py-2 text-right border-l border-gray-500 sticky right-0 z-10 bg-gray-700 ${yearTotals.netProfit >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                                                        {formatNumber(yearTotals.netProfit, 1)}
                                                    </td>
                                                </tr>
                                            )}

                                            {/* Yearly Summary Row for Breeding Mode */}
                                            {isDecember && yearTotals && mode === MODES.BREEDING && (
                                                <tr className="bg-gray-700 text-white font-bold border-t-2 border-gray-600">
                                                    <td className="px-2 py-2 sticky left-0 bg-gray-700 border-r border-gray-600 z-10">
                                                        TOTAL {m.monthLabel.split('-')[1]}
                                                    </td>
                                                    {/* Revenue Breakdown */}
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.weanerRevenue, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-emerald-300">
                                                        {formatNumber(yearTotals.cullRevenue, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right bg-gray-600/50 text-green-300">
                                                        {formatNumber(yearTotals.totalRevenue, 1)}
                                                    </td>
                                                    {/* Cost Breakdown */}
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.giltCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.feedCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.ahpCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.laborCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.overheadCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.utilityCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right bg-gray-600/50 text-red-300">
                                                        {formatNumber(yearTotals.totalCost, 1)}
                                                    </td>
                                                    <td className={`px-2 py-2 text-right border-l border-gray-500 sticky right-0 z-10 bg-gray-700 ${yearTotals.netProfit >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                                                        {formatNumber(yearTotals.netProfit, 1)}
                                                    </td>
                                                </tr>
                                            )}

                                            {/* Yearly Summary Row for Fattening Mode */}
                                            {isDecember && yearTotals && mode === MODES.FATTENING && (
                                                <tr className="bg-gray-700 text-white font-bold border-t-2 border-gray-600">
                                                    <td className="px-2 py-2 sticky left-0 bg-gray-700 border-r border-gray-600 z-10">
                                                        TOTAL {m.monthLabel.split('-')[1]}
                                                    </td>
                                                    {/* Revenue - single column */}
                                                    <td className="px-2 py-2 text-right bg-gray-600/50 text-green-300">
                                                        {formatNumber(yearTotals.totalRevenue, 1)}
                                                    </td>
                                                    {/* Cost Breakdown */}
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.weanerCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.feedCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.ahpCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.laborCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.overheadCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        {formatNumber(yearTotals.utilityCost, 1)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right bg-gray-600/50 text-red-300">
                                                        {formatNumber(yearTotals.totalCost, 1)}
                                                    </td>
                                                    <td className={`px-2 py-2 text-right border-l border-gray-500 sticky right-0 z-10 bg-gray-700 ${yearTotals.netProfit >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                                                        {formatNumber(yearTotals.netProfit, 1)}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const SummaryTab = ({ projection, formatCurrency, formatNumber }) => {
    // Get available years from timeline
    const availableYears = useMemo(() => {
        const years = new Set();
        projection.timeline.forEach(m => {
            const year = m.monthLabel?.split('-')[1];
            if (year) years.add(year);
        });
        return ['All Years', ...Array.from(years).sort()];
    }, [projection.timeline]);

    const [selectedYear, setSelectedYear] = useState('All Years');

    // Calculate filtered metrics based on selected year
    const filteredMetrics = useMemo(() => {
        let filteredData = projection.timeline;

        if (selectedYear !== 'All Years') {
            filteredData = projection.timeline.filter(m => {
                const year = m.monthLabel?.split('-')[1];
                return year === selectedYear;
            });
        }

        return {
            totalRevenue: filteredData.reduce((sum, m) => sum + (m.revenue || 0), 0),
            totalCosts: filteredData.reduce((sum, m) => sum + (m.costs || 0), 0),
            totalNetProfit: filteredData.reduce((sum, m) => sum + (m.netProfit || 0), 0),
            totalPigletsWeaned: filteredData.reduce((sum, m) => sum + (m.pigletsWeaned || 0), 0),
            totalNurserySold: filteredData.reduce((sum, m) => sum + (m.nurserySold || 0), 0),
            totalNurseryRevenue: filteredData.reduce((sum, m) => sum + (m.revenueDetails?.nursery || 0), 0),
            totalFatteningSold: filteredData.reduce((sum, m) => sum + (m.fatteningSold || 0), 0),
            totalFatteningRevenue: filteredData.reduce((sum, m) => sum + (m.revenueDetails?.fattening || 0), 0),
            totalCulledSows: filteredData.reduce((sum, m) => sum + (m.sowsCulled || 0), 0),
            totalCullRevenue: filteredData.reduce((sum, m) => sum + (m.revenueDetails?.cullSow || 0), 0)
        };
    }, [projection.timeline, selectedYear]);

    const netMargin = filteredMetrics.totalRevenue > 0
        ? (filteredMetrics.totalNetProfit / filteredMetrics.totalRevenue) * 100
        : 0;

    return (
        <div className="space-y-6">
            {/* Year Filter */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-gray-700">Filter Period:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-4 py-2 border rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border-2 border-green-400 p-4">
                    <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
                    <div className="text-xl font-bold text-green-600">
                        {formatCurrency(filteredMetrics.totalRevenue, currency)}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border-2 border-red-400 p-4">
                    <div className="text-xs text-gray-500 mb-1">Total Costs</div>
                    <div className="text-xl font-bold text-red-600">
                        {formatCurrency(filteredMetrics.totalCosts, currency)}
                    </div>
                </div>
                <div className={`bg-white rounded-xl shadow-sm border-2 p-4 ${filteredMetrics.totalNetProfit >= 0 ? 'border-blue-400' : 'border-orange-400'}`}>
                    <div className="text-xs text-gray-500 mb-1">Net Profit</div>
                    <div className={`text-xl font-bold ${filteredMetrics.totalNetProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(filteredMetrics.totalNetProfit, currency)}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border-2 border-purple-400 p-4">
                    <div className="text-xs text-gray-500 mb-1">Net Margin</div>
                    <div className="text-xl font-bold text-purple-600">
                        {netMargin.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Production Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Production Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* Total Piglets Weaned */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                        <div className="text-xs text-blue-600 font-semibold mb-1">Total Piglets Weaned</div>
                        <div className="text-2xl font-bold text-blue-700">
                            {formatNumber(filteredMetrics.totalPigletsWeaned)}
                        </div>
                    </div>

                    {/* Nursery Sold */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                        <div className="text-xs text-purple-600 font-semibold mb-1">Total Nursery Sold</div>
                        <div className="text-2xl font-bold text-purple-700">
                            {formatNumber(filteredMetrics.totalNurserySold)} <span className="text-sm">head</span>
                        </div>
                        <div className="text-sm text-purple-600 mt-1">
                            {formatCurrency(filteredMetrics.totalNurseryRevenue, currency)}
                        </div>
                    </div>

                    {/* Fattening Sold */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                        <div className="text-xs text-orange-600 font-semibold mb-1">Total Fattening Sold</div>
                        <div className="text-2xl font-bold text-orange-700">
                            {formatNumber(filteredMetrics.totalFatteningSold)} <span className="text-sm">head</span>
                        </div>
                        <div className="text-sm text-orange-600 mt-1">
                            {formatCurrency(filteredMetrics.totalFatteningRevenue, currency)}
                        </div>
                    </div>

                    {/* Culled Sows */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                        <div className="text-xs text-yellow-700 font-semibold mb-1">Total Culled Sows Sold</div>
                        <div className="text-2xl font-bold text-yellow-800">
                            {formatNumber(filteredMetrics.totalCulledSows)} <span className="text-sm">head</span>
                        </div>
                        <div className="text-sm text-yellow-700 mt-1">
                            {formatCurrency(filteredMetrics.totalCullRevenue, currency)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ScenariosTab = ({ scenarioName, setScenarioName, saveScenario, scenarios, deleteScenario, formatNumber }) => (
    <div className="space-y-6">
        {/* Save Scenario */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Save Current Scenario</h3>
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Enter scenario name..."
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button
                    onClick={saveScenario}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                    <Save size={16} /> Save
                </button>
            </div>
        </div>

        {/* Saved Scenarios */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Saved Scenarios ({scenarios.length})</h3>
            {scenarios.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No scenarios saved yet</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {scenarios.map((s) => (
                        <div key={s.id} className="border rounded-lg p-3 hover:border-blue-400">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {s.mode.toUpperCase()} - {new Date(s.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteScenario(s.id)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span>Net Profit:</span>
                                    <span className={s.summary.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {formatNumber(s.summary.totalNetProfit, 2)} M
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const SetupTab = ({ mode, MODES, cohorts, setCohorts, addCohort, deleteCohort, updateCohort, breedingParams, setBreedingParams, generateReplacementCohorts, costParams, setCostParams, fatteningParams, setFatteningParams, fatteningCostParams, setFatteningCostParams, exitPoints, setExitPoints, addExitPoint, deleteExitPoint, updateExitPoint, fatteningBarns, setFatteningBarns, addBarn, deleteBarn, updateBarn, barnAllocationMethod, setBarnAllocationMethod, integratedParams, setIntegratedParams, formatNumber, nurseryExitPoints, setNurseryExitPoints, fatteningExitPoints, setFatteningExitPoints, integratedInputs, setIntegratedInputs, onSave, currency, t }) => {
    let content;
    if (mode === MODES.BREEDING) {
        content = <BreedingSetup
            cohorts={cohorts}
            setCohorts={setCohorts}
            addCohort={addCohort}
            deleteCohort={deleteCohort}
            updateCohort={updateCohort}
            breedingParams={breedingParams}
            setBreedingParams={setBreedingParams}
            generateReplacementCohorts={generateReplacementCohorts}
            mode={mode}
            MODES={MODES}
            costParams={costParams}
            setCostParams={setCostParams}
            integratedInputs={integratedInputs}
            setIntegratedInputs={setIntegratedInputs}
            currency={currency}
            t={t}
        />;
    } else if (mode === MODES.FATTENING) {
        content = <FatteningSetup
            fatteningParams={fatteningParams}
            setFatteningParams={setFatteningParams}
            fatteningCostParams={fatteningCostParams}
            setFatteningCostParams={setFatteningCostParams}
            exitPoints={exitPoints}
            setExitPoints={setExitPoints}
            addExitPoint={addExitPoint}
            deleteExitPoint={deleteExitPoint}
            updateExitPoint={updateExitPoint}
            fatteningBarns={fatteningBarns}
            setFatteningBarns={setFatteningBarns}
            addBarn={addBarn}
            deleteBarn={deleteBarn}
            updateBarn={updateBarn}
            barnAllocationMethod={barnAllocationMethod}
            setBarnAllocationMethod={setBarnAllocationMethod}
            formatNumber={formatNumber}
            currency={currency}
            t={t}
        />;
    } else {
        content = <IntegratedSetup
            integratedParams={integratedParams}
            setIntegratedParams={setIntegratedParams}
            cohorts={cohorts}
            setCohorts={setCohorts}
            addCohort={addCohort}
            deleteCohort={deleteCohort}
            updateCohort={updateCohort}
            breedingParams={breedingParams}
            setBreedingParams={setBreedingParams}
            generateReplacementCohorts={generateReplacementCohorts}
            mode={mode}
            MODES={MODES}
            costParams={costParams}
            setCostParams={setCostParams}
            formatNumber={formatNumber}
            // Add new props
            nurseryExitPoints={nurseryExitPoints}
            setNurseryExitPoints={setNurseryExitPoints}
            fatteningExitPoints={fatteningExitPoints}
            setFatteningExitPoints={setFatteningExitPoints}
            integratedInputs={integratedInputs}
            setIntegratedInputs={setIntegratedInputs}
            onSave={onSave}
            currency={currency}
            t={t}
        />;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {content}
            <CostReferenceGuide t={t} />
        </div>
    );
};

const MoneyYearSummary = ({ timeline, formatCurrency, formatNumber }) => {
    // Aggregate by Year
    const yearlyData = useMemo(() => {
        const result = {};
        timeline.forEach(m => {
            // Extract actual year from monthLabel (e.g., "Jan 2026" or "Jan-2026")
            const year = m.monthLabel?.includes('-')
                ? m.monthLabel.split('-')[1]
                : m.monthLabel?.split(' ')[1];

            if (!year) return; // Skip if no year found

            if (!result[year]) {
                result[year] = {
                    year,
                    revenue: 0,
                    costs: 0,
                    netProfit: 0,
                    breedingCost: 0,
                    giltCost: 0,
                    nurseryCost: 0,
                    fatteningCost: 0,
                    fixedCost: 0,
                    nurseryRevenue: 0,
                    fatteningRevenue: 0,
                    cullRevenue: 0
                };
            }
            result[year].revenue += m.revenue;
            result[year].costs += m.costs;
            result[year].netProfit += m.netProfit;

            // Breakdowns
            result[year].breedingCost += (m.costDetails?.breeding || 0);
            result[year].giltCost += (m.costDetails?.giltCost || 0);
            result[year].nurseryCost += (m.costDetails?.nurseryFeed || 0);
            result[year].fatteningCost += (m.costDetails?.fatteningFeed || 0);
            result[year].fixedCost += (m.costDetails?.fixed || 0);

            result[year].nurseryRevenue += (m.revenueDetails?.nursery || 0);
            result[year].fatteningRevenue += (m.revenueDetails?.fattening || 0);
            result[year].cullRevenue += (m.revenueDetails?.cullSow || 0);
        });
        return Object.values(result).sort((a, b) => parseInt(a.year) - parseInt(b.year));
    }, [timeline]);

    return (
        <div className="mb-6 bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 border-b flex justify-between items-center">
                <h4 className="font-bold text-blue-900 flex items-center gap-2">
                    <Calendar size={16} /> Yearly Financial Summary
                </h4>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-gray-600 border-b">
                            <th className="px-3 py-2 text-left">Year</th>
                            <th className="px-3 py-2 text-right">Revenue</th>
                            <th className="px-3 py-2 text-right">Op. Costs</th>
                            <th className="px-3 py-2 text-right">Gilt Purchase</th>
                            <th className="px-3 py-2 text-right font-bold text-gray-800">Total Costs</th>
                            <th className="px-3 py-2 text-right font-bold text-gray-800">Net Profit</th>
                            <th className="px-3 py-2 text-right">Margin</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {yearlyData.map(y => (
                            <tr key={y.year} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium">{y.year}</td>
                                <td className="px-3 py-2 text-right text-green-600 font-medium">
                                    {formatNumber(y.revenue, 1)}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                    {formatNumber(y.costs - y.giltCost, 1)}
                                </td>
                                <td className="px-3 py-2 text-right text-orange-600">
                                    {formatNumber(y.giltCost, 1)}
                                </td>
                                <td className="px-3 py-2 text-right text-red-600 font-medium bg-red-50/30">
                                    {formatNumber(y.costs, 1)}
                                </td>
                                <td className={`px-3 py-2 text-right font-bold ${y.netProfit >= 0 ? 'text-blue-600 bg-blue-50/50' : 'text-red-500 bg-red-50/50'}`}>
                                    {formatNumber(y.netProfit, 1)}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-500">
                                    {y.revenue > 0 ? ((y.netProfit / y.revenue) * 100).toFixed(1) + '%' : '-'}
                                </td>
                            </tr>
                        ))}
                        {/* Grand Total Row */}
                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
                            <td className="px-3 py-2">TOTAL</td>
                            <td className="px-3 py-2 text-right text-green-700">
                                {formatNumber(yearlyData.reduce((s, y) => s + y.revenue, 0), 1)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                                {formatNumber(yearlyData.reduce((s, y) => s + (y.costs - y.giltCost), 0), 1)}
                            </td>
                            <td className="px-3 py-2 text-right text-orange-700">
                                {formatNumber(yearlyData.reduce((s, y) => s + y.giltCost, 0), 1)}
                            </td>
                            <td className="px-3 py-2 text-right text-red-700">
                                {formatNumber(yearlyData.reduce((s, y) => s + y.costs, 0), 1)}
                            </td>
                            <td className={`px-3 py-2 text-right ${yearlyData.reduce((s, y) => s + y.netProfit, 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                {formatNumber(yearlyData.reduce((s, y) => s + y.netProfit, 0), 1)}
                            </td>
                            <td className="px-3 py-2"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function PigFarmCalculator({ onBack }) { // onBack prop added
    // Initialize mode from localStorage or default to INTEGRATED
    const [mode, setMode] = useState(() => {
        const savedMode = localStorage.getItem('pigFarmCalculator_mode');
        return savedMode || MODES.INTEGRATED;
    });

    // Currency state from localStorage
    const [currency, setCurrency] = useState(() => localStorage.getItem('farmfs-currency') || 'USD');
    const [language, setLanguage] = useState(() => localStorage.getItem('farmfs-language') || 'en');

    // Translation helper
    const t = translations[language] || translations.en;

    // State for each mode
    const [breedingParams, setBreedingParams] = useState(defaultBreedingParams);
    const [fatteningParams, setFatteningParams] = useState(defaultFatteningParams);
    const [integratedParams, setIntegratedParams] = useState(defaultIntegratedParams);

    // NEW: Cost Parameters
    const [costParams, setCostParams] = useState({
        // Direct costs
        giltPrice: 7000000,           // IDR per gilt
        cullSowPrice: 22000,          // IDR per kg (Sow)
        cullSowWeight: 180,           // kg
        feedPricePerKg: 11000,        // IDR per kg
        sowFeedPerDay: 2.6,           // kg per sow per day

        // Monthly operating costs (TOTAL for whole farm)
        ahpPerMonth: 758300,          // IDR total monthly
        laborPerMonth: 900000,        // IDR total monthly
        overheadPerMonth: 4650000,    // IDR total monthly
        utilitiesPerMonth: 2500000,   // IDR total monthly

        // Annual escalation rates
        giltCostEscalation: 0.015,    // 1.5%
        feedEscalation: 0.01,         // 1.0%
        ahpEscalation: 0.01,          // 1.0%
        laborEscalation: 0.02,        // 2.0%
        overheadEscalation: 0.01,     // 1.0%
        utilitiesEscalation: 0.02,    // 2.0%
    });

    // NEW: Cost Parameters (Fattening)
    const [fatteningCostParams, setFatteningCostParams] = useState({
        ahpPerMonth: 500000,
        laborPerMonth: 1200000,
        overheadPerMonth: 800000,
        utilitiesPerMonth: 1500000,
        weanerEscalation: 0.01,
        feedEscalation: 0.02,
        ahpEscalation: 0.02,
        laborEscalation: 0.02,
        overheadEscalation: 0.01,
        utilitiesEscalation: 0.02,
    });

    // NEW: Exit Points (Fattening Sales Strategy)
    const [exitPoints, setExitPoints] = useState([
        {
            id: 1,
            exitMonth: 2,
            targetWeight: 40,
            percentage: 20,
            pricePerKg: 48000,
            active: true
        },
        {
            id: 2,
            exitMonth: 4,
            targetWeight: 80,
            percentage: 30,
            pricePerKg: 46000,
            active: true
        },
        {
            id: 3,
            exitMonth: 6,
            targetWeight: 120,
            percentage: 50,
            pricePerKg: 45000,
            active: true
        },
    ]);

    // ============================================
    // NEW INTEGRATED STATE
    // ============================================

    // Piglet Allocation & Inputs
    const [integratedInputs, setIntegratedInputs] = useState({
        nurseryAllocationPercent: 0.20, // 20% to nursery
        nurseryTargetWeight: 25,
        nurseryPrice: 55000,
        nurseryAdg: 0.45,
        nurseryFcr: 1.6,

        nurseryMortality: 0.03,
        includeGiltCost: true,
        breedingSowCapacity: 0, // Initialize to 0 for clean slate
        cohort0ReplacementRate: 40, // Default 40% for established herd
        isNewFarm: true, // Default to NEW FARM (user builds from scratch with cohorts)

        // Progressive Culling Rates
        cullingRateY1: 0,    // Year 1: 0%
        cullingRateY2: 0.30, // Year 2: 30%
        cullingRateY3Plus: 0.40, // Year 3+: 40%
    });

    // Nursery Exit Points (Integrated)
    const [nurseryExitPoints, setNurseryExitPoints] = useState([
        { id: 1, active: true, exitMonth: 2, targetWeight: 25, percentage: 100, pricePerKg: 55000 }
    ]);

    // Fattening Exit Points (Integrated)
    const [fatteningExitPoints, setFatteningExitPoints] = useState([
        { id: 1, active: true, exitMonth: 5, targetWeight: 115, percentage: 100, pricePerKg: 45000 }
    ]);

    // Cohorts (for breeding & integrated modes)
    const [cohorts, setCohorts] = useState([]);

    // Barns (for fattening mode cohort feature)
    const [fatteningBarns, setFatteningBarns] = useState([]);
    const [barnAllocationMethod, setBarnAllocationMethod] = useState('biomass'); // 'perCapita', 'equalSplit', 'biomass'

    // Active tab - initialize from localStorage or default to 'setup'
    const [activeTab, setActiveTab] = useState(() => {
        const savedTab = localStorage.getItem('pigFarmCalculator_activeTab');
        return savedTab || 'setup';
    });

    // Scenarios
    const [scenarios, setScenarios] = useState([]);
    const [scenarioName, setScenarioName] = useState('');

    // Save mode to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('pigFarmCalculator_mode', mode);
    }, [mode]);

    // Save activeTab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('pigFarmCalculator_activeTab', activeTab);
    }, [activeTab]);

    // Calculate projection based on mode
    const projection = useMemo(() => {
        const months = mode === MODES.BREEDING ? breedingParams.projectMonths :
            mode === MODES.FATTENING ? fatteningParams.projectMonths :
                integratedParams.projectMonths;

        if (mode === MODES.BREEDING) {
            // Breeding Mode uses Integrated Mode logic but stops at weaning (no nursery/fattening)
            // CRITICAL: Set BOTH allocations to 0 to ensure all weaned piglets are sold as weaners
            const breedingInputs = {
                ...integratedInputs,
                nurseryAllocationPercent: 0,
                fatteningAllocationPercent: 0,
                projectStartDate: breedingParams.projectStartDate || integratedInputs.projectStartDate
            };

            // Merge breedingParams into integratedParams for weaner price and Y1/Y2+ parameters
            const mergedParams = {
                ...integratedParams,
                breeding: {
                    ...integratedParams.breeding,
                    weanerPrice: breedingParams.weanerPrice || integratedParams.breeding?.weanerPrice || 1200000,
                    // Year 1 parameters
                    farrowingRateY1: breedingParams.farrowingRateY1 !== undefined ? breedingParams.farrowingRateY1 : 0.85,
                    bornAliveY1: breedingParams.bornAliveY1 !== undefined ? breedingParams.bornAliveY1 : 12,
                    preWeaningMortalityY1: breedingParams.preWeaningMortalityY1 !== undefined ? breedingParams.preWeaningMortalityY1 : 0.10,
                    // Year 2+ parameters
                    farrowingRateY2: breedingParams.farrowingRateY2 !== undefined ? breedingParams.farrowingRateY2 : 0.90,
                    bornAliveY2: breedingParams.bornAliveY2 !== undefined ? breedingParams.bornAliveY2 : 13,
                    preWeaningMortalityY2: breedingParams.preWeaningMortalityY2 !== undefined ? breedingParams.preWeaningMortalityY2 : 0.08
                }
            };

            // Debug: Verify allocations are 0
            console.log('🔍 BREEDING MODE SETUP:', {
                nurseryAlloc: breedingInputs.nurseryAllocationPercent,
                fatteningAlloc: breedingInputs.fatteningAllocationPercent,
                weanerPrice: mergedParams.breeding.weanerPrice
            });

            return calculateIntegratedMode(cohorts, mergedParams, costParams, months, breedingInputs, [], []);
        } else if (mode === MODES.FATTENING) {
            // Check if barn mode is active (barns exist)
            if (fatteningBarns && fatteningBarns.length > 0) {
                // Generate all cohorts from Production Schedule
                const today = new Date();
                const endDate = new Date(today.getFullYear() + 2, 11, 31);
                const allCohorts = generateFutureCohorts(fatteningBarns, fatteningParams, endDate.toISOString().split('T')[0]);

                // Calculate barn-level results for costing analysis
                const barnResults = calculateFatteningBarnMode(
                    fatteningBarns,
                    fatteningParams,
                    fatteningCostParams,
                    months,
                    fatteningParams.projectStartDate || '2026-01-01',
                    barnAllocationMethod
                );

                // Calculate cohort-based cash flow that follows Production Schedule
                const cohortCashFlow = calculateCohortBasedCashFlow(
                    allCohorts,
                    fatteningParams,
                    fatteningCostParams,
                    months,
                    fatteningParams.projectStartDate || '2026-01-01'
                );

                // Use cohort-based cash flow for financial timeline
                if (cohortCashFlow && barnResults) {
                    return {
                        timeline: cohortCashFlow.monthlyCashFlow.map(cf => ({
                            month: cf.month,
                            monthLabel: cf.monthLabel,
                            totalRevenue: cf.totalRevenue,
                            revenue: cf.totalRevenue,
                            costs: cf.totalCosts,
                            netProfit: cf.netCashFlow,
                            // Add cost breakdown for financial table
                            costDetails: {
                                weaner: cf.costBreakdown.weaner,
                                feed: cf.costBreakdown.feed,
                                ahp: cf.costBreakdown.ahp,
                                labor: cf.costBreakdown.labor,
                                overhead: cf.costBreakdown.overhead,
                                utilities: cf.costBreakdown.utilities,
                                utility: cf.costBreakdown.utilities, // Alias for compatibility
                            },
                        })),
                        summary: {
                            totalRevenue: cohortCashFlow.summary.totalRevenue / 1000000,
                            totalCosts: cohortCashFlow.summary.totalCosts / 1000000,
                            totalNetProfit: cohortCashFlow.summary.totalProfit / 1000000,
                            avgMonthlyProfit: (cohortCashFlow.summary.totalProfit / 1000000) / months,
                            netMargin: cohortCashFlow.summary.totalRevenue > 0 ? cohortCashFlow.summary.totalProfit / cohortCashFlow.summary.totalRevenue : 0,
                        },
                        // Store barn results for costing analysis display
                        barnResults: barnResults.barnResults,
                        isBarnMode: true,
                    };
                }
            }
            // Return empty timeline when no barns configured
            return {
                timeline: [],
                summary: {
                    totalRevenue: 0,
                    totalCosts: 0,
                    totalNetProfit: 0,
                    avgMonthlyProfit: 0,
                    netMargin: 0,
                },
                barnResults: [],
                isBarnMode: false,
            };
        } else {
            return calculateIntegratedMode(cohorts, integratedParams, costParams, months, integratedInputs, nurseryExitPoints, fatteningExitPoints);
        }
    }, [mode, cohorts, breedingParams, fatteningParams, integratedParams, costParams, fatteningCostParams, exitPoints, integratedInputs, nurseryExitPoints, fatteningExitPoints, fatteningBarns, barnAllocationMethod]);

    // Cohort management
    const addCohort = () => {
        setCohorts([...cohorts, {
            id: Date.now(),
            name: `Cohort ${cohorts.length + 1}`,
            numberOfGilts: 100,
            entryDate: new Date().toISOString().split('T')[0],
            // daysToFirstMating: undefined, // Let it be undefined so Smart Logic works
        }]);
    };

    const deleteCohort = (id) => {
        if (cohorts.length > 1) {
            setCohorts(cohorts.filter(c => c.id !== id));
        }
    };

    const updateCohort = (id, field, value) => {
        setCohorts(cohorts.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    // Barn management (for Fattening Mode)
    const addBarn = () => {
        // Validation: Max 20 barns
        if (fatteningBarns.length >= 20) {
            alert('Maximum 20 barns allowed');
            return;
        }

        // Get farm default target weight
        const defaultTargetWeight = fatteningParams.targetWeight || 120;

        setFatteningBarns([...fatteningBarns, {
            id: Date.now(),
            name: `Barn ${fatteningBarns.length + 1}`,
            population: 200,
            pigInDate: new Date().toISOString().split('T')[0],
            weightIn: null,        // null = use farm default
            adg: null,             // null = use farm default
            fcr: null,             // null = use farm default
            mortality: null,       // null = use farm default
            cullingRate: null,     // null = use farm default
            pigletPrice: null,     // null = use farm default
            exitPoints: [          // Per-barn exit points
                { id: 1, active: true, exitMonth: 5, targetWeight: defaultTargetWeight, percentage: 100, pricePerKg: 45000 }
            ],
        }]);
    };

    const deleteBarn = (id) => {
        if (fatteningBarns.length > 1) {
            setFatteningBarns(fatteningBarns.filter(b => b.id !== id));
        }
    };

    const updateBarn = (id, field, value) => {
        setFatteningBarns(fatteningBarns.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    // Generate replacement cohorts
    const generateReplacementCohorts = () => {
        if (cohorts.length === 0) {
            alert('Please add at least one founding cohort first!');
            return;
        }

        const params = mode === MODES.INTEGRATED ? integratedParams.breeding : breedingParams;
        const {
            year1CullingRate,
            year2CullingRate,
            year3PlusCullingRate,
            replacementLeadTime
        } = params;

        const replacementNeeds = [];

        cohorts.forEach(cohort => {
            const entryDate = new Date(cohort.entryDate);
            let remaining = cohort.numberOfGilts;

            // Year 1 culling
            const y1Culled = Math.round(remaining * year1CullingRate);
            if (y1Culled > 0) {
                replacementNeeds.push({
                    entryDate: addMonths(addMonths(entryDate, 12), -replacementLeadTime),
                    numberOfGilts: y1Culled,
                    reason: `${cohort.name} Year 1 replacement`
                });
            }
            remaining -= y1Culled;

            // Year 2 culling
            const y2Culled = Math.round(remaining * year2CullingRate);
            if (y2Culled > 0) {
                replacementNeeds.push({
                    entryDate: addMonths(addMonths(entryDate, 24), -replacementLeadTime),
                    numberOfGilts: y2Culled,
                    reason: `${cohort.name} Year 2 replacement`
                });
            }
            remaining -= y2Culled;

            // Year 3 culling
            const y3Culled = Math.round(remaining * year3PlusCullingRate);
            if (y3Culled > 0) {
                replacementNeeds.push({
                    entryDate: addMonths(addMonths(entryDate, 36), -replacementLeadTime),
                    numberOfGilts: y3Culled,
                    reason: `${cohort.name} Year 3 replacement`
                });
            }
        });

        // Group by date
        const grouped = {};
        replacementNeeds.forEach(r => {
            const key = r.entryDate.toISOString().split('T')[0];
            if (!grouped[key]) {
                grouped[key] = { entryDate: r.entryDate, numberOfGilts: 0, reasons: [] };
            }
            grouped[key].numberOfGilts += r.numberOfGilts;
            grouped[key].reasons.push(r.reason);
        });

        // Create cohorts
        const newCohorts = Object.values(grouped).map((r, idx) => ({
            id: Date.now() + idx,
            name: `Replacement ${formatDate(r.entryDate.toISOString().split('T')[0])}`,
            numberOfGilts: r.numberOfGilts,
            entryDate: r.entryDate.toISOString().split('T')[0],
            daysToFirstMating: params.daysToFirstMating,
            autoGenerated: true,
            generationReason: r.reasons.join('; ')
        }));

        setCohorts([...cohorts, ...newCohorts]);
        alert(`Generated ${newCohorts.length} replacement cohort(s)!`);
    };

    // Scenario management
    const saveScenario = () => {
        if (!scenarioName.trim()) {
            alert('Please enter a scenario name');
            return;
        }

        const params = mode === MODES.BREEDING ? breedingParams :
            mode === MODES.FATTENING ? fatteningParams :
                integratedParams;

        const scenario = {
            id: Date.now(),
            name: scenarioName,
            mode,
            cohorts: mode !== MODES.FATTENING ? [...cohorts] : [],
            params,
            summary: projection.summary,
            createdAt: new Date().toISOString(),
        };

        setScenarios([...scenarios, scenario]);
        setScenarioName('');
        alert(`Scenario "${scenarioName}" saved!`);
    };

    const deleteScenario = (id) => {
        if (confirm('Delete this scenario?')) {
            setScenarios(scenarios.filter(s => s.id !== id));
        }
    };

    // Fattening Helper Functions
    const addExitPoint = () => {
        const newId = Math.max(...exitPoints.map(e => e.id), 0) + 1;
        setExitPoints([...exitPoints, {
            id: newId,
            exitMonth: 3,
            targetWeight: 60,
            percentage: 0,
            pricePerKg: 45000,
            active: true
        }]);
    };

    const deleteExitPoint = (id) => {
        if (exitPoints.filter(e => e.active).length > 1) {
            setExitPoints(exitPoints.filter(e => e.id !== id));
        } else {
            alert('Must keep at least one exit point!');
        }
    };

    const updateExitPoint = (id, field, value) => {
        setExitPoints(exitPoints.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    };

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                                <button
                                    onClick={onBack}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors mr-2"
                                    title="Back to Menu"
                                >
                                    <ArrowLeft size={28} />
                                </button>
                                <Factory size={32} />
                                PIG FARM PRODUCTION CALCULATOR
                            </h1>
                            <p className="text-blue-200 text-sm mt-1 ml-12">
                                {mode === MODES.BREEDING ? '🐷 Breeding Mode' :
                                    mode === MODES.FATTENING ? '🥩 Fattening Mode' :
                                        '🔗 Integrated Mode'}
                            </p>
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2"
                        >
                            <FileDown size={16} /> Export PDF
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Mode Selector */}
                <ModeSelector mode={mode} setMode={setMode} MODES={MODES} t={t} />

                {/* Navigation Tabs */}
                <nav className="bg-white shadow-sm rounded-lg mb-6">
                    <div className="flex gap-1 overflow-x-auto p-2">
                        {[
                            { id: 'setup', label: t.calculator.tabs.setup, icon: Settings },
                            { id: 'production', label: t.calculator.tabs.production, icon: Factory },
                            { id: 'financial', label: t.calculator.tabs.financial, icon: Calendar },
                            { id: 'scenarios', label: t.calculator.tabs.scenarios, icon: Save },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-blue-600'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Active Tab Content */}
                <div>
                    {activeTab === 'setup' && (
                        <SetupTab
                            mode={mode}
                            MODES={MODES}
                            cohorts={cohorts}
                            setCohorts={setCohorts}
                            addCohort={addCohort}
                            deleteCohort={deleteCohort}
                            updateCohort={updateCohort}
                            breedingParams={breedingParams}
                            setBreedingParams={setBreedingParams}
                            generateReplacementCohorts={generateReplacementCohorts}
                            costParams={costParams}
                            setCostParams={setCostParams}
                            fatteningParams={fatteningParams}
                            setFatteningParams={setFatteningParams}
                            fatteningCostParams={fatteningCostParams}
                            setFatteningCostParams={setFatteningCostParams}
                            exitPoints={exitPoints}
                            setExitPoints={setExitPoints}
                            addExitPoint={addExitPoint}
                            deleteExitPoint={deleteExitPoint}
                            updateExitPoint={updateExitPoint}
                            fatteningBarns={fatteningBarns}
                            setFatteningBarns={setFatteningBarns}
                            addBarn={addBarn}
                            deleteBarn={deleteBarn}
                            updateBarn={updateBarn}
                            barnAllocationMethod={barnAllocationMethod}
                            setBarnAllocationMethod={setBarnAllocationMethod}
                            integratedParams={integratedParams}
                            setIntegratedParams={setIntegratedParams}
                            formatNumber={formatNumber}

                            nurseryExitPoints={nurseryExitPoints}
                            setNurseryExitPoints={setNurseryExitPoints}
                            fatteningExitPoints={fatteningExitPoints}
                            setFatteningExitPoints={setFatteningExitPoints}
                            integratedInputs={integratedInputs}
                            setIntegratedInputs={setIntegratedInputs}
                            onSave={() => setActiveTab('production')}
                            currency={currency}
                            t={t}
                        />
                    )}
                    {activeTab === 'production' && (
                        <div className="space-y-6">
                            {mode === MODES.INTEGRATED && <BiologicalTimelineExample />}

                            <ProductionTimeline
                                mode={mode}
                                MODES={MODES}
                                projection={projection}
                                formatNumber={formatNumber}
                                fatteningBarns={fatteningBarns}
                                fatteningParams={fatteningParams}
                                currency={currency}
                                t={t}
                            />

                            {mode === MODES.INTEGRATED && (
                                <MatingCohortTracker dailyEvents={projection.dailyEvents} />
                            )}
                        </div>
                    )}
                    {activeTab === 'financial' && (
                        <FinancialTimeline
                            mode={mode}
                            MODES={MODES}
                            projection={projection}
                            formatNumber={formatNumber}
                            formatCurrency={formatCurrency}
                            currency={currency}
                            t={t}
                        />
                    )}
                    {activeTab === 'scenarios' && (
                        <ScenariosTab
                            scenarioName={scenarioName}
                            setScenarioName={setScenarioName}
                            saveScenario={saveScenario}
                            scenarios={scenarios}
                            deleteScenario={deleteScenario}
                            formatNumber={formatNumber}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
