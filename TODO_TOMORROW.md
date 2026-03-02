# TODO List - February 16, 2026

## 🎯 Priority Tasks

### 1. Test Fattening Farm Mode 🧪

#### **Calculation Testing**
- [ ] Test monthly piglet purchase logic
- [ ] Verify ADG (Average Daily Gain) calculations
- [ ] Validate FCR (Feed Conversion Ratio) application
- [ ] Check mortality rate impact
- [ ] Test multi-exit strategy execution
- [ ] Verify weight progression timeline
- [ ] Validate sales timing for different exit points

#### **Financial Testing**
- [ ] Test weaner purchase cost calculation
- [ ] Verify feed cost accumulation
- [ ] Check fixed costs (AHP, Labor, Overhead, Utility)
- [ ] Validate revenue calculation for each exit point
- [ ] Test net profit calculation
- [ ] Verify cost escalation application
- [ ] Check year-end summary totals

#### **Edge Cases**
- [ ] Test with zero piglet purchase
- [ ] Test with single exit point
- [ ] Test with multiple exit points (3-5 targets)
- [ ] Test with extreme mortality rates (0%, 10%, 20%)
- [ ] Test with very high/low ADG values
- [ ] Test with different project durations (1, 3, 5 years)

#### **UI/UX Testing**
- [ ] Verify all input fields work correctly
- [ ] Test year filtering functionality
- [ ] Check production timeline table display
- [ ] Check financial timeline table display
- [ ] Test print/PDF preview
- [ ] Verify summary boxes show correct data
- [ ] Check responsive layout on different screen sizes

#### **Integration Testing**
- [ ] Test switching between modes (Breeding → Fattening → Integrated)
- [ ] Verify state persistence when switching modes
- [ ] Check that parameters don't leak between modes

---

### 2. Implement Multi-Language Support 🌍

#### **Languages to Support**
1. **Vietnamese** (Tiếng Việt) - Primary
2. **English** - International
3. **Bahasa Indonesia** - Regional

#### **Implementation Steps**

##### **Phase 1: Setup i18n Infrastructure**
- [ ] Install i18n library (e.g., react-i18next)
- [ ] Create language configuration file
- [ ] Setup language detection and persistence (localStorage)
- [ ] Create translation JSON files for each language:
  - `translations/vi.json` (Vietnamese)
  - `translations/en.json` (English)
  - `translations/id.json` (Bahasa Indonesia)

##### **Phase 2: Create Language Selector Component**
- [ ] Design language selector UI (dropdown or flags)
- [ ] Add to header/navigation area
- [ ] Implement language switching logic
- [ ] Add visual indicator for current language
- [ ] Persist language preference

##### **Phase 3: Translation Keys Structure**
```json
{
  "common": {
    "save": "...",
    "cancel": "...",
    "delete": "...",
    "edit": "..."
  },
  "modes": {
    "breeding": "...",
    "fattening": "...",
    "integrated": "..."
  },
  "tabs": {
    "setup": "...",
    "production": "...",
    "financial": "...",
    "scenarios": "..."
  },
  "labels": {
    "weanerPrice": "...",
    "giltPrice": "...",
    "feedCost": "...",
    ...
  },
  "tables": {
    "month": "...",
    "revenue": "...",
    "costs": "...",
    "netProfit": "...",
    ...
  },
  "summaryBoxes": {
    "totalRevenue": "...",
    "totalCosts": "...",
    "netProfit": "...",
    ...
  }
}
```

##### **Phase 4: Translate UI Components**
- [ ] Mode selector labels
- [ ] Tab navigation labels
- [ ] Setup form labels and placeholders
- [ ] Table headers and column names
- [ ] Summary box titles
- [ ] Button labels
- [ ] Help text and tooltips
- [ ] Print title
- [ ] Error messages and validation text

##### **Phase 5: Number and Currency Formatting**
- [ ] Implement locale-specific number formatting
- [ ] Handle currency display (IDR, VND, etc.)
- [ ] Maintain calculation accuracy regardless of display format
- [ ] Test with large numbers (millions, billions)

##### **Phase 6: Testing**
- [ ] Test all 3 languages display correctly
- [ ] Verify no missing translations
- [ ] Check text overflow/truncation issues
- [ ] Test language switching doesn't break state
- [ ] Verify print/PDF works in all languages
- [ ] Test on different browsers
- [ ] Check mobile responsiveness with different languages

#### **Translation Priorities**
1. **High Priority** (Core functionality):
   - Mode names
   - Tab names
   - Input labels
   - Table headers
   - Summary boxes
   - Buttons

2. **Medium Priority** (User guidance):
   - Help text
   - Placeholders
   - Tooltips
   - Error messages

3. **Low Priority** (Nice to have):
   - Documentation
   - Advanced features
   - Scenario names

---

## 📋 Additional Improvements (If Time Permits)

### **Bug Fixes**
- [ ] Review and fix any console errors
- [ ] Check for memory leaks
- [ ] Optimize re-renders

### **Code Quality**
- [ ] Add comments to complex calculation functions
- [ ] Improve variable naming consistency
- [ ] Extract reusable utility functions

### **Documentation**
- [ ] Update inline code comments
- [ ] Document translation key structure
- [ ] Create user guide (if needed)

---

## 🎯 Success Criteria

### **Fattening Farm Testing**
- ✅ All calculations verified and accurate
- ✅ No console errors or warnings
- ✅ Print/PDF output is professional
- ✅ Edge cases handled gracefully

### **Multi-Language Feature**
- ✅ All 3 languages fully implemented
- ✅ Language selector works smoothly
- ✅ No missing translations
- ✅ Text displays correctly in all languages
- ✅ Language preference persists across sessions
- ✅ Print/PDF works in all languages

---

## 📝 Notes

- Focus on **quality over speed**
- Test thoroughly before marking as complete
- Document any issues or blockers
- Keep user informed of progress

---

**Prepared**: February 15, 2026, 9:50 PM
**For**: February 16, 2026
**Status**: Ready to Start
