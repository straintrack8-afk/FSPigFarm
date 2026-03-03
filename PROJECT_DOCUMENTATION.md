# Pig Farm Calculator - Project Documentation

## 📋 Overview

**Pig Farm Calculator** adalah aplikasi web komprehensif untuk perencanaan dan analisis finansial farm babi. Aplikasi ini mendukung 3 mode operasi yang berbeda dengan fitur proyeksi timeline, analisis biaya-manfaat, dan reporting yang detail.

## 🎯 Core Features

### 1. **Three Farm Operation Modes**

#### **Breeding Mode** 🐖
- Fokus pada produksi piglet (weaner)
- Manajemen sow population dengan cohort system
- Biological cycle tracking (mating, gestation, lactation, weaning)
- Year 1 vs Year 2+ performance parameters
- PSY (Pigs per Sow per Year) calculation
- Gilt purchase cost management (optional)
- Culled sow revenue tracking

#### **Fattening Mode** 
- Fokus pada pembesaran piglet menjadi finisher
- Multi-exit strategy (berbagai target berat jual)
- Monthly piglet purchase planning
- ADG (Average Daily Gain) tracking
- FCR (Feed Conversion Ratio) optimization
- Mortality rate management

#### **Integrated Mode** 🏭
- Kombinasi Breeding + Nursery + Fattening
- Cohort-based gilt entry system (manual & auto-generated)
- Flexible allocation: Nursery vs Fattening
- Multi-exit points untuk nursery dan fattening
- Comprehensive cost tracking across all stages
- Dynamic capacity management

### 2. **Financial Analysis**

#### **Revenue Streams**
- **Breeding**: Weaner sales + Culled sow sales
- **Fattening**: Finisher sales (multiple weight targets)
- **Integrated**: Nursery sales + Fattening sales + Culled sow sales

#### **Cost Breakdown**
- **Gilt Purchase Cost** (conditional, with lead time)
- **Feed Cost** (Breeding/Nursery/Fattening with escalation)
- **AHP Cost** (Animal Health Products)
- **Labor Cost**
- **Overhead Cost**
- **Utility Cost**

#### **Annual Cost Escalation**
- Escalation based on calendar year (not animal age)
- Separate escalation rates for feed and fixed costs
- Automatic application across all cost categories

### 3. **Production Timeline**

#### **Production Schedule Table**
- Monthly headcount tracking
- Sow population dynamics (Active, Gilts Arrival, Production, Culled)
- Production events (Mating, Farrowing, Weaning)
- Net change tracking
- Year-end summary rows

#### **Key Metrics**
- Total Piglets Weaned
- Total Culled Sows
- PSY (Pigs per Sow per Year) - annualized
- Average Active Sows

### 4. **Financial Timeline**

#### **Financial Cash Flow Table**
- **Breeding/Fattening Mode**:
  - Revenue breakdown: Weaner + Cull Sow
  - Cost breakdown: Gilt + Feed + AHP + Labor + Overhead + Utility
  
- **Integrated Mode**:
  - Revenue breakdown: Nursery + Fattening + Cull Sow
  - Cost breakdown: Gilt + Feed + AHP + Labor + Overhead + Utility
  
- Monthly net profit calculation
- Year-end summary rows with totals

### 5. **Professional Print/PDF Export**

#### **Print Styling**
- Clean, professional layout for PDF export
- Landscape A4 format with optimized margins
- Automatic hiding of UI elements (buttons, filters, navigation)
- Print-only title: "Pig Farm Calculator - Production & Financial Report"

#### **Print Content**
- Summary boxes with key metrics
- Full production/financial tables
- Year summary rows with gray background
- Black text for readability (no white text)
- Optimized table breaking for multi-page reports

### 6. **Year Filtering**

- Filter by specific year or "All Years"
- Applies to both Production and Financial tabs
- Dynamic summary calculation based on filtered data
- Year-end totals automatically calculated

## 🏗️ Technical Architecture

### **Frontend Stack**
- **React** (Functional Components with Hooks)
- **TailwindCSS** for styling
- **Lucide Icons** for UI elements

### **State Management**
- React useState for local state
- useMemo for performance optimization
- Complex calculation functions for timeline projection

### **Key Components**

1. **PigFarmCalculator** (Main Component)
   - Mode selection and routing
   - State management for all parameters
   - Projection calculation orchestration

2. **BreedingSetup**
   - Year 1 vs Year 2+ parameters
   - Biological cycle configuration
   - PSY preview calculation

3. **FatteningSetup**
   - Multi-exit strategy configuration
   - Purchase and growth parameters

4. **IntegratedSetup**
   - Cohort management (manual + auto)
   - Allocation configuration
   - Multi-stage parameters

5. **CostParametersSection**
   - Unified cost input across all modes
   - Escalation rate configuration

6. **ProductionTimeline**
   - Production schedule table
   - Summary boxes
   - Year filtering

7. **FinancialTimeline**
   - Financial cash flow table
   - Summary boxes
   - Year filtering

## 📊 Calculation Engine

### **Breeding Mode Calculations**
```javascript
calculateBreedingMode(cohorts, params, costParams, months)
- Gilt arrival scheduling
- Mating event generation
- Farrowing calculations (with Y1/Y2+ rates)
- Weaning calculations (with mortality)
- Culling logic (age-based)
- Monthly cost aggregation
- Revenue calculation
```

### **Integrated Mode Calculations**
```javascript
calculateIntegratedMode(cohorts, params, costParams, months, inputs, exitPoints)
- Cohort 0 auto-generation (existing farm)
- Stable-state replacement logic
- Nursery/Fattening allocation
- Multi-exit strategy execution
- Mortality tracking (deaths logged)
- Cost escalation by calendar year
- Revenue from multiple streams
```

### **Cost Escalation Logic**
```javascript
// Calendar year-based escalation
const yearIndex = Math.floor((m - 1) / 12);
const feedEscalationFactor = Math.pow(1 + feedEscalationRate, yearIndex);
const fixedEscalationFactor = Math.pow(1 + fixedEscalationRate, yearIndex);

// Applied to:
- Feed costs (breeding, nursery, fattening)
- Gilt purchase cost
- AHP, Labor, Overhead, Utility costs
```

## 🎨 UI/UX Features

### **Responsive Design**
- Mobile-friendly layout
- Adaptive grid columns
- Sticky table headers and columns
- Horizontal scroll for wide tables

### **Visual Indicators**
- Color-coded metrics (green for revenue, red for costs, blue for profit)
- Gradient backgrounds for summary boxes
- Hover effects on interactive elements
- Zebra striping for table readability

### **User Guidance**
- Placeholder text with examples
- Tooltips and help text
- Clear section headers with emojis
- Logical grouping of related inputs

## 📈 Recent Achievements (Feb 15, 2026)

### ✅ **Print/PDF Styling Refinement**
- Fixed blank first page issue in print preview
- Added print-only title without causing page breaks
- Ensured title appears once at top of content
- Optimized for both Production and Financial pages
- Gray summary rows with black text for print visibility
- Landscape A4 format with proper margins

### ✅ **Financial Cash Flow Table Restructure (Integrated Mode)**
- Removed Sales Volume columns (Nursery, Fattening, Culled Sows)
- Added detailed operational cost breakdown:
  - Gilt Purchase Cost
  - Feed Cost (combined Breeding + Nursery + Fattening)
  - AHP Cost
  - Labor Cost
  - Overhead Cost
  - Utility Cost
- Kept revenue breakdown (Nursery, Fattening, Cull Sow)
- Updated year-end summary rows to match new structure
- Consistent with Breeding mode cost breakdown

### ✅ **Weaner Price Input Standardization**
- **Breeding Mode**: Already using full IDR format
- **Integrated Mode**: Changed from "IDR '000" to full "IDR"
- **Fattening Mode**: Changed from "IDR M" (millions) to full "IDR"
- All modes now use consistent format: "Weaner Price (IDR)"
- Direct input of full amount (e.g., 1200000)
- Added placeholder text for clarity

### ✅ **Code Quality Improvements**
- Consistent naming conventions
- Proper component structure
- Optimized re-renders with useMemo
- Clean separation of concerns

## 🔮 Roadmap for Tomorrow (Feb 16, 2026)

### 1. **Test Fattening Farm** 🧪
- Comprehensive testing of Fattening mode calculations
- Verify multi-exit strategy logic
- Test edge cases and boundary conditions
- Validate financial projections
- Check print/PDF output

### 2. **Multi-Language Support** 🌍
- Implement 3-language system:
  - **Vietnamese** (Tiếng Việt)
  - **English**
  - **Bahasa Indonesia**
- Language selector in UI
- Translation for all labels, headers, and text
- Maintain number formatting per locale
- Persistent language preference

## 📝 Notes

### **Key Design Decisions**
1. **Calendar Year Escalation**: Cost escalation based on calendar year (not animal age) for realistic financial modeling
2. **Cohort System**: Flexible cohort-based tracking for precise population dynamics
3. **Multi-Exit Strategy**: Support for multiple selling points to optimize revenue
4. **Print-First Design**: Professional PDF export as a core feature, not an afterthought
5. **Full IDR Format**: Consistent use of full IDR amounts across all price inputs for clarity

### **Performance Considerations**
- useMemo for expensive calculations
- Efficient array operations
- Minimal re-renders
- Optimized table rendering

### **Future Enhancements**
- Data export (Excel, CSV)
- Scenario comparison
- Sensitivity analysis
- Break-even analysis
- ROI calculator
- Historical data import
- Cloud save/sync

## 🙏 Acknowledgments

Developed with focus on:
- **Accuracy**: Realistic biological and financial modeling
- **Usability**: Intuitive interface for farm managers
- **Flexibility**: Support for different farm types and strategies
- **Professionalism**: Print-ready reports for stakeholders

---

**Version**: 1.0
**Last Updated**: February 15, 2026
**Status**: Active Development
