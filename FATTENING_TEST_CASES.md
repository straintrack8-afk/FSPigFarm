# Fattening Mode - Test Cases

## Test Case 1: Basic Single Exit Point 

### Parameters:
- **Monthly Piglet Purchase**: 100 head
- **Weaner Purchase Price**: 1,200,000 IDR
- **Weaner Purchase Weight**: 7 kg
- **Target Weight**: 100 kg
- **ADG**: 0.75 kg/day
- **FCR**: 2.4
- **Mortality**: 4% (0.04)
- **Feed Price**: 8,000 IDR/kg
- **Project Duration**: 12 months (1 year)

### Exit Point:
- **Exit 1**: 100% at 100kg, 45,000 IDR/kg

### Expected Calculations (Month 1):

#### **Pigs Flow:**
- Pigs In: 100
- After Mortality: 100 × (1 - 0.04) = 96 head

#### **Growth:**
- Weight Gain: 100 - 7 = 93 kg
- Days in Fattening: 93 / 0.75 = 124 days (~4.1 months)
- Feed per Pig: 93 × 2.4 = 223.2 kg

#### **Costs (Million IDR):**
- Weaner Cost: 100 × 1,200,000 / 1,000 = **120.0 M**
- Feed Cost: 96 × 223.2 × 8,000 / 1,000,000 = **171.6 M**
- AHP Cost: 5,000,000 / 1,000 = **5.0 M**
- Labor Cost: 10,000,000 / 1,000 = **10.0 M**
- Overhead Cost: 8,000,000 / 1,000 = **8.0 M**
- Utilities Cost: 3,000,000 / 1,000 = **3.0 M**
- **Total Cost: 317.6 M**

#### **Revenue:**
- Total Weight: 96 × 100 = 9,600 kg
- Revenue: 9,600 × 45,000 / 1,000,000 = **432.0 M**

#### **Profit:**
- Net Profit: 432.0 - 317.6 = **114.4 M**

---

## Test Case 2: Multi-Exit Strategy (3 Exit Points) 

### Parameters:
Same as Test Case 1, but with multiple exit points

### Exit Points:
- **Exit 1**: 30% at 80kg, 42,000 IDR/kg (early exit)
- **Exit 2**: 50% at 100kg, 45,000 IDR/kg (standard)
- **Exit 3**: 20% at 120kg, 47,000 IDR/kg (premium)

### Expected Calculations (Month 1):

#### **Pigs After Mortality:** 96 head

#### **Exit 1 (30% at 80kg):**
- Pigs: 96 × 0.30 = 28.8 → 29 head
- Weight Gain: 80 - 7 = 73 kg
- Days: 73 / 0.75 = 97.3 days
- Feed per Pig: 73 × 2.4 = 175.2 kg
- Feed Cost: 29 × 175.2 × 8,000 / 1,000,000 = **40.7 M**
- Total Weight: 29 × 80 = 2,320 kg
- Revenue: 2,320 × 42,000 / 1,000,000 = **97.4 M**

#### **Exit 2 (50% at 100kg):**
- Pigs: 96 × 0.50 = 48 head
- Weight Gain: 100 - 7 = 93 kg
- Days: 93 / 0.75 = 124 days
- Feed per Pig: 93 × 2.4 = 223.2 kg
- Feed Cost: 48 × 223.2 × 8,000 / 1,000,000 = **85.8 M**
- Total Weight: 48 × 100 = 4,800 kg
- Revenue: 4,800 × 45,000 / 1,000,000 = **216.0 M**

#### **Exit 3 (20% at 120kg):**
- Pigs: 96 × 0.20 = 19.2 → 19 head
- Weight Gain: 120 - 7 = 113 kg
- Days: 113 / 0.75 = 150.7 days
- Feed per Pig: 113 × 2.4 = 271.2 kg
- Feed Cost: 19 × 271.2 × 8,000 / 1,000,000 = **41.2 M**
- Total Weight: 19 × 120 = 2,280 kg
- Revenue: 2,280 × 47,000 / 1,000,000 = **107.2 M**

#### **Total (All Exits):**
- Total Feed Cost: 40.7 + 85.8 + 41.2 = **167.7 M**
- Total Revenue: 97.4 + 216.0 + 107.2 = **420.6 M**
- Total Cost: 120.0 + 167.7 + 5.0 + 10.0 + 8.0 + 3.0 = **313.7 M**
- Net Profit: 420.6 - 313.7 = **106.9 M**

---

## Test Case 3: Edge Case - Zero Purchase 

### Parameters:
- **Monthly Piglet Purchase**: 0 head
- All other parameters same as Test Case 1

### Expected Result:
- Pigs In: 0
- After Mortality: 0
- All costs except fixed costs: 0
- Fixed costs still apply: AHP + Labor + Overhead + Utilities = 26.0 M
- Revenue: 0
- Net Profit: -26.0 M (loss from fixed costs)

---

## Test Case 4: High Mortality (20%) 

### Parameters:
- **Monthly Piglet Purchase**: 100 head
- **Mortality**: 20% (0.20)
- All other parameters same as Test Case 1

### Expected Calculations:
- Pigs In: 100
- After Mortality: 100 × (1 - 0.20) = 80 head
- Feed Cost: 80 × 223.2 × 8,000 / 1,000,000 = **143.0 M**
- Revenue: 80 × 100 × 45,000 / 1,000,000 = **360.0 M**
- Total Cost: 120.0 + 143.0 + 26.0 = **289.0 M**
- Net Profit: 360.0 - 289.0 = **71.0 M**

---

## Test Case 5: Cost Escalation (Year 2) 

### Parameters:
Same as Test Case 1, but checking Month 13 (Year 2)

### Escalation Rates:
- Feed Escalation: 5% per year
- Weaner Escalation: 3% per year
- Fixed Costs Escalation: 4% per year

### Expected Calculations (Month 13):
- Year Index: 1 (second year)
- Feed Price: 8,000 × 1.05 = **8,400 IDR/kg**
- Weaner Price: 1,200,000 × 1.03 = **1,236,000 IDR**
- Feed Cost: 96 × 223.2 × 8,400 / 1,000,000 = **180.2 M**
- Weaner Cost: 100 × 1,236,000 / 1,000 = **123.6 M**
- AHP: 5.0 × 1.04 = **5.2 M**
- Labor: 10.0 × 1.04 = **10.4 M**
- Overhead: 8.0 × 1.04 = **8.3 M**
- Utilities: 3.0 × 1.04 = **3.1 M**

---

## Test Case 6: Extreme ADG Values 

### Test 6A: Very High ADG (1.0 kg/day)
- Days to 100kg: (100-7) / 1.0 = 93 days (~3.1 months)
- Feed per Pig: 93 × 2.4 = 223.2 kg (same, only time changes)

### Test 6B: Very Low ADG (0.5 kg/day)
- Days to 100kg: (100-7) / 0.5 = 186 days (~6.2 months)
- Feed per Pig: 93 × 2.4 = 223.2 kg (same, only time changes)

**Note**: ADG affects timing but not total feed consumed (FCR determines that)

---

## Test Case 7: Different FCR Values 

### Test 7A: Excellent FCR (2.0)
- Feed per Pig: 93 × 2.0 = 186 kg
- Feed Cost: 96 × 186 × 8,000 / 1,000,000 = **143.0 M**

### Test 7B: Poor FCR (3.0)
- Feed per Pig: 93 × 3.0 = 279 kg
- Feed Cost: 96 × 279 × 8,000 / 1,000,000 = **214.3 M**

---

## UI/UX Test Checklist 

### Setup Tab:
- [ ] All input fields accept valid numbers
- [ ] Mortality displays as percentage (multiply by 100)
- [ ] Exit points can be added/deleted
- [ ] Exit point percentages can be edited
- [ ] Exit point active toggle works
- [ ] Total percentage validation (should warn if ≠ 100%)

### Production Tab:
- [ ] Table shows monthly data correctly
- [ ] Pigs In, After Mortality columns accurate
- [ ] Exit details displayed properly
- [ ] Year filter works
- [ ] Summary boxes show correct totals

### Financial Tab:
- [ ] Revenue breakdown visible
- [ ] Cost breakdown visible (Weaner, Feed, AHP, Labor, Overhead, Utilities)
- [ ] Net profit calculated correctly
- [ ] Year filter works
- [ ] Summary boxes accurate
- [ ] Year-end summary rows appear

### Print/PDF:
- [ ] Title appears: "Pig Farm Calculator - Production & Financial Report"
- [ ] No blank first page
- [ ] Summary boxes visible
- [ ] Tables formatted properly
- [ ] Summary rows have gray background with black text
- [ ] Landscape A4 format

---

## Known Issues / Notes 

1. **Rounding**: Pig counts are rounded, may cause slight discrepancies in percentage distribution
2. **Exit Month**: Currently not used in calculation (all sales assumed in same month as purchase)
3. **Timing**: Calculation assumes instant growth and sale (no time lag modeling)
4. **Inventory**: No active inventory tracking (simplified monthly batch model)

---

**Test Status**: Ready for Manual Testing
**Date**: February 16, 2026
**Tester**: Ready to verify with actual app
