// Fattening Barn/Cohort Calculation Engine
// Per-barn production and cost calculations with biomass-weighted allocation

/**
 * Calculate per-barn production metrics
 * @param {Object} barn - Barn configuration
 * @param {Object} farmDefaults - Farm-level default parameters
 * @returns {Object} Production metrics for the barn
 */
export function calculateBarnProduction(barn, farmDefaults) {
    // Resolve effective parameters (barn override or farm default)
    const effectiveParams = {
        weightIn: barn.weightIn ?? farmDefaults.weanerPurchaseWeight,
        adg: barn.adg ?? farmDefaults.adg,
        fcr: barn.fcr ?? farmDefaults.fcr,
        mortality: barn.mortality ?? farmDefaults.mortality,
        cullingRate: barn.cullingRate ?? farmDefaults.cullingRate ?? 0,
        pigletPrice: barn.pigletPrice ?? farmDefaults.weanerPurchasePrice,
    };

    // Apply mortality once at beginning
    const pigsSurvived = Math.round(barn.population * (1 - effectiveParams.mortality));
    const pigsDied = barn.population - pigsSurvived;

    // Process exit points (multi-exit strategy)
    const activeExitPoints = (barn.exitPoints || []).filter(e => e.active);
    
    let totalKgProduced = 0;
    let totalFeedConsumed = 0;
    let maxFatteningDays = 0;
    const exitDetails = [];

    if (activeExitPoints.length > 0) {
        // Multi-exit strategy
        activeExitPoints.forEach(exit => {
            const pigsAtExit = Math.round(pigsSurvived * exit.percentage / 100);
            const weightGain = Math.max(0, exit.targetWeight - effectiveParams.weightIn);
            const daysInFattening = Math.round(weightGain / effectiveParams.adg);
            const feedPerPig = weightGain * effectiveParams.fcr;
            const totalWeight = pigsAtExit * exit.targetWeight;
            
            totalKgProduced += totalWeight;
            totalFeedConsumed += pigsAtExit * feedPerPig;
            maxFatteningDays = Math.max(maxFatteningDays, daysInFattening);

            exitDetails.push({
                exitPointId: exit.id,
                targetWeight: exit.targetWeight,
                percentage: exit.percentage,
                pricePerKg: exit.pricePerKg,
                pigsOut: pigsAtExit,
                totalWeight,
                daysInFattening,
                feedConsumed: pigsAtExit * feedPerPig,
            });
        });
    } else {
        // Fallback: single exit at farm default target weight
        const defaultTargetWeight = farmDefaults.targetWeight || 120;
        const weightGain = Math.max(0, defaultTargetWeight - effectiveParams.weightIn);
        const daysInFattening = Math.round(weightGain / effectiveParams.adg);
        const feedPerPig = weightGain * effectiveParams.fcr;
        const totalWeight = pigsSurvived * defaultTargetWeight;
        
        totalKgProduced = totalWeight;
        totalFeedConsumed = barn.population * feedPerPig;
        maxFatteningDays = daysInFattening;

        exitDetails.push({
            exitPointId: 'default',
            targetWeight: defaultTargetWeight,
            percentage: 100,
            pricePerKg: farmDefaults.finisherPrice || 45000,
            pigsOut: pigsSurvived,
            totalWeight,
            daysInFattening,
            feedConsumed: totalFeedConsumed,
        });
    }
    
    // Calculate pig-out date based on longest fattening period
    const pigInDate = new Date(barn.pigInDate);
    
    // Validate maxFatteningDays
    if (isNaN(maxFatteningDays) || maxFatteningDays < 0) {
        console.error('Invalid maxFatteningDays:', maxFatteningDays, 'for barn:', barn.name);
        maxFatteningDays = 150; // Default fallback
    }
    
    const pigOutDate = new Date(pigInDate);
    pigOutDate.setDate(pigOutDate.getDate() + maxFatteningDays);

    // Calculate next batch date (pig-out + cleaning period)
    const cleaningPeriodDays = farmDefaults.cleaningPeriodDays || 14;
    const nextBatchDate = new Date(pigOutDate);
    nextBatchDate.setDate(nextBatchDate.getDate() + cleaningPeriodDays);

    // Validate dates before converting to ISO string
    if (isNaN(pigOutDate.getTime())) {
        console.error('Invalid pigOutDate for barn:', barn.name);
        pigOutDate.setTime(pigInDate.getTime() + (150 * 24 * 60 * 60 * 1000)); // Default 150 days
    }
    if (isNaN(nextBatchDate.getTime())) {
        console.error('Invalid nextBatchDate for barn:', barn.name);
        nextBatchDate.setTime(pigOutDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // Default 14 days
    }

    // Calculate culled pigs (pigs that survive but sold at below-standard weight)
    const pigsCulled = Math.round(barn.population * effectiveParams.cullingRate);
    const pigsForFinisher = pigsSurvived - pigsCulled;

    return {
        barnId: barn.id,
        barnName: barn.name,
        population: barn.population,
        pigInDate: barn.pigInDate,
        pigOutDate: pigOutDate.toISOString().split('T')[0],
        nextBatchDate: nextBatchDate.toISOString().split('T')[0],
        fatteningDays: maxFatteningDays,
        cleaningPeriodDays,
        effectiveParams,
        pigsSurvived,
        pigsDied,
        pigsCulled,
        pigsForFinisher,
        totalKgProduced,
        feedConsumed: totalFeedConsumed,
        exitDetails,
    };
}

/**
 * Generate future cohorts for all barns up to specified end date
 * @param {Array} barns - Array of existing barns
 * @param {Object} farmDefaults - Farm-level default parameters
 * @param {string} endDate - End date for forecasting (YYYY-MM-DD)
 * @returns {Array} Array of all cohorts (existing + future)
 */
export function generateFutureCohorts(barns, farmDefaults, endDate) {
    const allCohorts = [];
    const endDateObj = new Date(endDate);
    
    barns.forEach((barn, barnIndex) => {
        // Calculate production metrics for the initial barn
        const initialProduction = calculateBarnProduction(barn, farmDefaults);
        
        // Add initial cohort
        const barnNumber = String(barnIndex + 1).padStart(2, '0');
        allCohorts.push({
            barnId: barn.id,
            barnName: barn.name,
            cohortCode: `${barnNumber}0001`,
            cohortNumber: 1,
            population: barn.population,
            pigInDate: barn.pigInDate,
            pigOutDate: initialProduction.pigOutDate,
            nextBatchDate: initialProduction.nextBatchDate,
            fatteningDays: initialProduction.fatteningDays,
            cleaningPeriodDays: initialProduction.cleaningPeriodDays,
            pigsSurvived: initialProduction.pigsSurvived,
            pigsDied: initialProduction.pigsDied,
            totalKgProduced: initialProduction.totalKgProduced,
            effectiveParams: initialProduction.effectiveParams,
            exitDetails: initialProduction.exitDetails, // Add exit point details
        });
        
        // Generate future cohorts until end date
        let cohortNumber = 2;
        let currentPigInDate = new Date(initialProduction.nextBatchDate);
        
        while (currentPigInDate <= endDateObj) {
            // Create a temporary barn object for this cohort
            const futureBarn = {
                ...barn,
                pigInDate: currentPigInDate.toISOString().split('T')[0],
            };
            
            const futureProduction = calculateBarnProduction(futureBarn, farmDefaults);
            
            allCohorts.push({
                barnId: barn.id,
                barnName: barn.name,
                cohortCode: `${barnNumber}${String(cohortNumber).padStart(4, '0')}`,
                cohortNumber,
                population: barn.population,
                pigInDate: futureBarn.pigInDate,
                pigOutDate: futureProduction.pigOutDate,
                nextBatchDate: futureProduction.nextBatchDate,
                fatteningDays: futureProduction.fatteningDays,
                cleaningPeriodDays: futureProduction.cleaningPeriodDays,
                pigsSurvived: futureProduction.pigsSurvived,
                pigsDied: futureProduction.pigsDied,
                totalKgProduced: futureProduction.totalKgProduced,
                effectiveParams: futureProduction.effectiveParams,
                exitDetails: futureProduction.exitDetails, // Add exit point details
            });
            
            // Move to next batch
            currentPigInDate = new Date(futureProduction.nextBatchDate);
            cohortNumber++;
        }
    });
    
    return allCohorts;
}

/**
 * Create monthly production schedule from cohorts
 * @param {Array} cohorts - Array of all cohorts
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Monthly schedule with pigs in, after mortality, and sold
 */
export function createMonthlySchedule(cohorts, startDate, endDate) {
    const schedule = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Generate all months in range
    let currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (currentDate <= end) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        let pigsIn = 0;
        let afterMortality = 0;
        let totalSold = 0;
        
        // Check each cohort for activity in this month
        cohorts.forEach(cohort => {
            const pigInDate = new Date(cohort.pigInDate);
            const pigOutDate = new Date(cohort.pigOutDate);
            
            // Check if pig-in occurs in this month
            if (pigInDate.getFullYear() === currentDate.getFullYear() && 
                pigInDate.getMonth() === currentDate.getMonth()) {
                pigsIn += cohort.population;
                afterMortality += cohort.pigsSurvived;
            }
            
            // Check if pig-out occurs in this month
            if (pigOutDate.getFullYear() === currentDate.getFullYear() && 
                pigOutDate.getMonth() === currentDate.getMonth()) {
                totalSold += cohort.pigsSurvived;
            }
        });
        
        schedule.push({
            monthKey,
            monthLabel,
            pigsIn,
            afterMortality,
            totalSold,
        });
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return schedule;
}

/**
 * Calculate barn status based on current date
 * @param {Object} barnProduction - Production metrics from calculateBarnProduction
 * @param {string} currentDate - Current date (YYYY-MM-DD)
 * @returns {Object} Status object with status, dayInCycle, and other info
 */
export function getBarnStatus(barnProduction, currentDate) {
    const today = new Date(currentDate);
    const pigIn = new Date(barnProduction.pigInDate);
    const pigOut = new Date(barnProduction.pigOutDate);
    const nextBatch = new Date(barnProduction.nextBatchDate);
    
    let status = 'notStarted';
    let dayInCycle = 0;
    let daysRemaining = 0;
    
    if (today < pigIn) {
        status = 'notStarted';
        daysRemaining = Math.floor((pigIn - today) / (1000 * 60 * 60 * 24));
    } else if (today >= pigIn && today < pigOut) {
        status = 'growing';
        dayInCycle = Math.floor((today - pigIn) / (1000 * 60 * 60 * 24)) + 1;
        daysRemaining = Math.floor((pigOut - today) / (1000 * 60 * 60 * 24));
    } else if (today >= pigOut && today < nextBatch) {
        status = 'cleaning';
        dayInCycle = barnProduction.fatteningDays;
        daysRemaining = Math.floor((nextBatch - today) / (1000 * 60 * 60 * 24));
    } else {
        status = 'readyForNextBatch';
        dayInCycle = barnProduction.fatteningDays;
        daysRemaining = 0;
    }
    
    return {
        status,
        dayInCycle,
        totalDays: barnProduction.fatteningDays,
        daysRemaining,
        progressPercent: barnProduction.fatteningDays > 0 ? (dayInCycle / barnProduction.fatteningDays * 100) : 0,
    };
}

/**
 * Calculate monthly biomass for a barn
 * @param {Object} barnProduction - Production metrics
 * @param {number} monthIndex - Month index (0-based)
 * @param {string} projectStartDate - Project start date
 * @returns {number} Biomass in kg for this month
 */
export function calculateMonthlyBiomass(barnProduction, monthIndex, projectStartDate) {
    const monthDate = new Date(projectStartDate);
    monthDate.setMonth(monthDate.getMonth() + monthIndex);
    
    const pigInDate = new Date(barnProduction.pigInDate);
    const pigOutDate = new Date(barnProduction.pigOutDate);
    
    // Check if barn is active this month
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    if (pigOutDate < monthStart || pigInDate > monthEnd) {
        return 0; // Barn not active this month
    }
    
    // Calculate days active in this month
    const activeStart = pigInDate > monthStart ? pigInDate : monthStart;
    const activeEnd = pigOutDate < monthEnd ? pigOutDate : monthEnd;
    const daysActive = Math.max(0, Math.ceil((activeEnd - activeStart) / (1000 * 60 * 60 * 24)) + 1);
    
    if (daysActive <= 0) return 0;
    
    // Calculate average body weight during this month
    const daysFromPigIn = Math.floor((activeStart - pigInDate) / (1000 * 60 * 60 * 24));
    const avgWeight = barnProduction.effectiveParams.weightIn + 
                     (barnProduction.effectiveParams.adg * (daysFromPigIn + daysActive / 2));
    
    // Biomass = active population × average weight × (days active / days in month)
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const activePigs = barnProduction.population; // Assume all alive until pig-out
    const biomass = activePigs * avgWeight * (daysActive / daysInMonth);
    
    return biomass;
}

/**
 * Allocate monthly fixed costs across active barns
 * @param {Array} barnProductions - Array of barn production metrics
 * @param {number} monthIndex - Month index (0-based)
 * @param {Object} monthlyCosts - Monthly fixed costs {ahp, labor, overhead, utilities}
 * @param {string} allocationMethod - 'perCapita', 'equalSplit', or 'biomass'
 * @param {string} projectStartDate - Project start date
 * @returns {Object} Cost allocation per barn {barnId: {ahp, labor, overhead, utilities}}
 */
export function allocateMonthlyFixedCosts(barnProductions, monthIndex, monthlyCosts, allocationMethod, projectStartDate) {
    const allocations = {};
    
    // Find active barns for this month
    const activeBarnData = barnProductions.map(bp => ({
        barnId: bp.barnId,
        biomass: calculateMonthlyBiomass(bp, monthIndex, projectStartDate),
        population: bp.population,
    })).filter(b => b.biomass > 0);
    
    if (activeBarnData.length === 0) {
        return allocations; // No active barns
    }
    
    // Calculate allocation factors
    let totalFactor = 0;
    const factors = {};
    
    activeBarnData.forEach(barn => {
        if (allocationMethod === 'perCapita') {
            factors[barn.barnId] = barn.population;
            totalFactor += barn.population;
        } else if (allocationMethod === 'equalSplit') {
            factors[barn.barnId] = 1;
            totalFactor += 1;
        } else { // biomass (default)
            factors[barn.barnId] = barn.biomass;
            totalFactor += barn.biomass;
        }
    });
    
    // Allocate costs
    activeBarnData.forEach(barn => {
        const factor = factors[barn.barnId] / totalFactor;
        allocations[barn.barnId] = {
            ahp: monthlyCosts.ahp * factor,
            labor: monthlyCosts.labor * factor,
            overhead: monthlyCosts.overhead * factor,
            utilities: monthlyCosts.utilities * factor,
        };
    });
    
    return allocations;
}

/**
 * Calculate total costs for a barn over its entire fattening period
 * @param {Object} barnProduction - Production metrics
 * @param {Array} monthlyAllocations - Array of monthly cost allocations
 * @param {Object} farmParams - Farm parameters (feedPrice, etc.)
 * @param {Object} costParams - Cost escalation parameters
 * @param {string} projectStartDate - Project start date
 * @returns {Object} Total costs breakdown
 */
export function calculateBarnTotalCosts(barnProduction, monthlyAllocations, farmParams, costParams, projectStartDate) {
    // Variable costs
    const pigletCost = barnProduction.population * barnProduction.effectiveParams.pigletPrice;
    
    // Feed cost (with escalation based on pig-in month)
    const pigInDate = new Date(barnProduction.pigInDate);
    const startDate = new Date(projectStartDate);
    const monthsSinceStart = Math.floor((pigInDate - startDate) / (1000 * 60 * 60 * 24 * 30));
    const yearIndex = Math.floor(monthsSinceStart / 12);
    const feedPrice = farmParams.feedPrice * Math.pow(1 + (costParams.feedEscalation || 0), yearIndex);
    const feedCost = barnProduction.feedConsumed * feedPrice;
    
    // Accumulate monthly fixed cost allocations
    let totalAHP = 0;
    let totalLabor = 0;
    let totalOverhead = 0;
    let totalUtilities = 0;
    
    monthlyAllocations.forEach(allocation => {
        if (allocation) {
            totalAHP += allocation.ahp || 0;
            totalLabor += allocation.labor || 0;
            totalOverhead += allocation.overhead || 0;
            totalUtilities += allocation.utilities || 0;
        }
    });
    
    const totalCost = pigletCost + feedCost + totalAHP + totalLabor + totalOverhead + totalUtilities;
    
    return {
        pigletCost,
        feedCost,
        ahpCost: totalAHP,
        laborCost: totalLabor,
        overheadCost: totalOverhead,
        utilitiesCost: totalUtilities,
        totalCost,
        // Per-pig metrics
        costPerPig: barnProduction.pigsSurvived > 0 ? totalCost / barnProduction.pigsSurvived : 0,
        // Per-kg metrics
        costPerKg: barnProduction.totalKgProduced > 0 ? totalCost / barnProduction.totalKgProduced : 0,
        pigletCostPerKg: barnProduction.totalKgProduced > 0 ? pigletCost / barnProduction.totalKgProduced : 0,
        feedCostPerKg: barnProduction.totalKgProduced > 0 ? feedCost / barnProduction.totalKgProduced : 0,
        fixedCostPerKg: barnProduction.totalKgProduced > 0 ? 
            (totalAHP + totalLabor + totalOverhead + totalUtilities) / barnProduction.totalKgProduced : 0,
    };
}

/**
 * Calculate revenue for a barn using exit points
 * @param {Object} barnProduction - Production metrics with exitDetails
 * @param {number} fallbackPricePerKg - Fallback selling price per kg (if no exit points)
 * @returns {Object} Revenue breakdown
 */
export function calculateBarnRevenue(barnProduction, fallbackPricePerKg) {
    let totalRevenue = 0;
    
    // Calculate revenue from each exit point
    if (barnProduction.exitDetails && barnProduction.exitDetails.length > 0) {
        barnProduction.exitDetails.forEach(exit => {
            const exitRevenue = exit.totalWeight * exit.pricePerKg;
            totalRevenue += exitRevenue;
        });
    } else {
        // Fallback: use total kg produced with fallback price
        totalRevenue = barnProduction.totalKgProduced * fallbackPricePerKg;
    }
    
    const revenuePerPig = barnProduction.pigsSurvived > 0 ? totalRevenue / barnProduction.pigsSurvived : 0;
    
    // Calculate weighted average price per kg
    const revenuePerKg = barnProduction.totalKgProduced > 0 ? totalRevenue / barnProduction.totalKgProduced : fallbackPricePerKg;
    
    return {
        totalRevenue,
        revenuePerPig,
        revenuePerKg,
        exitDetails: barnProduction.exitDetails,
    };
}

/**
 * Main calculation function for barn-based fattening mode
 * @param {Array} barns - Array of barn configurations
 * @param {Object} farmParams - Farm-level parameters
 * @param {Object} costParams - Cost parameters with escalation
 * @param {number} projectMonths - Total project duration in months
 * @param {string} projectStartDate - Project start date
 * @param {string} allocationMethod - Cost allocation method
 * @returns {Object} Complete barn-based calculation results
 */
export function calculateFatteningBarnMode(barns, farmParams, costParams, projectMonths, projectStartDate, allocationMethod = 'biomass') {
    if (!barns || barns.length === 0) {
        return null; // No barns configured
    }
    
    // Step 1: Calculate production metrics for each barn
    const barnProductions = barns.map(barn => calculateBarnProduction(barn, farmParams));
    
    // Step 2: Calculate monthly cost allocations
    const monthlyAllocationsPerBarn = {};
    barnProductions.forEach(bp => {
        monthlyAllocationsPerBarn[bp.barnId] = [];
    });
    
    for (let monthIndex = 0; monthIndex < projectMonths; monthIndex++) {
        const yearIndex = Math.floor(monthIndex / 12);
        
        // Monthly costs with escalation
        const monthlyCosts = {
            ahp: (costParams.ahpPerMonth || 0) * Math.pow(1 + (costParams.ahpEscalation || 0), yearIndex),
            labor: (costParams.laborPerMonth || 0) * Math.pow(1 + (costParams.laborEscalation || 0), yearIndex),
            overhead: (costParams.overheadPerMonth || 0) * Math.pow(1 + (costParams.overheadEscalation || 0), yearIndex),
            utilities: (costParams.utilitiesPerMonth || 0) * Math.pow(1 + (costParams.utilitiesEscalation || 0), yearIndex),
        };
        
        const allocations = allocateMonthlyFixedCosts(barnProductions, monthIndex, monthlyCosts, allocationMethod, projectStartDate);
        
        // Store allocations for each barn
        barnProductions.forEach(bp => {
            monthlyAllocationsPerBarn[bp.barnId].push(allocations[bp.barnId] || null);
        });
    }
    
    // Step 3: Calculate total costs for each barn
    const barnCosts = barnProductions.map(bp => 
        calculateBarnTotalCosts(bp, monthlyAllocationsPerBarn[bp.barnId], farmParams, costParams, projectStartDate)
    );
    
    // Step 4: Calculate revenue for each barn
    const barnRevenues = barnProductions.map(bp => 
        calculateBarnRevenue(bp, farmParams.finisherPrice || 45000)
    );
    
    // Step 5: Combine results
    const barnResults = barnProductions.map((bp, idx) => ({
        ...bp,
        costs: barnCosts[idx],
        revenue: barnRevenues[idx],
        grossProfit: barnRevenues[idx].totalRevenue - barnCosts[idx].totalCost,
        profitPerPig: barnRevenues[idx].revenuePerPig - barnCosts[idx].costPerPig,
        profitPerKg: barnRevenues[idx].revenuePerKg - barnCosts[idx].costPerKg,
    }));
    
    // Step 6: Generate monthly cash flow rollup
    const monthlyCashFlow = [];
    for (let monthIndex = 0; monthIndex < projectMonths; monthIndex++) {
        const monthDate = new Date(projectStartDate);
        monthDate.setMonth(monthDate.getMonth() + monthIndex);
        const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        let monthTotalCosts = 0;
        let monthTotalRevenue = 0;
        let monthWeanerCost = 0;
        let monthFeedCost = 0;
        let monthAhpCost = 0;
        let monthLaborCost = 0;
        let monthOverheadCost = 0;
        let monthUtilitiesCost = 0;
        
        const barnCostsThisMonth = {};
        const barnRevenuesThisMonth = {};
        
        barnResults.forEach(br => {
            // Check if barn has costs this month (active)
            const allocation = monthlyAllocationsPerBarn[br.barnId][monthIndex];
            if (allocation) {
                const monthlyCost = (allocation.ahp + allocation.labor + allocation.overhead + allocation.utilities) / 1000000;
                barnCostsThisMonth[br.barnId] = monthlyCost;
                monthTotalCosts += monthlyCost;
                
                // Accumulate cost breakdown
                monthAhpCost += allocation.ahp / 1000000;
                monthLaborCost += allocation.labor / 1000000;
                monthOverheadCost += allocation.overhead / 1000000;
                monthUtilitiesCost += allocation.utilities / 1000000;
            }
            
            // Check if barn has revenue this month (pig-out month)
            const pigOutDate = new Date(br.pigOutDate);
            if (pigOutDate.getMonth() === monthDate.getMonth() && 
                pigOutDate.getFullYear() === monthDate.getFullYear()) {
                const revenue = br.revenue.totalRevenue / 1000000;
                barnRevenuesThisMonth[br.barnId] = revenue;
                monthTotalRevenue += revenue;
            }
            
            // Check if barn has pig-in this month (weaner + feed costs)
            const pigInDate = new Date(br.pigInDate);
            if (pigInDate.getMonth() === monthDate.getMonth() && 
                pigInDate.getFullYear() === monthDate.getFullYear()) {
                monthWeanerCost += br.costs.pigletCost / 1000000;
                monthFeedCost += br.costs.feedCost / 1000000;
                monthTotalCosts += (br.costs.pigletCost + br.costs.feedCost) / 1000000;
            }
        });
        
        monthlyCashFlow.push({
            month: monthIndex + 1,
            monthLabel,
            barnCosts: barnCostsThisMonth,
            barnRevenues: barnRevenuesThisMonth,
            totalCosts: monthTotalCosts,
            totalRevenue: monthTotalRevenue,
            netCashFlow: monthTotalRevenue - monthTotalCosts,
            // Add cost breakdown for financial table
            costBreakdown: {
                weaner: monthWeanerCost,
                feed: monthFeedCost,
                ahp: monthAhpCost,
                labor: monthLaborCost,
                overhead: monthOverheadCost,
                utilities: monthUtilitiesCost,
            },
        });
    }
    
    return {
        barnResults,
        monthlyCashFlow,
        summary: {
            totalBarns: barns.length,
            totalPopulation: barns.reduce((sum, b) => sum + b.population, 0),
            totalRevenue: barnResults.reduce((sum, br) => sum + br.revenue.totalRevenue, 0),
            totalCosts: barnResults.reduce((sum, br) => sum + br.costs.totalCost, 0),
            totalProfit: barnResults.reduce((sum, br) => sum + br.grossProfit, 0),
        },
    };
}

/**
 * Calculate financial cash flow based on all cohorts from Production Schedule
 * @param {Array} cohorts - All cohorts from generateFutureCohorts
 * @param {Object} farmParams - Farm-level parameters
 * @param {Object} costParams - Cost parameters with escalation
 * @param {number} projectMonths - Total project duration in months
 * @param {string} projectStartDate - Project start date
 * @returns {Object} Monthly cash flow with revenue and cost breakdown
 */
export function calculateCohortBasedCashFlow(cohorts, farmParams, costParams, projectMonths, projectStartDate) {
    if (!cohorts || cohorts.length === 0) {
        return null;
    }
    
    const monthlyCashFlow = [];
    
    for (let monthIndex = 0; monthIndex < projectMonths; monthIndex++) {
        const monthDate = new Date(projectStartDate);
        monthDate.setMonth(monthDate.getMonth() + monthIndex);
        const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const yearIndex = Math.floor(monthIndex / 12);
        
        let monthTotalCosts = 0;
        let monthTotalRevenue = 0;
        let monthWeanerCost = 0;
        let monthFeedCost = 0;
        let monthAhpCost = 0;
        let monthLaborCost = 0;
        let monthOverheadCost = 0;
        let monthUtilitiesCost = 0;
        
        // Monthly costs with escalation
        const monthlyCosts = {
            ahp: (costParams.ahpPerMonth || 0) * Math.pow(1 + (costParams.ahpEscalation || 0), yearIndex),
            labor: (costParams.laborPerMonth || 0) * Math.pow(1 + (costParams.laborEscalation || 0), yearIndex),
            overhead: (costParams.overheadPerMonth || 0) * Math.pow(1 + (costParams.overheadEscalation || 0), yearIndex),
            utilities: (costParams.utilitiesPerMonth || 0) * Math.pow(1 + (costParams.utilitiesEscalation || 0), yearIndex),
        };
        
        // Count active cohorts this month (between pig-in and pig-out)
        const activeCohorts = cohorts.filter(cohort => {
            const pigInDate = new Date(cohort.pigInDate);
            const pigOutDate = new Date(cohort.pigOutDate);
            return monthDate >= pigInDate && monthDate <= pigOutDate;
        });
        
        // Allocate monthly fixed costs across active cohorts
        if (activeCohorts.length > 0) {
            const costPerCohort = {
                ahp: monthlyCosts.ahp / activeCohorts.length,
                labor: monthlyCosts.labor / activeCohorts.length,
                overhead: monthlyCosts.overhead / activeCohorts.length,
                utilities: monthlyCosts.utilities / activeCohorts.length,
            };
            
            monthAhpCost = (costPerCohort.ahp * activeCohorts.length) / 1000000;
            monthLaborCost = (costPerCohort.labor * activeCohorts.length) / 1000000;
            monthOverheadCost = (costPerCohort.overhead * activeCohorts.length) / 1000000;
            monthUtilitiesCost = (costPerCohort.utilities * activeCohorts.length) / 1000000;
            monthTotalCosts += (monthAhpCost + monthLaborCost + monthOverheadCost + monthUtilitiesCost);
        }
        
        // Check each cohort for pig-in (weaner + feed costs) and pig-out (revenue)
        cohorts.forEach(cohort => {
            const pigInDate = new Date(cohort.pigInDate);
            const pigOutDate = new Date(cohort.pigOutDate);
            
            // Pig-in this month: add weaner and feed costs
            if (pigInDate.getMonth() === monthDate.getMonth() && 
                pigInDate.getFullYear() === monthDate.getFullYear()) {
                
                // Calculate weaner cost
                const weanerPrice = farmParams.weanerPrice || 650000;
                const weanerCost = cohort.population * weanerPrice;
                
                // Calculate feed cost
                const fcr = cohort.effectiveParams?.fcr || farmParams.fcr || 2.8;
                const totalGain = cohort.totalKgProduced || 0;
                const feedRequired = totalGain * fcr;
                const feedPricePerKg = costParams.feedPrice || 6500;
                const feedCost = feedRequired * feedPricePerKg;
                
                monthWeanerCost += weanerCost / 1000000;
                monthFeedCost += feedCost / 1000000;
                monthTotalCosts += (weanerCost + feedCost) / 1000000;
            }
            
            // Pig-out this month: add revenue
            if (pigOutDate.getMonth() === monthDate.getMonth() && 
                pigOutDate.getFullYear() === monthDate.getFullYear()) {
                
                const finisherPrice = farmParams.finisherPrice || 45000;
                const totalKg = cohort.totalKgProduced || 0;
                const revenue = totalKg * finisherPrice;
                
                monthTotalRevenue += revenue / 1000000;
            }
        });
        
        monthlyCashFlow.push({
            month: monthIndex + 1,
            monthLabel,
            totalCosts: monthTotalCosts,
            totalRevenue: monthTotalRevenue,
            netCashFlow: monthTotalRevenue - monthTotalCosts,
            costBreakdown: {
                weaner: monthWeanerCost,
                feed: monthFeedCost,
                ahp: monthAhpCost,
                labor: monthLaborCost,
                overhead: monthOverheadCost,
                utilities: monthUtilitiesCost,
            },
        });
    }
    
    // Calculate summary
    const totalRevenue = monthlyCashFlow.reduce((sum, m) => sum + m.totalRevenue, 0) * 1000000;
    const totalCosts = monthlyCashFlow.reduce((sum, m) => sum + m.totalCosts, 0) * 1000000;
    
    return {
        monthlyCashFlow,
        summary: {
            totalCohorts: cohorts.length,
            totalRevenue,
            totalCosts,
            totalProfit: totalRevenue - totalCosts,
        },
    };
}
