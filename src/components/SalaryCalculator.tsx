import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  calculateSalary, 
  DEFAULT_SALARY_INPUTS, 
  type SalaryInputs 
} from '../lib/taxEngine';
import { formatINR } from '../lib/formatters';
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
  Zap, 
  Upload, 
  Pencil,
  MapPin,
  ChevronDown,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  Compass,
  TrendingUp,
  BarChart3,
  ArrowRight,
  AlertTriangle
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
  const [hasAcknowledgedAdvanced, setHasAcknowledgedAdvanced] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inhander_adv_acked') === 'true';
    }
    return false;
  });

  // Payslip customization state
  const [employeeDesignation, setEmployeeDesignation] = useState('Senior Software Engineer');
  const [employerCompanyName, setEmployerCompanyName] = useState('Tech Enterprises India Pvt. Ltd.');

  const resultsRef = useRef<HTMLDivElement>(null);
  const advancedSectionRef = useRef<HTMLDivElement>(null);

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
    showToast("Payslip data applied to calculator");
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

  // Auto-align selected regime to the better regime when CTC changes
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
    if (isEditingCtc) {
      handleCtcInputBlur();
    }
    try {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
    if (resultsRef.current && typeof window !== 'undefined' && window.innerWidth < 768) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Calculated: ${formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}/mo take-home`);
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
        particleCount: 60,
        spread: 50,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }
    showToast("Deductions maximized");
  };

  const handleOpenAdvancedSettings = () => {
    setIsAdvancedOpen(true);
    setHasAcknowledgedAdvanced(true);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('inhander_adv_acked', 'true');
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      if (advancedSectionRef.current) {
        advancedSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
    showToast("Advanced settings expanded");
  };

  const handleShareLink = () => {
    if (typeof window !== 'undefined') {
      const query = encodeInputsToQuery(inputs, { exp: experienceYears, regime: selectedRegime });
      const shareUrl = `${window.location.origin}${window.location.pathname}?${query}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast("Calculation link copied");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopySummary = () => {
    const query = encodeInputsToQuery(inputs, { exp: experienceYears, regime: selectedRegime });
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}?${query}` 
      : 'https://inhander.com';

    const text = `Take-Home Salary Breakdown for ${formatINR(inputs.annualCtc)} CTC:
- In-Hand Monthly: ${formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}/mo
- Guaranteed Base CTC: ${formatINR(analysis.compensationSplit.guaranteedBaseCtc)}
- Yearly Variable Bonus (Post-Tax): ${formatINR(analysis.compensationSplit.yearlyBonusNet)}
- Annual Stock / ESOPs: ${formatINR(analysis.compensationSplit.annualEsopValue)}
- Income Tax: ${formatINR(activeRegimeData.totalAnnualTax)} (${selectedRegime} Tax Regime)
- Professional Tax: ${formatINR(analysis.ptAnnual)}/yr

Calculated on inHander: ${shareUrl}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    showToast("Summary copied to clipboard");
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleCopySlipText = () => {
    const summary = `
SALARY SLIP BREAKDOWN (${selectedRegime} TAX REGIME)
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

NET TAKE-HOME SALARY (Monthly): ${formatINR(activeRegimeData.monthlyTakeHome)}
ANNUAL TAKE-HOME SALARY: ${formatINR(activeRegimeData.annualTakeHome)}
TOTAL ANNUAL INCOME TAX: ${formatINR(activeRegimeData.totalAnnualTax)}

Generated via inHander.com
`.trim();

    navigator.clipboard.writeText(summary);
    setCopiedSlipText(true);
    showToast("Payslip text copied");
    setTimeout(() => setCopiedSlipText(false), 2500);
  };

  // Count active customizations
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
    <div id="calculator-section" className="w-full max-w-5xl mx-auto space-y-10 sm:space-y-14 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#171717] dark:bg-white text-white dark:text-[#171717] rounded-xl shadow-xl text-sm font-normal justify-center sm:justify-start">
            <Check className="w-4 h-4 text-[#10b981] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAYER 1: THE HERO SECTION (Immediate Answer & Visual Focus)               */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#121212] rounded-3xl overflow-hidden shadow-sm transition-all">
        
        {/* Top Input Area with Generous Whitespace */}
        <div className="p-8 sm:p-12 lg:p-14 bg-[#fafafa]/60 dark:bg-[#161616]/60">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-12">
            
            {/* Input Zone */}
            <div className="space-y-2.5 w-full lg:w-auto">
              <label className="text-xs sm:text-sm font-medium text-[#666666] dark:text-[#999999] block">
                Annual Cost to Company (CTC)
              </label>
              
              {/* Typeable CTC Display + Embedded Calculate Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
                <div className="flex-1 sm:flex-initial inline-flex items-center gap-2 bg-white dark:bg-[#1a1a1a] px-4 sm:px-5 h-12 sm:h-13 rounded-2xl shadow-xs border border-[#ebebeb] dark:border-[#262626] focus-within:ring-2 focus-within:ring-[#0070f3]/30 transition-all min-w-0">
                  <span className="text-2xl sm:text-3xl font-medium text-[#888888] dark:text-[#777777] select-none shrink-0">
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
                    className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#171717] dark:text-white tracking-tight bg-transparent border-0 focus:outline-hidden w-full sm:w-52 lg:w-60 min-w-0"
                    placeholder="12,00,000"
                    aria-label="Annual Cost to Company (CTC)"
                  />
                  <Pencil className="w-3.5 h-3.5 text-[#aaaaaa] opacity-50 shrink-0 self-center" />
                  <span className="text-xs sm:text-sm text-[#888888] dark:text-[#777777] font-normal shrink-0 ml-1">
                    / yr
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCalculateClick}
                  className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 h-12 sm:h-13 rounded-2xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
                >
                  <span>Calculate</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions (Ghost Utilities) */}
            <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-2.5 w-full lg:w-auto lg:shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-12 sm:h-13 rounded-2xl bg-white dark:bg-[#1a1a1a] hover:bg-[#f0f0f0] dark:hover:bg-[#242424] text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white text-xs sm:text-sm font-medium transition-all cursor-pointer touch-manipulation text-center shadow-xs border border-[#ebebeb] dark:border-[#262626]"
                title="Upload & Scan Payslip (PDF / Image)"
              >
                <Upload className="w-3.5 h-3.5 text-[#0070f3] shrink-0" />
                <span>Upload</span>
              </button>

              <button
                type="button"
                onClick={handleOptimizeTax}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-12 sm:h-13 rounded-2xl bg-white dark:bg-[#1a1a1a] hover:bg-[#f0f0f0] dark:hover:bg-[#242424] text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white text-xs sm:text-sm font-medium transition-all cursor-pointer touch-manipulation text-center shadow-xs border border-[#ebebeb] dark:border-[#262626]"
                title="Maximize Tax Deductions"
              >
                <Zap className="w-3.5 h-3.5 text-[#f5a623] shrink-0" />
                <span>{isOptimized ? 'Optimized' : 'Optimize'}</span>
              </button>

              <div className="inline-flex items-center justify-center gap-1 px-3 sm:px-3.5 h-12 sm:h-13 rounded-2xl bg-white dark:bg-[#1a1a1a] text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white shadow-xs border border-[#ebebeb] dark:border-[#262626] transition-colors">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#888888]" />
                <select
                  value={inputs.stateCode}
                  onChange={(e) => setInputs(prev => ({ ...prev, stateCode: e.target.value }))}
                  className="bg-transparent text-xs sm:text-sm font-medium text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white border-0 focus:outline-hidden cursor-pointer w-full text-center"
                  title="Select work location for professional tax"
                  aria-label="Work State"
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

          {/* Slider & Presets */}
          <div className="mt-8 space-y-4">
            <input
              type="range"
              min={100000}
              max={15000000}
              step={25000}
              value={inputs.annualCtc}
              onChange={(e) => handleCtcChange(Number(e.target.value))}
              className="w-full h-1.5 bg-[#e5e7eb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
            />
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
              <span className="text-xs text-[#888888] dark:text-[#777777] font-normal shrink-0 mr-1">Presets:</span>
              {CTC_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleCtcChange(preset.value)}
                  className={`px-3 py-1 rounded-full text-xs transition-all shrink-0 cursor-pointer snap-start ${
                    inputs.annualCtc === preset.value
                      ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-medium shadow-2xs'
                      : 'bg-black/5 dark:bg-white/5 text-[#555555] dark:text-[#999999] hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Level 1 Hero Take-Home Pay Result */}
        <div ref={resultsRef} className="p-8 sm:p-12 lg:p-14 bg-white dark:bg-[#121212]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Result Block */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Regime Selector & Savings Pill */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex p-1 rounded-full bg-[#f3f4f6] dark:bg-[#1a1a1a]">
                  <button
                    onClick={() => setSelectedRegime('NEW')}
                    className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      selectedRegime === 'NEW'
                        ? 'bg-white dark:bg-[#262626] text-[#171717] dark:text-white shadow-2xs'
                        : 'text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-white'
                    }`}
                  >
                    New Tax Regime
                    {analysis.betterRegime === 'NEW' && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[#0070f3]"></span>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedRegime('OLD')}
                    className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      selectedRegime === 'OLD'
                        ? 'bg-white dark:bg-[#262626] text-[#171717] dark:text-white shadow-2xs'
                        : 'text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-white'
                    }`}
                  >
                    Old Tax Regime
                    {analysis.betterRegime === 'OLD' && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[#7928ca]"></span>
                    )}
                  </button>
                </div>

                {/* Savings Pill & Caution Button */}
                <div className="flex items-center gap-2">
                  {analysis.annualTaxSavings > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecfdf5] dark:bg-[#064e3b]/30 text-[#059669] dark:text-[#34d399] text-xs font-medium shrink-0">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>+{formatINR(analysis.annualTaxSavings)}/yr in {analysis.betterRegime}</span>
                    </div>
                  )}

                  {/* Caution Button (Icon Only - Redirects to Advanced Settings) */}
                  <button
                    type="button"
                    onClick={handleOpenAdvancedSettings}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer group shadow-2xs hover:scale-105 active:scale-95 shrink-0 ${
                      hasAcknowledgedAdvanced || isAdvancedOpen
                        ? 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#777777] dark:text-[#888888] hover:text-[#171717] dark:hover:text-white border border-transparent'
                        : 'bg-[#fffbeb] dark:bg-[#78350f]/30 hover:bg-[#fef3c7] dark:hover:bg-[#78350f]/50 text-[#d97706] dark:text-[#fbbf24] border border-[#fde68a] dark:border-[#92400e]/50'
                    }`}
                    title="Use advanced settings to get the accurate values"
                    aria-label="Use advanced settings to get the accurate values"
                  >
                    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      hasAcknowledgedAdvanced || isAdvancedOpen
                        ? 'text-[#777777] dark:text-[#888888] group-hover:text-[#171717] dark:group-hover:text-white'
                        : 'text-[#d97706] dark:text-[#fbbf24] group-hover:scale-110'
                    }`} />
                  </button>
                </div>
              </div>

              {/* LEVEL 1: Large, Bold Final Take-Home Pay Number */}
              <div className="space-y-2">
                <span className="text-sm font-normal text-[#666666] dark:text-[#999999] block">
                  Net monthly in-hand salary
                </span>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-4xl sm:text-6xl lg:text-7xl font-bold text-[#10b981] tracking-tight">
                    {formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}
                  </span>
                  <span className="text-xl sm:text-2xl text-[#888888] dark:text-[#777777] font-normal shrink-0">
                    / month
                  </span>
                </div>
                <p className="text-sm text-[#666666] dark:text-[#888888] pt-1 font-normal">
                  Estimated monthly credit in bank under {selectedRegime} Tax Regime (FY 2025-26).
                </p>
              </div>

              {/* 4 Stat Tiles (Clean Background Blocks Perfectly Aligned) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-[#f9fafb] dark:bg-[#171717] flex flex-col justify-between gap-2">
                  <span className="text-xs text-[#777777] dark:text-[#888888] font-normal leading-snug min-h-[2rem] flex items-start">
                    Annual take-home
                  </span>
                  <span className="text-base sm:text-lg font-medium text-[#171717] dark:text-white truncate block">
                    {formatINR(activeRegimeData.annualTakeHome)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9fafb] dark:bg-[#171717] flex flex-col justify-between gap-2">
                  <span className="text-xs text-[#777777] dark:text-[#888888] font-normal leading-snug min-h-[2rem] flex items-start">
                    Annual tax (TDS)
                  </span>
                  <span className="text-base sm:text-lg font-medium text-[#ee0000] truncate block">
                    {formatINR(activeRegimeData.totalAnnualTax)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9fafb] dark:bg-[#171717] flex flex-col justify-between gap-2">
                  <span className="text-xs text-[#777777] dark:text-[#888888] font-normal leading-snug min-h-[2rem] flex items-start">
                    Monthly EPF
                  </span>
                  <span className="text-base sm:text-lg font-medium text-[#0070f3] truncate block">
                    {formatINR(activeRegimeData.monthlyEmployeePf)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9fafb] dark:bg-[#171717] flex flex-col justify-between gap-2">
                  <span className="text-xs text-[#777777] dark:text-[#888888] font-normal leading-snug min-h-[2rem] flex items-start">
                    Effective tax rate
                  </span>
                  <span className="text-base sm:text-lg font-medium text-[#171717] dark:text-white truncate block">
                    {activeRegimeData.effectiveTaxRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right Donut Chart Tile */}
            <div className="lg:col-span-5 flex flex-col justify-center">
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
      {/* LAYER 2: INPUT ACCORDION (ADVANCED SETTINGS)                               */}
      {/* ========================================================================= */}
      <div 
        ref={advancedSectionRef} 
        id="advanced-settings-section" 
        className="bg-white dark:bg-[#121212] rounded-3xl overflow-hidden shadow-sm transition-all scroll-mt-28"
      >
        {/* Accordion Trigger Header */}
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full p-6 sm:p-8 flex items-center justify-between bg-[#fafafa]/80 dark:bg-[#161616]/80 hover:bg-[#f3f4f6] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer text-left select-none"
          aria-expanded={isAdvancedOpen}
        >
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-[#171717] dark:text-white tracking-tight">
                Advanced Settings
              </h2>
              <span className="text-xs text-[#888888] dark:text-[#777777] font-normal hidden sm:inline">
                (Deductions &amp; Allowances)
              </span>
              {customCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0070f3]/10 text-[#0070f3] shrink-0">
                  {customCount} customized
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#777777] dark:text-[#888888] font-normal">
              Customize HRA, Section 80C, 80D, EPF statutory cap, and corporate NPS
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className="text-xs text-[#888888] dark:text-[#777777] font-normal hidden sm:inline">
              {isAdvancedOpen ? 'Hide' : 'Expand'}
            </span>
            <div className={`w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#555555] dark:text-[#aaaaaa] transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Collapsible Accordion Content */}
        {isAdvancedOpen && (
          <div className="p-8 sm:p-12 space-y-8 animate-in fade-in duration-200">
            
            {/* Category Segmented Controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
              <button
                type="button"
                onClick={() => setSettingsSubTab('structure')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'structure'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-medium shadow-2xs'
                    : 'bg-black/5 dark:bg-white/5 text-[#666666] dark:text-[#999999] hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                1. Salary Structure
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('deductions')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'deductions'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-medium shadow-2xs'
                    : 'bg-black/5 dark:bg-white/5 text-[#666666] dark:text-[#999999] hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                2. Tax Deductions
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('epf')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'epf'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-medium shadow-2xs'
                    : 'bg-black/5 dark:bg-white/5 text-[#666666] dark:text-[#999999] hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                3. EPF &amp; Gratuity
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('bonus')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'bonus'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-medium shadow-2xs'
                    : 'bg-black/5 dark:bg-white/5 text-[#666666] dark:text-[#999999] hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                4. Bonus &amp; Stocks
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('exit')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all cursor-pointer shrink-0 snap-start ${
                  settingsSubTab === 'exit'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-medium shadow-2xs'
                    : 'bg-black/5 dark:bg-white/5 text-[#666666] dark:text-[#999999] hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                5. Exit &amp; Gratuity
              </button>
            </div>

            {/* SUBTAB 1: SALARY STRUCTURE */}
            {settingsSubTab === 'structure' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Salary % */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label className="font-normal text-[#171717] dark:text-white">Basic Salary (% of CTC)</label>
                      <span className="font-medium text-[#171717] dark:text-white">{inputs.basicPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={70}
                      step={5}
                      value={inputs.basicPercent}
                      onChange={(e) => setInputs(prev => ({ ...prev, basicPercent: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-[#e5e7eb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">
                      {formatINR(analysis.basicAnnual)}/year. Typically 40%–50% for IT roles.
                    </p>
                  </div>

                  {/* State for Professional Tax */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <label className="font-normal text-[#171717] dark:text-white text-sm flex items-center">
                      <span>Work location (PT)</span>
                      <Tooltip content={TaxGlossary.pt.text} title={TaxGlossary.pt.title} badgeText={TaxGlossary.pt.badge} />
                    </label>
                    <select
                      value={inputs.stateCode}
                      onChange={(e) => setInputs(prev => ({ ...prev, stateCode: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                    >
                      {PRIMARY_STATE_OPTIONS.map(st => (
                        <option key={st.code} value={st.code}>{st.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">
                      {STATE_PT_RULES[inputs.stateCode]?.monthlyNote || 'Standard PT deduction'}
                    </p>
                  </div>

                  {/* City Metro / Non-Metro */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <label className="font-normal text-[#171717] dark:text-white text-sm flex items-center">
                      <span>City type for HRA</span>
                      <Tooltip content={TaxGlossary.sec1013a.text} title={TaxGlossary.sec1013a.title} badgeText={TaxGlossary.sec1013a.badge} />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, isMetroCity: true, hraPercent: 50 }))}
                        className={`h-10 px-3 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                          inputs.isMetroCity
                            ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-2xs'
                            : 'bg-white dark:bg-[#1f1f1f] text-[#666666] dark:text-[#aaaaaa] hover:bg-[#f0f0f0]'
                        }`}
                      >
                        Metro (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, isMetroCity: false, hraPercent: 40 }))}
                        className={`h-10 px-3 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                          !inputs.isMetroCity
                            ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-2xs'
                            : 'bg-white dark:bg-[#1f1f1f] text-[#666666] dark:text-[#aaaaaa] hover:bg-[#f0f0f0]'
                        }`}
                      >
                        Non-Metro (40%)
                      </button>
                    </div>
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">Metros: Delhi, Mumbai, Kolkata, Chennai.</p>
                  </div>
                </div>

                {/* Section 80CCD(2) Corporate NPS */}
                <div className="p-6 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ShieldCheck className="w-4 h-4 text-[#10b981] shrink-0" />
                        <h3 className="text-sm font-semibold text-[#171717] dark:text-white">
                          Corporate NPS Restructuring (Section 80CCD(2))
                        </h3>
                        <Tooltip content={TaxGlossary.sec80ccd2.text} title={TaxGlossary.sec80ccd2.title} badgeText={TaxGlossary.sec80ccd2.badge} />
                      </div>
                      <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">
                        Employer contribution to NPS is tax-exempt in both New &amp; Old Regimes.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
                      {[0, 10, 14].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setInputs(prev => ({ ...prev, employerNpsPercent: pct }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${
                            inputs.employerNpsPercent === pct
                              ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-2xs'
                              : 'bg-white dark:bg-[#1f1f1f] text-[#666666] dark:text-[#aaaaaa] hover:bg-[#f0f0f0]'
                          }`}
                        >
                          {pct === 0 ? '0% (Off)' : `${pct}% Basic`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {inputs.employerNpsPercent > 0 && (
                    <div className="flex justify-between items-center text-xs pt-2 text-[#777777] dark:text-[#888888]">
                      <span>Annual Employer NPS ({inputs.employerNpsPercent}% of Basic):</span>
                      <span className="text-[#10b981] font-medium">{formatINR(analysis.employerNpsAmount)}/yr</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 2: TAX DEDUCTIONS */}
            {settingsSubTab === 'deductions' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Rent Paid */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label className="font-normal text-[#171717] dark:text-white flex items-center">
                        <span>Annual Rent Paid (HRA)</span>
                        <Tooltip content={TaxGlossary.sec1013a.text} title={TaxGlossary.sec1013a.title} badgeText={TaxGlossary.sec1013a.badge} />
                      </label>
                      <span className="font-medium text-[#171717] dark:text-white">{formatINR(inputs.annualRentPaid)}</span>
                    </div>
                    <input
                      type="number"
                      value={inputs.annualRentPaid || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, annualRentPaid: Number(e.target.value) || 0 }))}
                      placeholder="e.g. 240000"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                    />
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">
                      Exemption: {formatINR(analysis.oldRegime.hraExemption)} (Old Regime).
                    </p>
                  </div>

                  {/* Section 80C */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label className="font-normal text-[#171717] dark:text-white flex items-center">
                        <span>Section 80C Investments</span>
                        <Tooltip content={TaxGlossary.sec80c.text} title={TaxGlossary.sec80c.title} badgeText={TaxGlossary.sec80c.badge} />
                      </label>
                      <span className="font-medium text-[#171717] dark:text-white">{formatINR(inputs.sec80C_Investments)}</span>
                    </div>
                    <input
                      type="number"
                      max={150000}
                      value={inputs.sec80C_Investments || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80C_Investments: Math.min(150000, Number(e.target.value) || 0) }))}
                      placeholder="Max ₹1,50,000"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                    />
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">EPF is automatically included.</p>
                  </div>

                  {/* Section 80D Self */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label className="font-normal text-[#171717] dark:text-white flex items-center">
                        <span>Section 80D (Self/Family)</span>
                        <Tooltip content={TaxGlossary.sec80d.text} title={TaxGlossary.sec80d.title} badgeText={TaxGlossary.sec80d.badge} />
                      </label>
                      <span className="font-medium text-[#171717] dark:text-white">{formatINR(inputs.sec80D_SelfFamily)}</span>
                    </div>
                    <input
                      type="number"
                      max={25000}
                      value={inputs.sec80D_SelfFamily || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80D_SelfFamily: Math.min(25000, Number(e.target.value) || 0) }))}
                      placeholder="Max ₹25,000"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                    />
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">Mediclaim premiums.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Section 80D Parents */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label className="font-normal text-[#171717] dark:text-white">Section 80D (Parents)</label>
                      <span className="font-medium text-[#171717] dark:text-white">{formatINR(inputs.sec80D_Parents)}</span>
                    </div>
                    <input
                      type="number"
                      max={inputs.sec80D_ParentsSenior ? 50000 : 25000}
                      value={inputs.sec80D_Parents || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80D_Parents: Number(e.target.value) || 0 }))}
                      placeholder="₹25,000 or ₹50,000"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                    />
                    <label className="flex items-center gap-2 text-xs text-[#666666] dark:text-[#999999] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inputs.sec80D_ParentsSenior}
                        onChange={(e) => setInputs(prev => ({ ...prev, sec80D_ParentsSenior: e.target.checked }))}
                        className="rounded text-[#171717]"
                      />
                      <span>Parents are senior citizens</span>
                    </label>
                  </div>

                  {/* Section 80CCD(1B) Self NPS */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label className="font-normal text-[#171717] dark:text-white">Section 80CCD(1B) NPS</label>
                      <span className="font-medium text-[#171717] dark:text-white">{formatINR(inputs.sec80CCD1B_NPS)}</span>
                    </div>
                    <input
                      type="number"
                      max={50000}
                      value={inputs.sec80CCD1B_NPS || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80CCD1B_NPS: Math.min(50000, Number(e.target.value) || 0) }))}
                      placeholder="Max ₹50,000"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                    />
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">Self voluntary contribution.</p>
                  </div>

                  {/* Section 24 Home Loan */}
                  <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label className="font-normal text-[#171717] dark:text-white">Home Loan Interest (Sec 24)</label>
                      <span className="font-medium text-[#171717] dark:text-white">{formatINR(inputs.sec24_HomeLoanInterest)}</span>
                    </div>
                    <input
                      type="number"
                      max={200000}
                      value={inputs.sec24_HomeLoanInterest || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec24_HomeLoanInterest: Math.min(200000, Number(e.target.value) || 0) }))}
                      placeholder="Max ₹2,00,000"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                    />
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">Interest on self-occupied home.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 3: EPF & GRATUITY */}
            {settingsSubTab === 'epf' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="font-normal text-[#171717] dark:text-white text-sm">EPF statutory cap mode</label>
                      <Tooltip content={TaxGlossary.epfCap.text} title={TaxGlossary.epfCap.title} badgeText={TaxGlossary.epfCap.badge} />
                    </div>
                    <input
                      type="checkbox"
                      checked={inputs.epfCapped}
                      onChange={(e) => setInputs(prev => ({ ...prev, epfCapped: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#171717]"
                    />
                  </div>
                  <p className="text-xs text-[#777777] dark:text-[#888888] font-normal leading-relaxed">
                    {inputs.epfCapped 
                      ? 'Capped at statutory ₹1,800/month to maximize take-home cash.' 
                      : '12% of actual basic salary (uncapped).'}
                  </p>
                  <div className="text-xs text-[#171717] dark:text-white font-medium">
                    Employee PF: {formatINR(analysis.newRegime.monthlyEmployeePf)}/mo
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-normal text-[#171717] dark:text-white text-sm">Employer PF inside CTC</label>
                    <input
                      type="checkbox"
                      checked={inputs.employerPfInCtc}
                      onChange={(e) => setInputs(prev => ({ ...prev, employerPfInCtc: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#171717]"
                    />
                  </div>
                  <p className="text-xs text-[#777777] dark:text-[#888888] font-normal leading-relaxed">
                    Employer 12% is part of total cost to company.
                  </p>
                  <div className="text-xs text-[#171717] dark:text-white font-medium">
                    Employer PF: {formatINR(analysis.employerPfAnnual)}/yr
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="font-normal text-[#171717] dark:text-white text-sm">Gratuity inside CTC</label>
                      <Tooltip content={TaxGlossary.rule1526.text} title={TaxGlossary.rule1526.title} badgeText={TaxGlossary.rule1526.badge} />
                    </div>
                    <input
                      type="checkbox"
                      checked={inputs.includeGratuity}
                      onChange={(e) => setInputs(prev => ({ ...prev, includeGratuity: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#171717]"
                    />
                  </div>
                  <p className="text-xs text-[#777777] dark:text-[#888888] font-normal leading-relaxed">
                    15/26 rule gratuity allocation inside CTC.
                  </p>
                  <div className="text-xs text-[#171717] dark:text-white font-medium">
                    Gratuity: {formatINR(analysis.gratuityAnnual)}/yr
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 4: BONUS & STOCKS */}
            {settingsSubTab === 'bonus' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                  <label className="font-normal text-[#171717] dark:text-white text-sm block">Annual variable bonus</label>
                  <input
                    type="number"
                    value={inputs.variableBonusAnnual || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, variableBonusAnnual: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 150000"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                  />
                  <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">Performance-linked annual payout.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                  <label className="font-normal text-[#171717] dark:text-white text-sm block">Joining / sign-on bonus</label>
                  <input
                    type="number"
                    value={inputs.joiningBonusAnnual || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, joiningBonusAnnual: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 200000"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                  />
                  <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">One-time initial sign-on.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                  <label className="font-normal text-[#171717] dark:text-white text-sm block">Annual ESOP / stock grants</label>
                  <input
                    type="number"
                    value={inputs.rsuVestedAnnual || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, rsuVestedAnnual: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 500000"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1f1f1f] text-sm text-[#171717] dark:text-white focus:outline-hidden shadow-2xs"
                  />
                  <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">Annualized vesting equity.</p>
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
      {/* LAYER 3: OUTPUT ARCHITECTURE (HORIZONTAL TABS & SUBTLE CARDS)             */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        {/* Minimalist Horizontal Tab Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 scrollbar-none snap-x">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setOutputTab('tax-comparison')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
                outputTab === 'tax-comparison'
                  ? 'bg-white dark:bg-[#1e1e1e] text-[#171717] dark:text-white shadow-2xs'
                  : 'text-[#666666] dark:text-[#999999] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#0070f3] shrink-0" />
              <span>Tax Comparison</span>
            </button>

            <button
              type="button"
              onClick={() => setOutputTab('salary-slip')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
                outputTab === 'salary-slip'
                  ? 'bg-white dark:bg-[#1e1e1e] text-[#171717] dark:text-white shadow-2xs'
                  : 'text-[#666666] dark:text-[#999999] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-[#10b981] shrink-0" />
              <span>Salary Slip</span>
            </button>

            <button
              type="button"
              onClick={() => setOutputTab('wealth-blueprint')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
                outputTab === 'wealth-blueprint'
                  ? 'bg-white dark:bg-[#1e1e1e] text-[#171717] dark:text-white shadow-2xs'
                  : 'text-[#666666] dark:text-[#999999] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4 text-[#7928ca] shrink-0" />
              <span>Wealth Blueprint</span>
            </button>

            <button
              type="button"
              onClick={() => setOutputTab('peer-benchmark')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 snap-start ${
                outputTab === 'peer-benchmark'
                  ? 'bg-white dark:bg-[#1e1e1e] text-[#171717] dark:text-white shadow-2xs'
                  : 'text-[#666666] dark:text-[#999999] hover:text-[#171717] dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-[#f5a623] shrink-0" />
              <span>Percentile Rank</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center pr-2 shrink-0">
            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-[#666666] dark:text-[#999999] hover:text-[#171717] dark:hover:text-white cursor-pointer transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: TAX COMPARISON */}
        {outputTab === 'tax-comparison' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Side-by-Side Dual Matrix Cards (Border-free 2-4% grey blocks) */}
            <div className="bg-white dark:bg-[#121212] p-8 sm:p-12 rounded-3xl shadow-sm space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-semibold text-[#171717] dark:text-white tracking-tight">
                    Tax Comparison (New vs. Old Regime)
                  </h2>
                  <p className="text-xs sm:text-sm text-[#777777] dark:text-[#888888] font-normal">
                    Budget 2024 revised slabs vs. Old Regime deductions for ₹{formatINR(inputs.annualCtc)} CTC
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white transition-all self-start sm:self-center"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Copied' : 'Copy breakdown'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
                {/* New Regime Card */}
                <div className={`p-6 sm:p-8 rounded-2xl flex flex-col justify-between transition-all ${
                  selectedRegime === 'NEW'
                    ? 'bg-[#f4f5f7] dark:bg-[#181818] ring-1 ring-black/10 dark:ring-white/15 shadow-xs'
                    : 'bg-[#fafafa] dark:bg-[#141414]'
                }`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-[#171717] dark:text-white">New Tax Regime</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-normal bg-black/5 dark:bg-white/10 text-[#666666] dark:text-[#aaaaaa]">FY 25-26</span>
                        </div>
                        <span className="text-xs text-[#777777] dark:text-[#888888] font-normal">₹75k standard deduction</span>
                      </div>
                      {analysis.betterRegime === 'NEW' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#10b981]/10 text-[#10b981] shrink-0">
                          Recommended
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                        <span>Gross annual salary</span>
                        <span className="font-medium text-[#171717] dark:text-white">{formatINR(analysis.newRegime.grossAnnualSalary)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                        <span className="flex items-center">
                          Standard deduction
                          <Tooltip content={TaxGlossary.standardDeduction.text} title={TaxGlossary.standardDeduction.title} />
                        </span>
                        <span className="text-[#10b981] font-medium">- {formatINR(analysis.newRegime.standardDeduction)}</span>
                      </div>
                      {analysis.employerNpsAmount > 0 && (
                        <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                          <span>Employer NPS (80CCD(2))</span>
                          <span className="text-[#10b981] font-medium">- {formatINR(analysis.employerNpsAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                        <span>Net taxable income</span>
                        <span className="text-[#171717] dark:text-white font-medium">{formatINR(analysis.newRegime.netTaxableIncome)}</span>
                      </div>
                      {analysis.newRegime.sec87aRebate > 0 && (
                        <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                          <span>Section 87A rebate</span>
                          <span className="text-[#10b981] font-medium">- {formatINR(analysis.newRegime.sec87aRebate)} (Tax free)</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa] pt-1">
                        <span>Total annual tax</span>
                        <span className="text-[#ee0000] font-medium">{formatINR(analysis.newRegime.totalAnnualTax)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Take-Home Row */}
                  <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                    <span className="font-medium text-[#171717] dark:text-white text-sm">Monthly take-home</span>
                    <span className="text-2xl sm:text-3xl font-bold text-[#10b981]">{formatINR(analysis.newRegime.monthlyTakeHome)}</span>
                  </div>
                </div>

                {/* Old Regime Card */}
                <div className={`p-6 sm:p-8 rounded-2xl flex flex-col justify-between transition-all ${
                  selectedRegime === 'OLD'
                    ? 'bg-[#f4f5f7] dark:bg-[#181818] ring-1 ring-black/10 dark:ring-white/15 shadow-xs'
                    : 'bg-[#fafafa] dark:bg-[#141414]'
                }`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-[#171717] dark:text-white">Old Tax Regime</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-normal bg-black/5 dark:bg-white/10 text-[#666666] dark:text-[#aaaaaa]">Traditional</span>
                        </div>
                        <span className="text-xs text-[#777777] dark:text-[#888888] font-normal">With 80C, 80D &amp; HRA</span>
                      </div>
                      {analysis.betterRegime === 'OLD' && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#10b981]/10 text-[#10b981] shrink-0">
                          Recommended
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                        <span>Gross annual salary</span>
                        <span className="font-medium text-[#171717] dark:text-white">{formatINR(analysis.oldRegime.grossAnnualSalary)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                        <span>Standard deduction &amp; PT</span>
                        <span className="text-[#10b981] font-medium">- {formatINR(analysis.oldRegime.standardDeduction + analysis.oldRegime.professionalTaxDeduction)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                        <span>HRA exemption</span>
                        <span className="text-[#10b981] font-medium">- {formatINR(analysis.oldRegime.hraExemption)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                        <span>Chapter VI-A (80C/80D)</span>
                        <span className="text-[#10b981] font-medium">- {formatINR(analysis.oldRegime.chapter6ADeductions)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa]">
                        <span>Net taxable income</span>
                        <span className="text-[#171717] dark:text-white font-medium">{formatINR(analysis.oldRegime.netTaxableIncome)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#555555] dark:text-[#aaaaaa] pt-1">
                        <span>Total annual tax</span>
                        <span className="text-[#ee0000] font-medium">{formatINR(analysis.oldRegime.totalAnnualTax)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Take-Home Row */}
                  <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                    <span className="font-medium text-[#171717] dark:text-white text-sm">Monthly take-home</span>
                    <span className="text-2xl sm:text-3xl font-bold text-[#10b981]">{formatINR(analysis.oldRegime.monthlyTakeHome)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SALARY SLIP VIEW */}
        {outputTab === 'salary-slip' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#121212] rounded-3xl overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 bg-[#fafafa] dark:bg-[#161616]">
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-semibold text-[#171717] dark:text-white tracking-tight">
                    Monthly Salary Statement
                  </h2>
                  <p className="text-xs sm:text-sm text-[#777777] dark:text-[#888888] font-normal">
                    Formatted for appraisals, landlord verification, and loan proofs
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopySlipText}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-xs sm:text-sm font-normal text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white transition-colors"
                  >
                    {copiedSlipText ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSlipText ? 'Copied' : 'Copy text'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSlipOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-xs sm:text-sm font-medium transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print &amp; PDF</span>
                  </button>
                </div>
              </div>

              {/* Payslip Content Area */}
              <div className="p-8 sm:p-12 space-y-8 text-[#171717] dark:text-[#ededed]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4">
                  <div className="space-y-1 max-w-md w-full">
                    <input
                      type="text"
                      value={employerCompanyName}
                      onChange={(e) => setEmployerCompanyName(e.target.value)}
                      className="text-base sm:text-xl font-semibold text-[#171717] dark:text-white bg-transparent border-0 focus:outline-hidden w-full"
                    />
                    <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">
                      Monthly Payslip &amp; Compensation Breakdown
                    </p>
                  </div>
                  <div className="text-left sm:text-right space-y-0.5 text-xs text-[#777777] dark:text-[#888888]">
                    <span>Current Calendar Month</span>
                    <span className="block font-medium text-[#171717] dark:text-white">{selectedRegime} Tax Regime</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl bg-[#fafafa] dark:bg-[#161616] text-xs">
                  <div>
                    <span className="text-[#888888] block">Designation:</span>
                    <input
                      type="text"
                      value={employeeDesignation}
                      onChange={(e) => setEmployeeDesignation(e.target.value)}
                      className="font-medium text-[#171717] dark:text-white bg-transparent border-0 focus:outline-hidden w-full mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[#888888] block">Annual CTC:</span>
                    <span className="font-medium text-[#171717] dark:text-white block mt-0.5">{formatINR(analysis.inputs.annualCtc)}</span>
                  </div>
                  <div>
                    <span className="text-[#888888] block">Work State:</span>
                    <span className="font-medium text-[#171717] dark:text-white block mt-0.5">{analysis.inputs.stateCode}</span>
                  </div>
                  <div>
                    <span className="text-[#888888] block">Pay Cycle:</span>
                    <span className="font-medium text-[#171717] dark:text-white block mt-0.5">30 Days</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <h3 className="text-sm font-semibold text-[#171717] dark:text-white pb-1">Earnings (Monthly)</h3>
                    <div className="space-y-2 text-sm text-[#555555] dark:text-[#aaaaaa]">
                      <div className="flex justify-between">
                        <span>Basic Salary</span>
                        <span className="font-medium text-[#171717] dark:text-white">{formatINR(monthlyBasic)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>House Rent Allowance (HRA)</span>
                        <span className="font-medium text-[#171717] dark:text-white">{formatINR(monthlyHra)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Special Allowance</span>
                        <span className="font-medium text-[#171717] dark:text-white">{formatINR(monthlySpecial)}</span>
                      </div>
                      <div className="flex justify-between pt-3 font-semibold text-[#171717] dark:text-white">
                        <span>Gross Monthly Earnings</span>
                        <span>{formatINR(totalMonthlyEarnings)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
                    <h3 className="text-sm font-semibold text-[#171717] dark:text-white pb-1">Deductions (Monthly)</h3>
                    <div className="space-y-2 text-sm text-[#555555] dark:text-[#aaaaaa]">
                      <div className="flex justify-between">
                        <span>Employee PF (EPF)</span>
                        <span className="font-medium text-[#171717] dark:text-white">{formatINR(activeRegimeData.monthlyEmployeePf)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional Tax (PT)</span>
                        <span className="font-medium text-[#171717] dark:text-white">{formatINR(activeRegimeData.monthlyPt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Income Tax (TDS)</span>
                        <span className="font-medium text-[#ee0000]">{formatINR(activeRegimeData.monthlyTax)}</span>
                      </div>
                      <div className="flex justify-between pt-3 font-semibold text-[#171717] dark:text-white">
                        <span>Total Monthly Deductions</span>
                        <span className="text-[#ee0000]">{formatINR(totalMonthlyDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#161616] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-[#777777] dark:text-[#888888] font-normal block">Net take-home pay</span>
                    <span className="text-3xl sm:text-4xl font-bold text-[#10b981]">{formatINR(activeRegimeData.monthlyTakeHome)}</span>
                  </div>
                  <span className="text-xs text-[#888888] font-normal">100% Tax Compliant</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WEALTH BLUEPRINT */}
        {outputTab === 'wealth-blueprint' && (
          <div className="animate-in fade-in duration-200">
            <FinancialBlueprint
              monthlyTakeHome={activeRegimeData.monthlyTakeHome}
              annualCtc={inputs.annualCtc}
              epfMonthly={activeRegimeData.monthlyEmployeePf}
            />
          </div>
        )}

        {/* TAB 4: PEER BENCHMARK */}
        {outputTab === 'peer-benchmark' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#121212] rounded-3xl overflow-hidden shadow-sm">
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
