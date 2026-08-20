import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  calculateSalary, 
  DEFAULT_SALARY_INPUTS, 
  type SalaryInputs 
} from '../lib/taxEngine';
import { formatINR, formatCompactINR } from '../lib/formatters';
import { STATE_PT_RULES, PRIMARY_STATE_OPTIONS } from '../lib/statePtRules';
import { encodeInputsToQuery, decodeQueryToInputs } from '../lib/shareUrl';
import { normalizeIndianNumber } from '../lib/documentParser';
import { BreakdownChart } from './BreakdownChart';
import { SalarySlipModal } from './SalarySlipModal';
import { FinancialBlueprint } from './FinancialBlueprint';
import { DocumentImportModal } from './DocumentImportModal';
import { PercentileMeter } from './PercentileMeter';
import { ExitGratuityCalculator } from './ExitGratuityCalculator';
import { Tooltip, TaxGlossary } from './Tooltip';
import { 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  FileText, 
  Zap, 
  Upload, 
  Pencil,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building,
  Coins,
  FileSpreadsheet,
  AlertCircle,
  Printer,
  Sliders,
  Compass,
  TrendingUp,
  BarChart3,
  Calculator
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CTC_PRESETS = [
  { label: '₹3 LPA', value: 300000 },
  { label: '₹6 LPA', value: 600000 },
  { label: '₹10 LPA', value: 1000000 },
  { label: '₹12 LPA', value: 1200000 },
  { label: '₹15 LPA', value: 1500000 },
  { label: '₹20 LPA', value: 2000000 },
  { label: '₹25 LPA', value: 2500000 },
  { label: '₹30 LPA', value: 3000000 },
  { label: '₹50 LPA', value: 5000000 },
  { label: '₹1 Cr', value: 10000000 }
];

interface SalaryCalculatorProps {
  initialCtc?: number;
}

export const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({ initialCtc }) => {
  const [inputs, setInputs] = useState<SalaryInputs>(() => ({
    ...DEFAULT_SALARY_INPUTS,
    annualCtc: initialCtc && initialCtc > 0 ? initialCtc : DEFAULT_SALARY_INPUTS.annualCtc
  }));
  const [experienceYears, setExperienceYears] = useState<number>(4);
  const [selectedRegime, setSelectedRegime] = useState<'NEW' | 'OLD'>('NEW');
  
  // Accordion state for Advanced Settings (Layer 2) - Closed by default
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<'structure' | 'deductions' | 'epf' | 'bonus' | 'exit'>('structure');

  // Output Architecture state (Layer 3) - Horizontal tabs
  const [outputTab, setOutputTab] = useState<'tax-comparison' | 'salary-slip' | 'wealth-blueprint' | 'peer-benchmark'>('tax-comparison');

  // Modal states
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedSlipText, setCopiedSlipText] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [isEditingCtc, setIsEditingCtc] = useState(false);
  const [ctcInputValue, setCtcInputValue] = useState(() => formatINR(inputs.annualCtc).replace('₹', ''));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Payslip customization state
  const [employeeDesignation, setEmployeeDesignation] = useState('Senior Software Engineer');
  const [employerCompanyName, setEmployerCompanyName] = useState('Tech Enterprises India Pvt. Ltd.');

  const resultsRef = useRef<HTMLDivElement>(null);

  // Sync formatted text when inputs.annualCtc changes outside direct typing
  useEffect(() => {
    if (!isEditingCtc) {
      setCtcInputValue(formatINR(inputs.annualCtc).replace('₹', ''));
    }
  }, [inputs.annualCtc, isEditingCtc]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApplyExtractedInputs = (extracted: Partial<SalaryInputs>) => {
    setInputs(prev => ({
      ...prev,
      ...extracted
    }));
    setIsOptimized(false);
    showToast("Payslip data applied to calculator!");
  };

  // Initialize from URL parameters if available on first load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const parsed = decodeQueryToInputs(window.location.search);
        setInputs(parsed);
        if (parsed.experienceYears !== undefined && parsed.experienceYears >= 0) {
          setExperienceYears(parsed.experienceYears);
        }
        if (parsed.preferredRegime) {
          setSelectedRegime(parsed.preferredRegime);
        }
      } catch (err) {
        console.error('Failed to parse URL query:', err);
      }
    }
  }, []);

  // Real-time URL State Sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const query = encodeInputsToQuery(inputs, { exp: experienceYears, regime: selectedRegime });
      const newUrl = `${window.location.pathname}?${query}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [inputs, experienceYears, selectedRegime]);

  // Master calculation
  const analysis = useMemo(() => calculateSalary(inputs), [inputs]);

  // Auto-align selected regime to the better regime when CTC changes drastically
  useEffect(() => {
    if (analysis.betterRegime === 'NEW' || analysis.betterRegime === 'OLD') {
      setSelectedRegime(analysis.betterRegime);
    }
  }, [inputs.annualCtc]);

  const activeRegimeData = selectedRegime === 'NEW' ? analysis.newRegime : analysis.oldRegime;

  const handleCtcChange = (value: number) => {
    const validVal = Math.max(0, value);
    setInputs(prev => ({ ...prev, annualCtc: validVal }));
    setIsOptimized(false);
  };

  const handleCtcInputChange = (val: string) => {
    setCtcInputValue(val);
    const parsed = normalizeIndianNumber(val);
    if (parsed && parsed > 0 && parsed <= 500000000) {
      setInputs(prev => ({ ...prev, annualCtc: parsed }));
      setIsOptimized(false);
    }
  };

  const handleCtcInputBlur = () => {
    setIsEditingCtc(false);
    const parsed = normalizeIndianNumber(ctcInputValue);
    if (parsed && parsed > 0 && parsed <= 500000000) {
      handleCtcChange(parsed);
      setCtcInputValue(formatINR(parsed).replace('₹', ''));
    } else {
      const rawDigits = parseInt(ctcInputValue.replace(/[^\d]/g, ''), 10);
      if (!isNaN(rawDigits) && rawDigits > 0) {
        handleCtcChange(rawDigits);
        setCtcInputValue(formatINR(rawDigits).replace('₹', ''));
      } else {
        setCtcInputValue(formatINR(inputs.annualCtc).replace('₹', ''));
      }
    }
  };

  const handleCalculateClick = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
    showToast(`Calculated: ${formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}/month Take-Home!`);
  };

  // 1-Click Maximize In-Hand Optimizer
  const isAlreadyMaxed = 
    inputs.sec80C_Investments === 150000 &&
    inputs.sec80D_SelfFamily === 25000 &&
    inputs.sec80D_Parents === 50000 &&
    inputs.sec80D_ParentsSenior === true &&
    inputs.sec80CCD1B_NPS === 50000;

  const handleOptimizeTax = () => {
    if (isOptimized || isAlreadyMaxed) {
      setIsOptimized(true);
      return;
    }

    setInputs(prev => ({
      ...prev,
      sec80C_Investments: 150000,
      sec80D_SelfFamily: 25000,
      sec80D_Parents: 50000,
      sec80D_ParentsSenior: true,
      sec80CCD1B_NPS: 50000,
      annualRentPaid: Math.max(prev.annualRentPaid, Math.round(prev.annualCtc * 0.25))
    }));
    setIsOptimized(true);

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }
    showToast("Deductions maxed! Switched Old Regime tax benefits on.");
  };

  const handleShareLink = () => {
    if (typeof window !== 'undefined') {
      const query = encodeInputsToQuery(inputs, { exp: experienceYears, regime: selectedRegime });
      const shareUrl = `${window.location.origin}${window.location.pathname}?${query}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast("Calculation link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopySummary = () => {
    const query = encodeInputsToQuery(inputs, { exp: experienceYears, regime: selectedRegime });
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}?${query}` 
      : 'https://inhander.com';

    const text = `Take-Home Salary Breakdown for ${formatINR(inputs.annualCtc)} CTC:
- In-Hand Monthly (Real Cash): ${formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}/mo
- Guaranteed Base CTC: ${formatINR(analysis.compensationSplit.guaranteedBaseCtc)}
- Yearly Variable Bonus (Post-Tax): ${formatINR(analysis.compensationSplit.yearlyBonusNet)} (Gross: ${formatINR(analysis.compensationSplit.yearlyBonusGross)})
- Annual Paper Stock / ESOPs: ${formatINR(analysis.compensationSplit.annualEsopValue)}
- Income Tax (TDS): ${formatINR(activeRegimeData.totalAnnualTax)} (${selectedRegime} Tax Regime)
- Professional Tax: ${formatINR(analysis.ptAnnual)}/yr (${STATE_PT_RULES[inputs.stateCode]?.name || inputs.stateCode})

Calculated on inHander: ${shareUrl}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    showToast("Summary copied to clipboard!");
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleCopySlipText = () => {
    const summary = `
========================================
SALARY SLIP BREAKDOWN (${selectedRegime} TAX REGIME)
========================================
Designation: ${employeeDesignation}
Company: ${employerCompanyName}
Annual CTC: ${formatINR(analysis.inputs.annualCtc)}

--- EARNINGS (Monthly) ---
Basic Salary: ${formatINR(monthlyBasic)}
House Rent Allowance (HRA): ${formatINR(monthlyHra)}
Special Allowance: ${formatINR(monthlySpecial)}
Gross Monthly Earnings: ${formatINR(totalMonthlyEarnings)}

--- DEDUCTIONS (Monthly) ---
Employee Provident Fund (EPF): ${formatINR(activeRegimeData.monthlyEmployeePf)}
Professional Tax (PT): ${formatINR(activeRegimeData.monthlyPt)}
Income Tax (TDS): ${formatINR(activeRegimeData.monthlyTax)}
${activeRegimeData.monthlyVpf > 0 ? `Voluntary PF (VPF): ${formatINR(activeRegimeData.monthlyVpf)}\n` : ''}Total Monthly Deductions: ${formatINR(totalMonthlyDeductions)}

========================================
NET TAKE-HOME SALARY (Monthly): ${formatINR(activeRegimeData.monthlyTakeHome)}
ANNUAL TAKE-HOME SALARY: ${formatINR(activeRegimeData.annualTakeHome)}
TOTAL ANNUAL INCOME TAX: ${formatINR(activeRegimeData.totalAnnualTax)}
========================================
Generated via In Hand Salary (inHander.com)
`.trim();

    navigator.clipboard.writeText(summary);
    setCopiedSlipText(true);
    showToast("Payslip text copied to clipboard!");
    setTimeout(() => setCopiedSlipText(false), 2500);
  };

  // Count active non-default customizations to show a helpful badge on the accordion
  const customCount = useMemo(() => {
    let count = 0;
    if (inputs.basicPercent !== 50) count++;
    if (inputs.annualRentPaid > 0) count++;
    if (inputs.sec80C_Investments > 0) count++;
    if (inputs.sec80D_SelfFamily > 0 || inputs.sec80D_Parents > 0) count++;
    if (inputs.sec80CCD1B_NPS > 0) count++;
    if (inputs.employerNpsPercent > 0) count++;
    if (inputs.epfCapped) count++;
    if (inputs.variableBonusAnnual > 0 || inputs.rsuVestedAnnual > 0) count++;
    if (!inputs.isMetroCity) count++;
    return count;
  }, [inputs]);

  // Derived inline payslip data
  const monthlyBasic = Math.round(analysis.basicAnnual / 12);
  const monthlyHra = Math.round(analysis.hraAnnual / 12);
  const monthlySpecial = Math.max(0, activeRegimeData.monthlyGross - monthlyBasic - monthlyHra);
  const totalMonthlyEarnings = monthlyBasic + monthlyHra + monthlySpecial;
  const totalMonthlyDeductions = activeRegimeData.monthlyEmployeePf + activeRegimeData.monthlyVpf + activeRegimeData.monthlyPt + activeRegimeData.monthlyTax;

  return (
    <div id="calculator-section" className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-6 relative">
      {/* Lightweight Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#171717] dark:bg-white text-white dark:text-[#171717] rounded-xl shadow-2xl border border-white/10 dark:border-black/10 text-[13px] font-medium justify-center sm:justify-start">
            <Check className="w-4 h-4 text-[#10b981] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAYER 1: THE HERO SECTION (Immediate Answer & Dopamine Hit)               */}
      {/* ========================================================================= */}
      <div className="vessa-card vessa-frame rounded-2xl sm:rounded-3xl overflow-hidden shadow-stacked transition-all">
        {/* Precision Corner Crosshair Nodes */}
        <span className="corner-plus corner-plus--tl" aria-hidden="true">+</span>
        <span className="corner-plus corner-plus--tr" aria-hidden="true">+</span>
        <span className="corner-plus corner-plus--bl" aria-hidden="true">+</span>
        <span className="corner-plus corner-plus--br" aria-hidden="true">+</span>

        {/* Hero Calculation Input & Action Area */}
        <div className="p-4 sm:p-8 lg:p-10 border-b border-dashed border-[#e2e4e9] dark:border-[#262626] bg-gradient-to-b from-[#fafafa]/90 via-white to-white dark:from-[#161616] dark:via-[#121212] dark:to-[#121212]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6 lg:gap-10">
            
            {/* Input Zone */}
            <div className="space-y-2.5 sm:space-y-3 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-[12px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  Annual Cost to Company (CTC)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 shrink-0">
                  Budget 2024
                </span>
              </div>
              
              {/* Typeable & Editable CTC Display with /year */}
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="flex-1 sm:flex-initial inline-flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-[#181818] px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl border-2 border-[#ebebeb] dark:border-[#262626] shadow-sm focus-within:border-[#0070f3] dark:focus-within:border-[#38bdf8] focus-within:ring-4 focus-within:ring-[#0070f3]/15 transition-all group min-w-0">
                  <span className="text-2xl sm:text-4xl lg:text-5xl font-bold font-mono text-[#888888] dark:text-[#737373] select-none shrink-0">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={ctcInputValue}
                    onFocus={() => {
                      setIsEditingCtc(true);
                      setCtcInputValue(inputs.annualCtc.toString());
                    }}
                    onChange={(e) => handleCtcInputChange(e.target.value)}
                    onBlur={handleCtcInputBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                        handleCalculateClick();
                      }
                    }}
                    className="text-2xl sm:text-4xl lg:text-5xl font-bold text-[#171717] dark:text-white font-mono tracking-tight bg-transparent border-0 focus:outline-hidden w-full sm:w-56 lg:w-72 min-w-0"
                    placeholder="e.g. 12,00,000"
                    title="Click to type your exact CTC (e.g. 12,00,000, 15 LPA, or 1.2 Cr)"
                    aria-label="Annual Cost to Company (CTC)"
                  />
                  <Pencil className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#888888] dark:text-[#737373] opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                
                <span className="text-base sm:text-2xl font-mono text-[#888888] dark:text-[#737373] select-none font-medium shrink-0">
                  / yr
                </span>
              </div>
            </div>

            {/* Calculate Button & Primary Action Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto lg:shrink-0">
              {/* Prominent Dopamine "Calculate" Trigger Button */}
              <button
                type="button"
                onClick={handleCalculateClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-[#0070f3] hover:bg-[#0060df] text-white text-[14px] font-bold shadow-[0_4px_14px_rgba(0,112,243,0.39)] hover:shadow-[0_6px_20px_rgba(0,112,243,0.45)] hover:scale-102 active:scale-98 transition-all cursor-pointer touch-manipulation"
              >
                <Calculator className="w-4 h-4" />
                <span>Calculate In-Hand</span>
              </button>

              {/* Quick Actions Strip (Grid on Mobile, Flex on Desktop) */}
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                {/* Upload Payslip */}
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] hover:border-[#0070f3] text-[#171717] dark:text-white text-[12px] sm:text-[13px] font-medium hover:bg-[#fafafa] dark:hover:bg-[#202020] transition-all shadow-2xs cursor-pointer touch-manipulation text-center"
                  title="Upload & Scan Payslip (PDF / PNG / JPG)"
                >
                  <Upload className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#0070f3] dark:text-[#38bdf8] shrink-0" />
                  <span className="truncate">Upload</span>
                </button>

                {/* 1-Click Maximize */}
                <button
                  type="button"
                  onClick={handleOptimizeTax}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] hover:border-[#f9cb28] text-[#171717] dark:text-white text-[12px] sm:text-[13px] font-medium hover:bg-[#fafafa] dark:hover:bg-[#202020] transition-all shadow-2xs cursor-pointer touch-manipulation text-center"
                  title="1-Click Maximize In-Hand Tax Optimizer"
                >
                  <Zap className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#f9cb28] dark:text-[#d97706] shrink-0" />
                  <span className="truncate">{isOptimized ? 'Maxed' : 'Optimize'}</span>
                </button>

                {/* State Location Picker */}
                <div className="inline-flex items-center justify-center gap-1 px-2 sm:px-3 h-10 sm:h-12 rounded-xl sm:rounded-2xl border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[#171717] dark:text-white shadow-2xs hover:border-[#0070f3] transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-[#0070f3] shrink-0" />
                  <select
                    value={inputs.stateCode}
                    onChange={(e) => setInputs(prev => ({ ...prev, stateCode: e.target.value }))}
                    className="bg-transparent text-[12px] font-medium text-[#171717] dark:text-white border-0 focus:outline-hidden cursor-pointer w-full text-center"
                    title="Select work location for professional tax"
                    aria-label="Work State for Professional Tax"
                  >
                    {PRIMARY_STATE_OPTIONS.map(st => (
                      <option key={st.code} value={st.code} className="bg-white dark:bg-[#181818] text-[#171717] dark:text-white">
                        {st.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Range Slider & Quick Preset Chips */}
          <div className="mt-5 sm:mt-6 space-y-3">
            <input
              type="range"
              min={100000}
              max={15000000}
              step={25000}
              value={inputs.annualCtc}
              onChange={(e) => handleCtcChange(Number(e.target.value))}
              className="w-full h-2 bg-[#ebebeb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
            />
            
            {/* Quick Preset Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
              <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase shrink-0 mr-0.5">Presets:</span>
              {CTC_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleCtcChange(preset.value)}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-mono font-medium transition-all shrink-0 cursor-pointer snap-start ${
                    inputs.annualCtc === preset.value
                      ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                      : 'bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] border border-[#ebebeb] dark:border-[#262626] hover:border-[#a1a1a1] dark:hover:border-[#525252] hover:text-[#171717] dark:hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Immediate Result Card (The Dopamine Centerpiece) */}
        <div ref={resultsRef} className="p-4 sm:p-8 lg:p-10 bg-white dark:bg-[#121212]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            
            {/* Left Result Block (7 Cols) */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              
              {/* Regime Toggle Strip & Recommendation (Aligned Side-by-Side) */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {/* Switch Tabs */}
                <div className="inline-flex p-1 rounded-full bg-[#f5f5f5] dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626]">
                  <button
                    onClick={() => setSelectedRegime('NEW')}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer text-center ${
                      selectedRegime === 'NEW'
                        ? 'bg-white dark:bg-[#121212] text-[#171717] dark:text-white shadow-xs font-semibold'
                        : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white'
                    }`}
                  >
                    New Tax Regime
                    {analysis.betterRegime === 'NEW' && (
                      <span className="ml-1 inline-block w-2 h-2 rounded-full bg-[#0070f3]"></span>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedRegime('OLD')}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer text-center ${
                      selectedRegime === 'OLD'
                        ? 'bg-white dark:bg-[#121212] text-[#171717] dark:text-white shadow-xs font-semibold'
                        : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white'
                    }`}
                  >
                    Old Tax Regime
                    {analysis.betterRegime === 'OLD' && (
                      <span className="ml-1 inline-block w-2 h-2 rounded-full bg-[#7928ca]"></span>
                    )}
                  </button>
                </div>

                {/* Savings Pill (Positioned right beside the switch tabs) */}
                {analysis.annualTaxSavings > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/25 text-[#10b981] text-[11px] sm:text-[12px] font-mono font-bold shrink-0">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>+{formatINR(analysis.annualTaxSavings)}/yr in {analysis.betterRegime}</span>
                  </div>
                )}
              </div>

              {/* Big Monthly Credited Amount */}
              <div className="space-y-1">
                <span className="text-[11px] sm:text-[12px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] block font-semibold">
                  Net Monthly In-Hand Salary (Credited to Bank)
                </span>
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  <span className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#10b981] font-mono tracking-tight break-all sm:break-normal">
                    {formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}
                  </span>
                  <span className="text-lg sm:text-2xl font-mono text-[#888888] dark:text-[#737373] font-normal shrink-0">
                    / month
                  </span>
                </div>
                <p className="text-[12px] sm:text-[13px] text-[#4d4d4d] dark:text-[#a1a1a1] pt-0.5">
                  Guaranteed monthly cash transfer under the <strong>{selectedRegime} Tax Regime</strong> (FY 2025-26).
                </p>
              </div>

              {/* 4 Quick Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
                  <span className="text-[9.5px] sm:text-[10px] font-mono text-[#888888] dark:text-[#737373] uppercase block font-semibold truncate">Annual Take-Home</span>
                  <span className="text-[14px] sm:text-[15px] font-bold font-mono text-[#171717] dark:text-white block truncate">
                    {formatINR(activeRegimeData.annualTakeHome)}
                  </span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
                  <span className="text-[9.5px] sm:text-[10px] font-mono text-[#888888] dark:text-[#737373] uppercase block font-semibold truncate">Annual Tax (TDS)</span>
                  <span className="text-[14px] sm:text-[15px] font-bold font-mono text-[#ee0000] block truncate">
                    {formatINR(activeRegimeData.totalAnnualTax)}
                  </span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
                  <span className="text-[9.5px] sm:text-[10px] font-mono text-[#888888] dark:text-[#737373] uppercase block font-semibold truncate">Monthly EPF</span>
                  <span className="text-[14px] sm:text-[15px] font-bold font-mono text-[#0070f3] block truncate">
                    {formatINR(activeRegimeData.monthlyEmployeePf)}
                  </span>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
                  <span className="text-[9.5px] sm:text-[10px] font-mono text-[#888888] dark:text-[#737373] uppercase block font-semibold truncate">Effective Tax</span>
                  <span className="text-[14px] sm:text-[15px] font-bold font-mono text-[#171717] dark:text-white block truncate">
                    {activeRegimeData.effectiveTaxRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right Donut Chart Tile (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-center pt-2 lg:pt-0">
              <BreakdownChart
                grossAnnual={activeRegimeData.grossAnnualSalary}
                takeHomeAnnual={activeRegimeData.annualTakeHome}
                totalTaxAnnual={activeRegimeData.totalAnnualTax}
                epfAnnual={analysis.employeePfAnnual}
                otherDeductionsAnnual={analysis.ptAnnual + (analysis.inputs.includeGratuity ? analysis.gratuityAnnual : 0)}
                regimeName={selectedRegime}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAYER 2: INPUT ARCHITECTURE (ACCORDION FOR GRANULAR ADJUSTMENTS)           */}
      {/* ========================================================================= */}
      <div className="vessa-card rounded-2xl overflow-hidden border border-[#ebebeb] dark:border-[#262626] transition-all">
        {/* Accordion Trigger Header */}
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full p-3.5 sm:p-5 flex items-center justify-between bg-[#fafafa] dark:bg-[#161616] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer text-left select-none touch-manipulation"
          aria-expanded={isAdvancedOpen}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[14px] sm:text-[15px] font-bold text-[#171717] dark:text-white">
                  Advanced Settings
                </span>
                <span className="text-[12px] text-[#888888] dark:text-[#737373] font-normal hidden sm:inline">
                  (Deductions &amp; Allowances)
                </span>
                {customCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-mono font-bold bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/25 shrink-0">
                    {customCount} customized
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-[12px] text-[#888888] dark:text-[#737373] mt-0.5 line-clamp-1 sm:line-clamp-none">
                HRA, 80C/80D, EPF statutory cap, bonuses, and corporate NPS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[11px] sm:text-[12px] font-mono text-[#888888] dark:text-[#737373] hidden sm:inline">
              {isAdvancedOpen ? 'Hide' : 'Expand'}
            </span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
        </button>

        {/* Collapsible Accordion Content */}
        {isAdvancedOpen && (
          <div className="p-4 sm:p-8 border-t border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] space-y-5 sm:space-y-6 animate-in fade-in duration-200">
            
            {/* Category Segmented Controls */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#ebebeb] dark:border-[#262626] scrollbar-none snap-x">
              <button
                type="button"
                onClick={() => setSettingsSubTab('structure')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'structure'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-semibold shadow-xs'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                1. Salary Structure
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('deductions')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'deductions'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-semibold shadow-xs'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                2. Tax Deductions
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('epf')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'epf'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-semibold shadow-xs'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                3. EPF &amp; Gratuity
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('bonus')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'bonus'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-semibold shadow-xs'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                4. Bonus &amp; RSUs
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('exit')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'exit'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-semibold shadow-xs'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                5. Exit &amp; Gratuity
              </button>
            </div>

            {/* SUBTAB 1: SALARY STRUCTURE */}
            {settingsSubTab === 'structure' && (
              <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {/* Basic Salary % */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
                      <label className="font-medium text-[#171717] dark:text-white">Basic Salary (% of CTC)</label>
                      <span className="font-mono font-semibold text-[#171717] dark:text-white">{inputs.basicPercent}% ({formatINR(analysis.basicAnnual)}/yr)</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={70}
                      step={5}
                      value={inputs.basicPercent}
                      onChange={(e) => setInputs(prev => ({ ...prev, basicPercent: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-[#ebebeb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[11px] text-[#888888] dark:text-[#737373]">Standard is 40% to 50% for most Indian companies.</p>
                  </div>

                  {/* State for Professional Tax */}
                  <div className="space-y-2">
                    <label className="font-medium text-[#171717] dark:text-white text-[12px] sm:text-[13px] flex items-center">
                      <span>Work Location (PT)</span>
                      <Tooltip content={TaxGlossary.pt.text} title={TaxGlossary.pt.title} badgeText={TaxGlossary.pt.badge} />
                    </label>
                    <select
                      value={inputs.stateCode}
                      onChange={(e) => setInputs(prev => ({ ...prev, stateCode: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                    >
                      {PRIMARY_STATE_OPTIONS.map(st => (
                        <option key={st.code} value={st.code}>{st.name}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#888888] dark:text-[#737373]">
                      {STATE_PT_RULES[inputs.stateCode]?.monthlyNote || 'Standard PT rules'}
                    </p>
                  </div>

                  {/* City Metro / Non-Metro */}
                  <div className="space-y-2">
                    <label className="font-medium text-[#171717] dark:text-white text-[12px] sm:text-[13px] flex items-center">
                      <span>City Type for HRA</span>
                      <Tooltip content={TaxGlossary.sec1013a.text} title={TaxGlossary.sec1013a.title} badgeText={TaxGlossary.sec1013a.badge} />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, isMetroCity: true, hraPercent: 50 }))}
                        className={`h-10 px-3 rounded-lg text-[12px] sm:text-[13px] font-medium border transition-colors cursor-pointer ${
                          inputs.isMetroCity
                            ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] border-[#171717] dark:border-white'
                            : 'bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] border-[#ebebeb] dark:border-[#262626] hover:bg-[#f5f5f5]'
                        }`}
                      >
                        Metro (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, isMetroCity: false, hraPercent: 40 }))}
                        className={`h-10 px-3 rounded-lg text-[12px] sm:text-[13px] font-medium border transition-colors cursor-pointer ${
                          !inputs.isMetroCity
                            ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] border-[#171717] dark:border-white'
                            : 'bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] border-[#ebebeb] dark:border-[#262626] hover:bg-[#f5f5f5]'
                        }`}
                      >
                        Non-Metro (40%)
                      </button>
                    </div>
                    <p className="text-[11px] text-[#888888] dark:text-[#737373]">Metros: Mumbai, Delhi, Kolkata, Chennai.</p>
                  </div>
                </div>

                {/* Section 80CCD(2) Employer NPS Restructuring */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <ShieldCheck className="w-4 h-4 text-[#10b981] shrink-0" />
                        <span className="text-[12.5px] sm:text-[13px] font-semibold text-[#171717] dark:text-white">
                          Corporate NPS Restructuring (Section 80CCD(2))
                        </span>
                        <Tooltip content={TaxGlossary.sec80ccd2.text} title={TaxGlossary.sec80ccd2.title} badgeText={TaxGlossary.sec80ccd2.badge} />
                        {analysis.npsTaxSavingsAnnual > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20">
                            Saves {formatINR(analysis.npsTaxSavingsAnnual)}/yr
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] sm:text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1]">
                        Employer contribution to NPS is 100% tax-deductible in <strong>both New &amp; Old Regimes</strong>.
                      </p>
                    </div>

                    {/* 0% / 10% / 14% Buttons (Responsive Grid) */}
                    <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                      {[0, 10, 14].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setInputs(prev => ({ ...prev, employerNpsPercent: pct }))}
                          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-mono font-medium transition-all cursor-pointer text-center ${
                            inputs.employerNpsPercent === pct
                              ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                              : 'bg-white dark:bg-[#121212] text-[#4d4d4d] dark:text-[#a1a1a1] border border-[#ebebeb] dark:border-[#262626] hover:text-[#171717] dark:hover:text-white'
                          }`}
                        >
                          {pct === 0 ? '0% (Off)' : `${pct}% Basic`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {inputs.employerNpsPercent > 0 && (
                    <div className="flex justify-between items-center text-[11px] sm:text-[12px] font-mono pt-1 border-t border-[#ebebeb] dark:border-[#262626]">
                      <span className="text-[#888888] dark:text-[#737373]">
                        Annual Employer NPS ({inputs.employerNpsPercent}% of {formatINR(analysis.basicAnnual)} Basic):
                      </span>
                      <span className="text-[#10b981] font-bold">
                        {formatINR(analysis.employerNpsAmount)}/yr
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 2: TAX DEDUCTIONS */}
            {settingsSubTab === 'deductions' && (
              <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {/* Annual Rent Paid (HRA) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
                      <label className="font-medium text-[#171717] dark:text-white flex items-center">
                        <span>Annual Rent Paid (HRA)</span>
                        <Tooltip content={TaxGlossary.sec1013a.text} title={TaxGlossary.sec1013a.title} badgeText={TaxGlossary.sec1013a.badge} />
                      </label>
                      <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.annualRentPaid)}</span>
                    </div>
                    <input
                      type="number"
                      value={inputs.annualRentPaid || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, annualRentPaid: Number(e.target.value) || 0 }))}
                      placeholder="e.g. 240000 (₹20k/mo)"
                      className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                    />
                    <p className="text-[11px] text-[#888888] dark:text-[#737373]">
                      Eligible HRA Exemption: {formatINR(analysis.oldRegime.hraExemption)} in Old Regime.
                    </p>
                  </div>

                  {/* Section 80C Investments */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
                      <label className="font-medium text-[#171717] dark:text-white flex items-center">
                        <span>Section 80C Investments</span>
                        <Tooltip content={TaxGlossary.sec80c.text} title={TaxGlossary.sec80c.title} badgeText={TaxGlossary.sec80c.badge} />
                      </label>
                      <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec80C_Investments)}</span>
                    </div>
                    <input
                      type="number"
                      max={150000}
                      value={inputs.sec80C_Investments || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80C_Investments: Math.min(150000, Number(e.target.value) || 0) }))}
                      placeholder="PPF, ELSS, LIC, Home Principal"
                      className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                    />
                    <p className="text-[11px] text-[#888888] dark:text-[#737373]">
                      Max ₹1.5L (EPF {formatINR(analysis.employeePfAnnual)} is auto-included).
                    </p>
                  </div>

                  {/* Section 80D Health Insurance */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
                      <label className="font-medium text-[#171717] dark:text-white flex items-center">
                        <span>Section 80D (Self &amp; Family)</span>
                        <Tooltip content={TaxGlossary.sec80d.text} title={TaxGlossary.sec80d.title} badgeText={TaxGlossary.sec80d.badge} />
                      </label>
                      <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec80D_SelfFamily)}</span>
                    </div>
                    <input
                      type="number"
                      max={25000}
                      value={inputs.sec80D_SelfFamily || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80D_SelfFamily: Math.min(25000, Number(e.target.value) || 0) }))}
                      placeholder="Max ₹25,000"
                      className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                    />
                    <p className="text-[11px] text-[#888888] dark:text-[#737373]">Mediclaim premiums for self, spouse &amp; kids.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-1">
                  {/* Section 80D Parents */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
                      <label className="font-medium text-[#171717] dark:text-white">Section 80D (Parents)</label>
                      <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec80D_Parents)}</span>
                    </div>
                    <input
                      type="number"
                      max={inputs.sec80D_ParentsSenior ? 50000 : 25000}
                      value={inputs.sec80D_Parents || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80D_Parents: Number(e.target.value) || 0 }))}
                      placeholder="₹25k (₹50k for Senior)"
                      className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                    />
                    <label className="flex items-center gap-2 text-[11.5px] sm:text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={inputs.sec80D_ParentsSenior}
                        onChange={(e) => setInputs(prev => ({ ...prev, sec80D_ParentsSenior: e.target.checked }))}
                        className="rounded text-[#171717]"
                      />
                      <span>Parents are Senior Citizens (&gt; 60 yrs)</span>
                    </label>
                  </div>

                  {/* Section 80CCD(1B) NPS */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
                      <label className="font-medium text-[#171717] dark:text-white">Section 80CCD(1B) Self NPS</label>
                      <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec80CCD1B_NPS)}</span>
                    </div>
                    <input
                      type="number"
                      max={50000}
                      value={inputs.sec80CCD1B_NPS || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80CCD1B_NPS: Math.min(50000, Number(e.target.value) || 0) }))}
                      placeholder="Max ₹50,000"
                      className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                    />
                    <p className="text-[11px] text-[#888888] dark:text-[#737373]">Self voluntary NPS over &amp; above ₹1.5L 80C.</p>
                  </div>

                  {/* Section 24 Home Loan Interest */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
                      <label className="font-medium text-[#171717] dark:text-white">Home Loan Interest (Sec 24)</label>
                      <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec24_HomeLoanInterest)}</span>
                    </div>
                    <input
                      type="number"
                      max={200000}
                      value={inputs.sec24_HomeLoanInterest || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec24_HomeLoanInterest: Math.min(200000, Number(e.target.value) || 0) }))}
                      placeholder="Max ₹2,00,000"
                      className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                    />
                    <p className="text-[11px] text-[#888888] dark:text-[#737373]">Interest on self-occupied home loan.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 3: EPF & GRATUITY */}
            {settingsSubTab === 'epf' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in duration-200">
                {/* EPF Capping */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="font-semibold text-[#171717] dark:text-white text-[12.5px] sm:text-[13px]">EPF Statutory Cap Mode</label>
                      <Tooltip content={TaxGlossary.epfCap.text} title={TaxGlossary.epfCap.title} badgeText={TaxGlossary.epfCap.badge} />
                    </div>
                    <input
                      type="checkbox"
                      checked={inputs.epfCapped}
                      onChange={(e) => setInputs(prev => ({ ...prev, epfCapped: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#171717]"
                    />
                  </div>
                  <p className="text-[11.5px] sm:text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                    {inputs.epfCapped 
                      ? 'Capped at statutory ₹1,800/month (₹21,600/year). Maximizes immediate monthly bank credit.'
                      : '12% of actual basic salary (uncapped). Standard for most tech companies.'}
                  </p>
                  <div className="text-[11.5px] sm:text-[12px] font-mono text-[#171717] dark:text-white font-semibold">
                    Employee PF: {formatINR(analysis.newRegime.monthlyEmployeePf)}/mo
                  </div>
                </div>

                {/* Employer PF inside CTC */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[#171717] dark:text-white text-[12.5px] sm:text-[13px]">Employer PF inside CTC</label>
                    <input
                      type="checkbox"
                      checked={inputs.employerPfInCtc}
                      onChange={(e) => setInputs(prev => ({ ...prev, employerPfInCtc: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#171717]"
                    />
                  </div>
                  <p className="text-[11.5px] sm:text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                    {inputs.employerPfInCtc
                      ? 'Employer 12% contribution is subtracted from CTC to compute gross pay (standard practice).'
                      : 'Employer PF is paid on-top of your stated CTC.'}
                  </p>
                  <div className="text-[11.5px] sm:text-[12px] font-mono text-[#171717] dark:text-white font-semibold">
                    Employer PF: {formatINR(analysis.employerPfAnnual)}/yr
                  </div>
                </div>

                {/* Gratuity */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="font-semibold text-[#171717] dark:text-white text-[12.5px] sm:text-[13px]">Gratuity inside CTC</label>
                      <Tooltip content={TaxGlossary.rule1526.text} title={TaxGlossary.rule1526.title} badgeText={TaxGlossary.rule1526.badge} />
                    </div>
                    <input
                      type="checkbox"
                      checked={inputs.includeGratuity}
                      onChange={(e) => setInputs(prev => ({ ...prev, includeGratuity: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#171717]"
                    />
                  </div>
                  <p className="text-[11.5px] sm:text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                    {inputs.includeGratuity
                      ? 'Company deducts ~4.81% of basic salary as statutory gratuity provision inside CTC.'
                      : 'No gratuity deduction included in CTC.'}
                  </p>
                  <div className="text-[11.5px] sm:text-[12px] font-mono text-[#171717] dark:text-white font-semibold">
                    Gratuity Provision: {formatINR(analysis.gratuityAnnual)}/yr
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 4: BONUS & RSUS */}
            {settingsSubTab === 'bonus' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in duration-200">
                {/* Annual Variable Bonus */}
                <div className="space-y-2">
                  <label className="font-medium text-[#171717] dark:text-white text-[12px] sm:text-[13px] block">Annual Variable Bonus</label>
                  <input
                    type="number"
                    value={inputs.variableBonusAnnual || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, variableBonusAnnual: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 150000"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                  />
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">Performance-linked variable pay paid annually.</p>
                </div>

                {/* Joining / Sign-on Bonus */}
                <div className="space-y-2">
                  <label className="font-medium text-[#171717] dark:text-white text-[12px] sm:text-[13px] block">Joining / Relocation Bonus</label>
                  <input
                    type="number"
                    value={inputs.joiningBonusAnnual || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, joiningBonusAnnual: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 200000"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                  />
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">One-time sign-on bonus subject to slab TDS.</p>
                </div>

                {/* RSU / ESOP Vested */}
                <div className="space-y-2">
                  <label className="font-medium text-[#171717] dark:text-white text-[12px] sm:text-[13px] block">Annual ESOP / Stock Grants</label>
                  <input
                    type="number"
                    value={inputs.rsuVestedAnnual || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, rsuVestedAnnual: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 500000"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                  />
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">Annualized stock grant value.</p>
                </div>
              </div>
            )}

            {/* SUBTAB 5: EXIT & GRATUITY */}
            {settingsSubTab === 'exit' && (
              <div className="animate-in fade-in duration-200">
                <ExitGratuityCalculator
                  monthlyBasicSalary={analysis.basicAnnual / 12}
                  monthlyGrossSalary={analysis.monthlyGross}
                  annualCtc={inputs.annualCtc}
                  isCollapsible={false}
                  defaultOpen={true}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LAYER 3: OUTPUT ARCHITECTURE (HORIZONTAL TABBED NAVIGATION)                */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Horizontal Navigation Tab Bar situated right below primary result */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] shadow-stacked-sm scrollbar-none snap-x">
          <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto">
            {/* Tab 1: Tax Comparison */}
            <button
              type="button"
              onClick={() => setOutputTab('tax-comparison')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
                outputTab === 'tax-comparison'
                  ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                  : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#fafafa] dark:hover:bg-[#1e1e1e] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#0070f3] dark:text-[#38bdf8] shrink-0" />
              <span>Tax Comparison</span>
            </button>

            {/* Tab 2: Salary Slip */}
            <button
              type="button"
              onClick={() => setOutputTab('salary-slip')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
                outputTab === 'salary-slip'
                  ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                  : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#fafafa] dark:hover:bg-[#1e1e1e] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#10b981] shrink-0" />
              <span>Corporate Salary Slip</span>
            </button>

            {/* Tab 3: Wealth Blueprint */}
            <button
              type="button"
              onClick={() => setOutputTab('wealth-blueprint')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
                outputTab === 'wealth-blueprint'
                  ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                  : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#fafafa] dark:hover:bg-[#1e1e1e] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#7928ca] dark:text-[#a855f7] shrink-0" />
              <span>Wealth Blueprint</span>
            </button>

            {/* Tab 4: Peer Benchmark */}
            <button
              type="button"
              onClick={() => setOutputTab('peer-benchmark')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
                outputTab === 'peer-benchmark'
                  ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                  : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#fafafa] dark:hover:bg-[#1e1e1e] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#f5a623] shrink-0" />
              <span>Percentile Rank</span>
            </button>
          </div>

          {/* Quick Share Link Action (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 pr-2 shrink-0">
            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[12px] font-mono text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white cursor-pointer transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* TAB 1 CONTENT: DUAL REGIME TAX COMPARISON & REAL CASH BREAKDOWN */}
        {outputTab === 'tax-comparison' && (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
            {/* Side by Side Dual Regime Matrix */}
            <div className="vessa-card p-4 sm:p-8 rounded-2xl border border-[#ebebeb] dark:border-[#262626] space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#ebebeb] dark:border-[#262626]">
                <div>
                  <h3 className="text-[15.5px] sm:text-[17px] font-bold text-[#171717] dark:text-white">
                    Side-by-Side Dual Tax Regime Matrix
                  </h3>
                  <p className="text-[11.5px] sm:text-[12px] text-[#888888] dark:text-[#737373] font-mono mt-0.5">
                    Budget 2024 revised slabs vs. Old Regime deductions for ₹{formatINR(inputs.annualCtc)} CTC
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[12px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white hover:bg-[#f5f5f5] cursor-pointer transition-all self-start sm:self-center shrink-0"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* New Regime Card */}
                <div className={`p-4 sm:p-6 rounded-2xl border transition-all ${
                  selectedRegime === 'NEW' 
                    ? 'bg-white dark:bg-[#121212] border-[#0070f3] shadow-stacked ring-2 ring-[#0070f3]/25' 
                    : 'bg-[#fafafa]/80 dark:bg-[#161616]/80 border-[#ebebeb] dark:border-[#262626]'
                }`}>
                  <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#ebebeb] dark:border-[#262626]">
                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h4 className="text-[14.5px] sm:text-[15px] font-bold text-[#171717] dark:text-white">New Tax Regime</h4>
                        <span className="px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold bg-[#0070f3]/10 text-[#0070f3]">FY 25-26</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373]">Flat slabs + ₹75k standard deduction</span>
                    </div>
                    {analysis.betterRegime === 'NEW' && (
                      <span className="px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-mono font-bold bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/20 shrink-0">
                        Recommended
                      </span>
                    )}
                  </div>

                  <div className="mt-3.5 space-y-2.5 text-[12px] sm:text-[13px]">
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                      <span>Gross Annual Salary</span>
                      <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(analysis.newRegime.grossAnnualSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                      <span className="flex items-center">
                        Standard Deduction
                        <Tooltip content={TaxGlossary.standardDeduction.text} title={TaxGlossary.standardDeduction.title} badgeText={TaxGlossary.standardDeduction.badge} />
                      </span>
                      <span className="font-mono text-[#10b981]">- {formatINR(analysis.newRegime.standardDeduction)}</span>
                    </div>
                    {analysis.employerNpsAmount > 0 && (
                      <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span className="flex items-center">
                          Employer NPS (80CCD(2))
                          <Tooltip content={TaxGlossary.sec80ccd2.text} title={TaxGlossary.sec80ccd2.title} badgeText={TaxGlossary.sec80ccd2.badge} />
                        </span>
                        <span className="font-mono text-[#10b981]">- {formatINR(analysis.employerNpsAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                      <span>Net Taxable Income</span>
                      <span className="font-mono text-[#171717] dark:text-white">{formatINR(analysis.newRegime.netTaxableIncome)}</span>
                    </div>
                    {analysis.newRegime.sec87aRebate > 0 && (
                      <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span className="flex items-center">
                          Section 87A Rebate
                          <Tooltip content={TaxGlossary.sec87a.text} title={TaxGlossary.sec87a.title} badgeText={TaxGlossary.sec87a.badge} />
                        </span>
                        <span className="font-mono text-[#10b981]">- {formatINR(analysis.newRegime.sec87aRebate)} (100% Tax Free)</span>
                      </div>
                    )}
                    {analysis.newRegime.marginalRelief > 0 && (
                      <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span className="flex items-center">
                          87A Marginal Relief
                          <Tooltip content={TaxGlossary.sec87a.text} title="Marginal Relief on 87A" badgeText="Relief" />
                        </span>
                        <span className="font-mono text-[#10b981]">- {formatINR(analysis.newRegime.marginalRelief)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1] pt-1 border-t border-[#ebebeb] dark:border-[#262626]">
                      <span className="font-medium">Total Annual Income Tax</span>
                      <span className="font-mono font-bold text-[#ee0000]">{formatINR(analysis.newRegime.totalAnnualTax)}</span>
                    </div>
                    <div className="pt-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center bg-[#fafafa] dark:bg-[#181818] -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3.5 sm:p-4 rounded-b-2xl">
                      <span className="font-bold text-[#171717] dark:text-white text-[13px] sm:text-[14px]">Monthly Take-Home</span>
                      <span className="text-lg sm:text-xl font-bold font-mono text-[#10b981]">{formatINR(analysis.newRegime.monthlyTakeHome)}</span>
                    </div>
                  </div>
                </div>

                {/* Old Regime Card */}
                <div className={`p-4 sm:p-6 rounded-2xl border transition-all ${
                  selectedRegime === 'OLD' 
                    ? 'bg-white dark:bg-[#121212] border-[#7928ca] shadow-stacked ring-2 ring-[#7928ca]/25' 
                    : 'bg-[#fafafa]/80 dark:bg-[#161616]/80 border-[#ebebeb] dark:border-[#262626]'
                }`}>
                  <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#ebebeb] dark:border-[#262626]">
                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h4 className="text-[14.5px] sm:text-[15px] font-bold text-[#171717] dark:text-white">Old Tax Regime</h4>
                        <span className="px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold bg-[#7928ca]/10 text-[#7928ca]">Traditional</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373]">With 80C, 80D, HRA &amp; Home Loan</span>
                    </div>
                    {analysis.betterRegime === 'OLD' && (
                      <span className="px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-mono font-bold bg-[#7928ca]/10 text-[#7928ca] border border-[#7928ca]/20 shrink-0">
                        Recommended
                      </span>
                    )}
                  </div>

                  <div className="mt-3.5 space-y-2.5 text-[12px] sm:text-[13px]">
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                      <span>Gross Annual Salary</span>
                      <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(analysis.oldRegime.grossAnnualSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                      <span>Standard Deduction &amp; PT</span>
                      <span className="font-mono text-[#10b981]">- {formatINR(analysis.oldRegime.standardDeduction + analysis.oldRegime.professionalTaxDeduction)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                      <span className="flex items-center">
                        HRA Exemption (10(13A))
                        <Tooltip content={TaxGlossary.sec1013a.text} title={TaxGlossary.sec1013a.title} badgeText={TaxGlossary.sec1013a.badge} />
                      </span>
                      <span className="font-mono text-[#10b981]">- {formatINR(analysis.oldRegime.hraExemption)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                      <span className="flex items-center">
                        Chapter VI-A Deductions
                        <Tooltip content={TaxGlossary.sec80c.text} title={TaxGlossary.sec80c.title} badgeText={TaxGlossary.sec80c.badge} />
                      </span>
                      <span className="font-mono text-[#10b981]">- {formatINR(analysis.oldRegime.chapter6ADeductions)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                      <span>Net Taxable Income</span>
                      <span className="font-mono text-[#171717] dark:text-white">{formatINR(analysis.oldRegime.netTaxableIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1] pt-1 border-t border-[#ebebeb] dark:border-[#262626]">
                      <span className="font-medium">Total Annual Income Tax</span>
                      <span className="font-mono font-bold text-[#ee0000]">{formatINR(analysis.oldRegime.totalAnnualTax)}</span>
                    </div>
                    <div className="pt-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center bg-[#fafafa] dark:bg-[#181818] -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3.5 sm:p-4 rounded-b-2xl">
                      <span className="font-bold text-[#171717] dark:text-white text-[13px] sm:text-[14px]">Monthly Take-Home</span>
                      <span className="text-lg sm:text-xl font-bold font-mono text-[#10b981]">{formatINR(analysis.oldRegime.monthlyTakeHome)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compensation Reality Check (Real Cash vs Paper Money) */}
            <div className="vessa-card p-4 sm:p-8 rounded-2xl border border-[#ebebeb] dark:border-[#262626] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] font-semibold block">
                    Compensation Reality Check
                  </span>
                  <h3 className="text-[15.5px] sm:text-[16px] font-bold text-[#171717] dark:text-white">
                    Real Cash vs. Paper Money Breakdown
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] text-[#4d4d4d] dark:text-[#a1a1a1] self-start sm:self-center">
                  Base CTC: <strong className="text-[#10b981]">{formatINR(analysis.compensationSplit.guaranteedBaseCtc)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {/* Card 1: Monthly In-Hand (Real Cash) */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#fafafa] dark:bg-[#161616] border border-[#10b981]/30 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#171717] dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                      Monthly In-Hand (Real Cash)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] font-bold">
                      Guaranteed
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#10b981]">
                    {formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}
                    <span className="text-xs font-normal text-[#888888] dark:text-[#737373]"> /mo</span>
                  </div>
                  <p className="text-[11px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                    Guaranteed cash credited to your bank every single month without relying on performance bonuses.
                  </p>
                </div>

                {/* Card 2: Yearly Bonus (Post-Tax Lump Sum) */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#fafafa] dark:bg-[#161616] border border-[#0070f3]/30 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#171717] dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0070f3]"></span>
                      Yearly Bonus (Post-Tax)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0070f3]/10 text-[#0070f3] font-bold">
                      Lump Sum
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#0070f3] dark:text-[#38bdf8]">
                    {formatINR(analysis.compensationSplit.yearlyBonusNet)}
                    <span className="text-xs font-normal text-[#888888] dark:text-[#737373]"> net</span>
                  </div>
                  <p className="text-[11px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                    Estimated post-tax annual payout from ₹{formatINR(analysis.compensationSplit.yearlyBonusGross)} gross variable bonus.
                  </p>
                </div>

                {/* Card 3: Paper Equity (Annual ESOPs) */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#fafafa] dark:bg-[#161616] border border-[#7928ca]/30 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#171717] dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#7928ca]"></span>
                      Paper Equity (ESOPs/RSUs)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#7928ca]/10 text-[#7928ca] font-bold">
                      Illiquid
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#7928ca] dark:text-[#a855f7]">
                    {formatINR(analysis.compensationSplit.annualEsopValue)}
                    <span className="text-xs font-normal text-[#888888] dark:text-[#737373]"> /yr</span>
                  </div>
                  <p className="text-[11px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                    Annualized stock grant value subject to 4-year vesting schedule and company liquidity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 CONTENT: CORPORATE SALARY SLIP VIEW */}
        {outputTab === 'salary-slip' && (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
            <div className="vessa-card rounded-2xl border border-[#ebebeb] dark:border-[#262626] overflow-hidden shadow-stacked-sm">
              {/* Slip Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 bg-[#fafafa] dark:bg-[#181818] border-b border-[#ebebeb] dark:border-[#262626] no-print">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                    <h3 className="text-[14.5px] sm:text-[15px] font-bold text-[#171717] dark:text-white">
                      Official Monthly Salary Statement
                    </h3>
                  </div>
                  <p className="text-[11.5px] sm:text-[12px] text-[#888888] dark:text-[#737373]">
                    Ready for appraisal negotiation, landlord verification, and loan proofs.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySlipText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[12px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white hover:bg-[#f5f5f5] cursor-pointer transition-colors shadow-2xs"
                  >
                    {copiedSlipText ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSlipText ? 'Copied' : 'Copy Text'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSlipOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg sm:rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-[12px] font-semibold hover:bg-[#333333] dark:hover:bg-[#e0e0e0] cursor-pointer transition-colors shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print &amp; PDF</span>
                  </button>
                </div>
              </div>

              {/* Printable Payslip Body */}
              <div id="printable-payslip" className="p-4 sm:p-8 space-y-5 sm:space-y-6 text-[#171717] dark:text-[#ededed] bg-white dark:bg-[#121212]">
                {/* Header of Payslip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 sm:pb-6 border-b border-[#ebebeb] dark:border-[#262626] gap-3 sm:gap-4">
                  <div className="space-y-1 w-full max-w-md">
                    <input
                      type="text"
                      value={employerCompanyName}
                      onChange={(e) => setEmployerCompanyName(e.target.value)}
                      className="text-base sm:text-xl font-bold text-[#171717] dark:text-white bg-transparent border-b border-dashed border-transparent hover:border-[#a1a1a1] focus:border-[#0070f3] focus:outline-hidden w-full"
                      title="Click to edit employer company name"
                    />
                    <p className="text-[11.5px] sm:text-[12px] text-[#888888] dark:text-[#737373] font-mono">
                      Monthly Payslip &amp; Compensation Breakdown
                    </p>
                  </div>
                  <div className="text-left sm:text-right space-y-0.5">
                    <span className="text-[10.5px] sm:text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Pay Period</span>
                    <span className="text-[13px] sm:text-[14px] font-mono font-semibold text-[#171717] dark:text-white">Current Calendar Month</span>
                    <span className="text-[11px] font-mono text-[#0070f3] block font-medium">{selectedRegime} Tax Regime</span>
                  </div>
                </div>

                {/* Employee Info Grid (Mobile Responsive) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] text-[12px]">
                  <div>
                    <span className="text-[#888888] dark:text-[#737373] block font-mono">Designation:</span>
                    <input
                      type="text"
                      value={employeeDesignation}
                      onChange={(e) => setEmployeeDesignation(e.target.value)}
                      className="font-semibold text-[#171717] dark:text-white bg-transparent border-b border-dashed border-transparent hover:border-[#a1a1a1] focus:border-[#0070f3] focus:outline-hidden w-full"
                      title="Click to edit employee designation"
                    />
                  </div>
                  <div>
                    <span className="text-[#888888] dark:text-[#737373] block font-mono">Annual CTC:</span>
                    <span className="font-semibold text-[#171717] dark:text-white font-mono">{formatINR(analysis.inputs.annualCtc)}</span>
                  </div>
                  <div>
                    <span className="text-[#888888] dark:text-[#737373] block font-mono">Work State (PT):</span>
                    <span className="font-semibold text-[#171717] dark:text-white">{analysis.inputs.stateCode}</span>
                  </div>
                  <div>
                    <span className="text-[#888888] dark:text-[#737373] block font-mono">Working Days:</span>
                    <span className="font-semibold text-[#171717] dark:text-white font-mono">30 / 31</span>
                  </div>
                </div>

                {/* Dual Table: Earnings & Deductions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Earnings */}
                  <div className="border border-[#ebebeb] dark:border-[#262626] rounded-xl overflow-hidden">
                    <div className="bg-[#fafafa] dark:bg-[#181818] px-3.5 sm:px-4 py-2.5 border-b border-[#ebebeb] dark:border-[#262626] flex justify-between items-center text-[12.5px] sm:text-[13px] font-semibold text-[#171717] dark:text-white">
                      <span>Earnings (Monthly)</span>
                      <span>Amount</span>
                    </div>
                    <div className="p-3 sm:p-4 space-y-2 text-[12px] sm:text-[13px]">
                      <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span>Basic Salary</span>
                        <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(monthlyBasic)}</span>
                      </div>
                      <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span>House Rent Allowance (HRA)</span>
                        <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(monthlyHra)}</span>
                      </div>
                      <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span>Special Allowance</span>
                        <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(monthlySpecial)}</span>
                      </div>
                    </div>
                    <div className="bg-[#fafafa] dark:bg-[#181818] px-3.5 sm:px-4 py-2.5 sm:py-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center text-[12.5px] sm:text-[13px] font-semibold text-[#171717] dark:text-white">
                      <span>Gross Monthly Earnings (A)</span>
                      <span className="font-mono font-bold text-[#171717] dark:text-white">{formatINR(totalMonthlyEarnings)}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-[#ebebeb] dark:border-[#262626] rounded-xl overflow-hidden">
                    <div className="bg-[#fafafa] dark:bg-[#181818] px-3.5 sm:px-4 py-2.5 border-b border-[#ebebeb] dark:border-[#262626] flex justify-between items-center text-[12.5px] sm:text-[13px] font-semibold text-[#171717] dark:text-white">
                      <span>Deductions (Monthly)</span>
                      <span>Amount</span>
                    </div>
                    <div className="p-3 sm:p-4 space-y-2 text-[12px] sm:text-[13px]">
                      <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span>Employee PF (EPF)</span>
                        <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(activeRegimeData.monthlyEmployeePf)}</span>
                      </div>
                      <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span>Professional Tax (PT)</span>
                        <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(activeRegimeData.monthlyPt)}</span>
                      </div>
                      <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                        <span>Income Tax (TDS)</span>
                        <span className="font-mono font-medium text-[#ee0000]">{formatINR(activeRegimeData.monthlyTax)}</span>
                      </div>
                      {activeRegimeData.monthlyVpf > 0 && (
                        <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                          <span>Voluntary PF (VPF)</span>
                          <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(activeRegimeData.monthlyVpf)}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-[#fafafa] dark:bg-[#181818] px-3.5 sm:px-4 py-2.5 sm:py-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center text-[12.5px] sm:text-[13px] font-semibold text-[#171717] dark:text-white">
                      <span>Total Deductions (B)</span>
                      <span className="font-mono font-bold text-[#ee0000]">{formatINR(totalMonthlyDeductions)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay Final Summary Callout */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <span className="text-[11px] sm:text-[12px] font-mono uppercase text-[#888888] dark:text-[#737373] block">
                      Net Take-Home Pay (A - B)
                    </span>
                    <span className="text-2xl sm:text-4xl font-bold font-mono text-[#10b981]">
                      {formatINR(activeRegimeData.monthlyTakeHome)}
                    </span>
                    <span className="text-[11px] sm:text-[12px] text-[#888888] dark:text-[#737373] block mt-0.5">
                      Transferred to bank account on salary credit date
                    </span>
                  </div>
                  <div className="text-left sm:text-right text-[11px] sm:text-[12px] font-mono text-[#888888] dark:text-[#737373]">
                    <span>Standard 30-Day Pay Cycle</span>
                    <span className="block text-[#10b981] font-semibold">100% Tax Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3 CONTENT: FINANCIAL WEALTH BLUEPRINT */}
        {outputTab === 'wealth-blueprint' && (
          <div className="animate-in fade-in duration-200">
            <FinancialBlueprint
              monthlyTakeHome={activeRegimeData.monthlyTakeHome}
              annualCtc={inputs.annualCtc}
              epfMonthly={activeRegimeData.monthlyEmployeePf}
            />
          </div>
        )}

        {/* TAB 4 CONTENT: SALARY PERCENTILE & PEER BENCHMARK */}
        {outputTab === 'peer-benchmark' && (
          <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-200">
            <div className="vessa-card rounded-2xl border border-[#ebebeb] dark:border-[#262626] overflow-hidden">
              <PercentileMeter
                annualCtc={inputs.annualCtc}
                salaryInputs={inputs}
                initialExperience={experienceYears}
              />
            </div>
          </div>
        )}
      </div>

      {/* Salary Slip Print Modal Popup */}
      <SalarySlipModal
        analysis={analysis}
        selectedRegime={selectedRegime}
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
      />

      {/* Document OCR & PDF Import Modal */}
      <DocumentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApply={handleApplyExtractedInputs}
      />
    </div>
  );
};
