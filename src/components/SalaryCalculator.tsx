import React, { useState, useEffect, useMemo } from 'react';
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
  FileSpreadsheet
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
  const [activeTab, setActiveTab] = useState<'structure' | 'deductions' | 'epf' | 'bonus' | 'exit'>('structure');
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [isEditingCtc, setIsEditingCtc] = useState(false);
  const [ctcInputValue, setCtcInputValue] = useState(() => formatINR(inputs.annualCtc).replace('₹', ''));
  const [isSplitDrawerOpen, setIsSplitDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Real-time URL State Sync (Task 4)
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
  };

  const handleScrollToFineTune = (tab: 'structure' | 'deductions' | 'epf' | 'bonus' | 'exit' = 'deductions') => {
    setActiveTab(tab);
    if (typeof document !== 'undefined') {
      const element = document.getElementById('fine-tune-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('ring-2', 'ring-[#0070f3]', 'dark:ring-[#38bdf8]');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-[#0070f3]', 'dark:ring-[#38bdf8]');
        }, 1500);
      }
    }
  };

  const handleShareLink = () => {
    if (typeof window !== 'undefined') {
      const query = encodeInputsToQuery(inputs, { exp: experienceYears, regime: selectedRegime });
      const shareUrl = `${window.location.origin}${window.location.pathname}?${query}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast("Link copied! Send it to your mentor, spouse, or recruiter.");
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

  return (
    <div id="calculator-section" className="w-full max-w-6xl mx-auto space-y-8 relative">
      {/* Lightweight Floating Toast (Task 4) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#171717] dark:bg-white text-white dark:text-[#171717] rounded-xl shadow-2xl border border-white/10 dark:border-black/10 text-[13px] font-medium">
            <Check className="w-4 h-4 text-[#10b981] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Main Calculation Hub Card */}
      <div className="bg-white dark:bg-[#121212] rounded-2xl border border-[#ebebeb] dark:border-[#262626] shadow-stacked overflow-hidden transition-colors">
        {/* Card Header & Quick CTC Presets */}
        <div className="p-6 sm:p-8 border-b border-[#ebebeb] dark:border-[#262626] bg-[#fafafa]/50 dark:bg-[#181818]/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] font-semibold">
                  Annual Cost to Company (CTC)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                  FY 2025-26 &amp; 26-27
                </span>
              </div>
              
              {/* Typeable & Editable CTC Display with /year + State Selector */}
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#181818] px-3.5 py-1.5 rounded-2xl border border-[#ebebeb] dark:border-[#262626] shadow-xs focus-within:border-[#0070f3] dark:focus-within:border-[#38bdf8] focus-within:ring-2 focus-within:ring-[#0070f3]/20 transition-all group">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono text-[#888888] dark:text-[#737373] select-none">
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
                      }
                    }}
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#171717] dark:text-white font-mono tracking-tight bg-transparent border-0 focus:outline-hidden w-44 sm:w-56 lg:w-64"
                    placeholder="e.g. 12,00,000"
                    title="Click to type your exact CTC (e.g. 12,00,000, 15 LPA, or 1.2 Cr)"
                    aria-label="Annual Cost to Company (CTC)"
                  />
                  <Pencil className="w-3.5 h-3.5 text-[#888888] dark:text-[#737373] opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <span className="text-xl sm:text-2xl font-mono text-[#888888] dark:text-[#737373] select-none">
                  / year
                </span>

                {/* State / Professional Tax Selector Dropdown */}
                <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#181818] px-3 py-1.5 rounded-full border border-[#ebebeb] dark:border-[#262626] shadow-xs hover:border-[#0070f3] dark:hover:border-[#38bdf8] transition-colors group">
                  <MapPin className="w-4 h-4 text-[#0070f3] dark:text-[#38bdf8] shrink-0" />
                  <select
                    value={inputs.stateCode}
                    onChange={(e) => setInputs(prev => ({ ...prev, stateCode: e.target.value }))}
                    className="bg-transparent text-[13px] font-medium text-[#171717] dark:text-white border-0 focus:outline-hidden cursor-pointer"
                    title="Select work location for dynamic state-wise professional tax calculation"
                    aria-label="Work State for Professional Tax"
                  >
                    {PRIMARY_STATE_OPTIONS.map(st => (
                      <option key={st.code} value={st.code} className="bg-white dark:bg-[#181818] text-[#171717] dark:text-white">
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-white dark:bg-[#181818] border border-[#0070f3]/50 hover:border-[#0070f3] text-[#0070f3] dark:text-[#38bdf8] text-[13px] font-semibold hover:bg-[#0070f3]/5 dark:hover:bg-[#0070f3]/10 transition-all hover:scale-102 shadow-xs cursor-pointer"
                title="Upload & Scan Payslip, Offer Letter, or Screenshot (PDF / PNG / JPG)"
              >
                <Upload className="w-4 h-4 text-[#0070f3] dark:text-[#38bdf8]" />
                <span>Upload Payslip</span>
              </button>

              <button
                onClick={handleOptimizeTax}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-[13px] font-medium hover:bg-[#333333] dark:hover:bg-[#e0e0e0] transition-all hover:scale-102 shadow-sm cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#f9cb28] dark:text-[#d97706]" />
                {isOptimized ? 'Deductions Maxed' : '1-Click Maximize In-Hand'}
              </button>
              <button
                onClick={() => setIsSlipOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[#171717] dark:text-white text-[13px] font-medium hover:bg-[#f5f5f5] dark:hover:bg-[#222222] transition-colors shadow-stacked-sm cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#4d4d4d] dark:text-[#a1a1a1]" />
                Salary Slip PDF
              </button>
              <button
                onClick={handleShareLink}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-full border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#222222] transition-all shadow-stacked-sm cursor-pointer text-[13px] font-medium"
                title="Share or bookmark this calculation"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#10b981]" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Range Slider & Presets */}
          <div className="mt-6 space-y-4">
            <input
              type="range"
              min={100000}
              max={15000000}
              step={25000}
              value={inputs.annualCtc}
              onChange={(e) => handleCtcChange(Number(e.target.value))}
              className="w-full h-2 bg-[#ebebeb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
            />
            
            {/* Quick preset chips */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase shrink-0 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-7 h-7 rounded-full transition-all shrink-0 bg-[#0070f3]/10 dark:bg-[#0070f3]/20 text-[#0070f3] dark:text-[#38bdf8] border border-[#0070f3]/30 hover:border-[#0070f3] hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Upload Payslip / Offer Letter (PDF, Screenshot, Image)"
                  aria-label="Upload Payslip"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                {CTC_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleCtcChange(preset.value)}
                    className={`px-3 py-1 rounded-full text-[12px] font-mono font-medium transition-all shrink-0 cursor-pointer ${
                      inputs.annualCtc === preset.value
                        ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                        : 'bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] border border-[#ebebeb] dark:border-[#262626] hover:border-[#a1a1a1] dark:hover:border-[#525252] hover:text-[#171717] dark:hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Task 1: Toggle Compensation Split (Variable / ESOP) */}
              <button
                type="button"
                onClick={() => setIsSplitDrawerOpen(!isSplitDrawerOpen)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono font-medium border transition-colors shrink-0 cursor-pointer ${
                  inputs.variableBonusAnnual > 0 || inputs.rsuVestedAnnual > 0 || isSplitDrawerOpen
                    ? 'bg-[#0070f3]/10 text-[#0070f3] dark:text-[#38bdf8] border-[#0070f3]/30'
                    : 'bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] border-[#ebebeb] dark:border-[#262626] hover:text-[#171717] dark:hover:text-white'
                }`}
              >
                <Coins className="w-3 h-3" />
                <span>Split Cash vs. Bonus/ESOPs</span>
                {isSplitDrawerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Task 1: Collapsible Compensation Split Controls */}
            {isSplitDrawerOpen && (
              <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#0070f3]/30 shadow-xs animate-in fade-in duration-200 mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#171717] dark:text-white flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#0070f3]" />
                    <span>Real Cash vs. Paper Money Split (Deduct Bonuses &amp; ESOPs from Base)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#888888] dark:text-[#737373]">
                    Guaranteed Base CTC: <strong className="text-[#10b981]">{formatINR(analysis.compensationSplit.guaranteedBaseCtc)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Annual Variable Bonus */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <label className="text-[#4d4d4d] dark:text-[#a1a1a1]">Variable / Performance Bonus (₹/yr)</label>
                      <span className="font-mono text-[#0070f3]">{formatINR(inputs.variableBonusAnnual || 0)}</span>
                    </div>
                    <input
                      type="number"
                      value={inputs.variableBonusAnnual || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, variableBonusAnnual: Number(e.target.value) || 0 }))}
                      placeholder="e.g. 2,00,000 (Target bonus)"
                      className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] text-[12px] font-mono text-[#171717] dark:text-white focus:outline-hidden"
                    />
                  </div>

                  {/* ESOP / Stock Grants */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <label className="text-[#4d4d4d] dark:text-[#a1a1a1]">Annual ESOP / Stock Grants (₹/yr)</label>
                      <span className="font-mono text-[#7928ca] dark:text-[#a855f7]">{formatINR(inputs.rsuVestedAnnual || 0)}</span>
                    </div>
                    <input
                      type="number"
                      value={inputs.rsuVestedAnnual || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, rsuVestedAnnual: Number(e.target.value) || 0 }))}
                      placeholder="e.g. 3,00,000 (Paper equity)"
                      className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] text-[12px] font-mono text-[#171717] dark:text-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dual Regime Recommendation Banner */}
        <div className="p-4 sm:p-5 bg-[#fafafa] dark:bg-[#181818] border-b border-[#ebebeb] dark:border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3] shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#171717] dark:text-white">
                  Optimal Regime Recommendation
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                  analysis.betterRegime === 'NEW' 
                    ? 'bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/20'
                    : analysis.betterRegime === 'OLD'
                    ? 'bg-[#7928ca]/10 text-[#7928ca] border border-[#7928ca]/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                  {analysis.betterRegime} REGIME IS BETTER
                </span>
              </div>
              <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] mt-0.5 leading-relaxed">
                {analysis.recommendationNote}
              </p>
            </div>
          </div>

          {analysis.annualTaxSavings > 0 && (
            <div className="shrink-0 text-left sm:text-right bg-white dark:bg-[#222222] sm:bg-transparent sm:dark:bg-transparent px-3 py-2 sm:p-0 rounded-lg border sm:border-0 border-[#ebebeb] dark:border-[#262626]">
              <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block">You Save</span>
              <span className="text-[16px] font-bold font-mono text-[#10b981]">
                +{formatINR(analysis.annualTaxSavings)}/yr
              </span>
            </div>
          )}
        </div>

        {/* Big In-Hand Take Home Highlight Box & Annual CTC Distribution Box */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border-b border-[#ebebeb] dark:border-[#262626]">
          {/* Main In Hand Metric (7 Cols on desktop) */}
          <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Regime Switch Tabs */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex p-1 rounded-full bg-[#f5f5f5] dark:bg-[#1e1e1e] border border-[#ebebeb] dark:border-[#262626]">
                  <button
                    onClick={() => setSelectedRegime('NEW')}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                      selectedRegime === 'NEW'
                        ? 'bg-white dark:bg-[#121212] text-[#171717] dark:text-white shadow-xs font-semibold'
                        : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white'
                    }`}
                  >
                    New Tax Regime (FY 25-26 & 26-27)
                    {analysis.betterRegime === 'NEW' && (
                      <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#0070f3]" title="Recommended"></span>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedRegime('OLD')}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                      selectedRegime === 'OLD'
                        ? 'bg-white dark:bg-[#121212] text-[#171717] dark:text-white shadow-xs font-semibold'
                        : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white'
                    }`}
                  >
                    Old Tax Regime
                    {analysis.betterRegime === 'OLD' && (
                      <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#7928ca]" title="Recommended"></span>
                    )}
                  </button>
                </div>

                {/* Edit Button with Pen Emoji (shows tooltip text on hover) */}
                <div className="relative group inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => handleScrollToFineTune('deductions')}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-[#181818] hover:bg-[#fafafa] dark:hover:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] hover:border-[#0070f3] dark:hover:border-[#38bdf8] text-[#171717] dark:text-white transition-all shadow-xs cursor-pointer hover:scale-110 active:scale-95 shrink-0"
                    title="Edit Deductions, Bonus & Salary Structure"
                    aria-label="Edit deductions, bonus and salary structure"
                  >
                    <span className="text-[14px] leading-none group-hover:-rotate-12 transition-transform duration-150 select-none" role="img" aria-label="Edit">
                      ✏️
                    </span>
                  </button>

                  {/* Floating Tooltip visible only on hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-30 hidden sm:block whitespace-nowrap">
                    <div className="px-2.5 py-1 text-[11px] font-medium text-white bg-[#171717] dark:bg-white dark:text-[#171717] rounded-md shadow-lg border border-white/10 dark:border-black/10">
                      Edit Deductions &amp; Bonus
                    </div>
                    <div className="w-1.5 h-1.5 bg-[#171717] dark:bg-white rotate-45 mx-auto -mt-1"></div>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[12px] font-mono uppercase text-[#888888] dark:text-[#737373] block mb-1">
                  Net Monthly In-Hand Salary (Credited to Bank)
                </span>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#10b981] font-mono tracking-tight">
                    {formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}
                  </span>
                  <span className="text-xl font-mono text-[#888888] dark:text-[#737373]">/ month</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
                <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Annual Net Pay</span>
                <span className="text-[15px] font-bold font-mono text-[#171717] dark:text-white">
                  {formatINR(activeRegimeData.annualTakeHome)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
                <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Annual Tax</span>
                <span className="text-[15px] font-bold font-mono text-[#ee0000]">
                  {formatINR(activeRegimeData.totalAnnualTax)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
                <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Monthly EPF</span>
                <span className="text-[15px] font-bold font-mono text-[#0070f3]">
                  {formatINR(activeRegimeData.monthlyEmployeePf)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
                <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Effective Tax</span>
                <span className="text-[15px] font-bold font-mono text-[#171717] dark:text-white">
                  {activeRegimeData.effectiveTaxRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right Visual Donut Chart (5 Cols on desktop, properly placed) */}
          <div className="lg:col-span-5 flex flex-col">
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

        {/* Task 1: "Real Cash vs. Paper Money" 3-Card Output Strip */}
        <div className="p-6 sm:p-8 border-b border-[#ebebeb] dark:border-[#262626] bg-[#fafafa]/40 dark:bg-[#181818]/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] font-semibold block">
                Compensation Reality Check
              </span>
              <h3 className="text-[16px] font-semibold text-[#171717] dark:text-white">
                Real Cash vs. Paper Money Breakdown
              </h3>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] text-[#4d4d4d] dark:text-[#a1a1a1]">
              Guaranteed Base: {formatINR(analysis.compensationSplit.guaranteedBaseCtc)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Monthly In-Hand (Real Cash) */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#10b981]/40 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#171717] dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  Monthly In-Hand (Real Cash)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#10b981]/10 text-[#10b981]">
                  Guaranteed
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#10b981]">
                {formatINR(analysis.compensationSplit.monthlyGuaranteedInHand)}
                <span className="text-xs font-normal text-[#888888] dark:text-[#737373]"> /mo</span>
              </div>
              <p className="text-[11px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                Guaranteed cash transferred to your bank every month without relying on performance bonuses.
              </p>
            </div>

            {/* Card 2: Yearly Bonus (Post-Tax Lump Sum) */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#0070f3]/40 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#171717] dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0070f3]"></span>
                  Yearly Bonus (Post-Tax)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0070f3]/10 text-[#0070f3]">
                  Lump Sum
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#0070f3] dark:text-[#38bdf8]">
                {formatINR(analysis.compensationSplit.yearlyBonusNet)}
                <span className="text-xs font-normal text-[#888888] dark:text-[#737373]"> net</span>
              </div>
              <p className="text-[11px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                Estimated post-tax annual payout from ₹{formatINR(analysis.compensationSplit.yearlyBonusGross)} gross variable bonus.
              </p>
            </div>

            {/* Card 3: Paper Equity (Annual ESOPs) */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#7928ca]/40 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#171717] dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#7928ca]"></span>
                  Paper Equity (ESOPs/RSUs)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#7928ca]/10 text-[#7928ca]">
                  Illiquid
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#7928ca] dark:text-[#a855f7]">
                {formatINR(analysis.compensationSplit.annualEsopValue)}
                <span className="text-xs font-normal text-[#888888] dark:text-[#737373]"> /yr</span>
              </div>
              <p className="text-[11px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                Annualized equity grant value subject to 4-year vesting and company liquidity events.
              </p>
            </div>
          </div>
        </div>

        {/* Module 2: Interactive "Where Do You Stand?" Salary Percentile Meter */}
        <PercentileMeter
          annualCtc={inputs.annualCtc}
          salaryInputs={inputs}
          initialExperience={experienceYears}
        />

        {/* Detailed Dual Regime Comparison Matrix */}
        <div className="p-6 sm:p-8 bg-[#fafafa]/50 dark:bg-[#181818]/50 border-b border-[#ebebeb] dark:border-[#262626]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-[#171717] dark:text-white">Tax Comparison</h3>
              <p className="text-[12px] text-[#888888] dark:text-[#737373] font-mono">New vs Old Tax Regime details for your current inputs</p>
            </div>
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[12px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#222222] transition-colors"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSummary ? 'Copied' : 'Copy Summary'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Regime Card */}
            <div className={`p-5 rounded-xl border transition-all ${
              selectedRegime === 'NEW' 
                ? 'bg-white dark:bg-[#121212] border-[#0070f3] shadow-stacked ring-1 ring-[#0070f3]/30' 
                : 'bg-white/70 dark:bg-[#121212]/70 border-[#ebebeb] dark:border-[#262626]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-[#ebebeb] dark:border-[#262626]">
                <div>
                  <h4 className="text-[14px] font-semibold text-[#171717] dark:text-white">New Tax Regime</h4>
                  <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373]">Budget 2024 revised slabs</span>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.betterRegime === 'NEW' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/20">
                      Recommended (+{formatINR(analysis.annualTaxSavings)}/yr)
                    </span>
                  )}
                  {/* Edit Button with Pen Emoji (shows tooltip on hover) */}
                  <div className="relative group/edit inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => handleScrollToFineTune('bonus')}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0070f3]/10 hover:bg-[#0070f3]/20 border border-[#0070f3]/30 hover:border-[#0070f3] text-[#0070f3] transition-all shadow-2xs cursor-pointer hover:scale-110 active:scale-95 shrink-0"
                      title="Edit Bonus & Salary Structure"
                      aria-label="Edit bonus and salary structure"
                    >
                      <span className="text-[12px] leading-none group-hover/edit:-rotate-12 transition-transform duration-150 select-none" role="img" aria-label="Edit">
                        ✏️
                      </span>
                    </button>

                    {/* Floating Tooltip visible only on hover */}
                    <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-1.5 pointer-events-none opacity-0 group-hover/edit:opacity-100 transition-opacity duration-150 z-30 hidden sm:block whitespace-nowrap">
                      <div className="px-2 py-0.5 text-[11px] font-medium text-white bg-[#171717] dark:bg-white dark:text-[#171717] rounded shadow-md">
                        Edit Bonus &amp; Structure
                      </div>
                      <div className="w-1.5 h-1.5 bg-[#171717] dark:bg-white rotate-45 mx-auto -mt-1"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-[13px]">
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Gross Salary</span>
                  <span className="font-mono text-[#171717] dark:text-white">{formatINR(analysis.newRegime.grossAnnualSalary)}</span>
                </div>
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Standard Deduction</span>
                  <span className="font-mono text-[#10b981]">- {formatINR(analysis.newRegime.standardDeduction)}</span>
                </div>
                {analysis.employerNpsAmount > 0 && (
                  <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                    <span>Employer NPS (Sec 80CCD(2))</span>
                    <span className="font-mono text-[#10b981]">- {formatINR(analysis.employerNpsAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Net Taxable Income</span>
                  <span className="font-mono text-[#171717] dark:text-white">{formatINR(analysis.newRegime.netTaxableIncome)}</span>
                </div>
                {analysis.newRegime.sec87aRebate > 0 && (
                  <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                    <span>Section 87A Rebate</span>
                    <span className="font-mono text-[#10b981]">- {formatINR(analysis.newRegime.sec87aRebate)} (100% Tax Free)</span>
                  </div>
                )}
                {analysis.newRegime.marginalRelief > 0 && (
                  <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                    <span>87A Marginal Relief</span>
                    <span className="font-mono text-[#10b981]">- {formatINR(analysis.newRegime.marginalRelief)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Total Annual Income Tax</span>
                  <span className="font-mono font-semibold text-[#ee0000]">{formatINR(analysis.newRegime.totalAnnualTax)}</span>
                </div>
                <div className="pt-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center">
                  <span className="font-semibold text-[#171717] dark:text-white">Monthly In-Hand</span>
                  <span className="text-[17px] font-bold font-mono text-[#10b981]">{formatINR(analysis.newRegime.monthlyTakeHome)}</span>
                </div>
              </div>
            </div>

            {/* Old Regime Card */}
            <div className={`p-5 rounded-xl border transition-all ${
              selectedRegime === 'OLD' 
                ? 'bg-white dark:bg-[#121212] border-[#7928ca] shadow-stacked ring-1 ring-[#7928ca]/30' 
                : 'bg-white/70 dark:bg-[#121212]/70 border-[#ebebeb] dark:border-[#262626]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-[#ebebeb] dark:border-[#262626]">
                <div>
                  <h4 className="text-[14px] font-semibold text-[#171717] dark:text-white">Old Tax Regime</h4>
                  <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373]">With 80C, 80D, HRA & Loan deductions</span>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.betterRegime === 'OLD' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[#7928ca]/10 text-[#7928ca] border border-[#7928ca]/20">
                      Recommended (+{formatINR(analysis.annualTaxSavings)}/yr)
                    </span>
                  )}
                  {/* Edit Button with Pen Emoji (shows tooltip on hover) */}
                  <div className="relative group/edit inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => handleScrollToFineTune('deductions')}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-[#7928ca]/10 hover:bg-[#7928ca]/20 border border-[#7928ca]/30 hover:border-[#7928ca] text-[#7928ca] dark:text-[#a855f7] transition-all shadow-2xs cursor-pointer hover:scale-110 active:scale-95 shrink-0"
                      title="Edit 80C, 80D & HRA Deductions"
                      aria-label="Edit 80C, 80D and HRA deductions"
                    >
                      <span className="text-[12px] leading-none group-hover/edit:-rotate-12 transition-transform duration-150 select-none" role="img" aria-label="Edit">
                        ✏️
                      </span>
                    </button>

                    {/* Floating Tooltip visible only on hover */}
                    <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-1.5 pointer-events-none opacity-0 group-hover/edit:opacity-100 transition-opacity duration-150 z-30 hidden sm:block whitespace-nowrap">
                      <div className="px-2 py-0.5 text-[11px] font-medium text-white bg-[#171717] dark:bg-white dark:text-[#171717] rounded shadow-md">
                        Edit Deductions (80C/80D/HRA)
                      </div>
                      <div className="w-1.5 h-1.5 bg-[#171717] dark:bg-white rotate-45 mx-auto -mt-1"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-[13px]">
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Gross Salary</span>
                  <span className="font-mono text-[#171717] dark:text-white">{formatINR(analysis.oldRegime.grossAnnualSalary)}</span>
                </div>
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Standard Deduction & PT</span>
                  <span className="font-mono text-[#10b981]">- {formatINR(analysis.oldRegime.standardDeduction + analysis.oldRegime.professionalTaxDeduction)}</span>
                </div>
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>HRA Exemption (Sec 10(13A))</span>
                  <span className="font-mono text-[#10b981]">- {formatINR(analysis.oldRegime.hraExemption)}</span>
                </div>
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Chapter VI-A Deductions</span>
                  <span className="font-mono text-[#10b981]">- {formatINR(analysis.oldRegime.chapter6ADeductions)}</span>
                </div>
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Net Taxable Income</span>
                  <span className="font-mono text-[#171717] dark:text-white">{formatINR(analysis.oldRegime.netTaxableIncome)}</span>
                </div>
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Total Annual Income Tax</span>
                  <span className="font-mono font-semibold text-[#ee0000]">{formatINR(analysis.oldRegime.totalAnnualTax)}</span>
                </div>
                <div className="pt-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center">
                  <span className="font-semibold text-[#171717] dark:text-white">Monthly In-Hand</span>
                  <span className="text-[17px] font-bold font-mono text-[#10b981]">{formatINR(analysis.oldRegime.monthlyTakeHome)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configurable Fine-Tuning Tabs */}
        <div id="fine-tune-section" className="p-6 sm:p-8 scroll-mt-6 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#ebebeb] dark:border-[#262626]">
            <div>
              <h3 className="text-[16px] font-semibold text-[#171717] dark:text-white flex items-center gap-2">
                <span>Fine-Tune Deductions, Bonus &amp; Payroll Structure</span>
                <span className="text-[12px] font-normal text-[#888888] dark:text-[#737373]">✏️</span>
              </h3>
              <p className="text-[12px] text-[#888888] dark:text-[#737373] mt-0.5">Customize your HRA, 80C, 80D, home loan, variable bonus, and PF rules</p>
            </div>
            
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab('structure')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'structure' 
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717]' 
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                Salary Split
              </button>
              <button
                onClick={() => setActiveTab('deductions')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'deductions' 
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717]' 
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                Tax Deductions (80C/80D/HRA)
              </button>
              <button
                onClick={() => setActiveTab('epf')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'epf' 
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717]' 
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                EPF & Gratuity
              </button>
              <button
                onClick={() => setActiveTab('bonus')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'bonus' 
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717]' 
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                Bonus & RSUs
              </button>
              <button
                onClick={() => setActiveTab('exit')}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'exit' 
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717]' 
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:bg-[#f5f5f5] dark:hover:bg-[#1e1e1e]'
                }`}
              >
                Exit &amp; Gratuity
              </button>
            </div>
          </div>

          {/* TAB 1: SALARY STRUCTURE */}
          {activeTab === 'structure' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic Salary % */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
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
                  <label className="font-medium text-[#171717] dark:text-white text-[13px] block">Work Location (Professional Tax)</label>
                  <select
                    value={inputs.stateCode}
                    onChange={(e) => setInputs(prev => ({ ...prev, stateCode: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
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
                  <label className="font-medium text-[#171717] dark:text-white text-[13px] block">City Type for HRA</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInputs(prev => ({ ...prev, isMetroCity: true, hraPercent: 50 }))}
                      className={`h-10 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                        inputs.isMetroCity
                          ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] border-[#171717] dark:border-white'
                          : 'bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] border-[#ebebeb] dark:border-[#262626] hover:bg-[#f5f5f5] dark:hover:bg-[#222222]'
                      }`}
                    >
                      Metro (50% HRA)
                    </button>
                    <button
                      onClick={() => setInputs(prev => ({ ...prev, isMetroCity: false, hraPercent: 40 }))}
                      className={`h-10 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                        !inputs.isMetroCity
                          ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] border-[#171717] dark:border-white'
                          : 'bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] border-[#ebebeb] dark:border-[#262626] hover:bg-[#f5f5f5] dark:hover:bg-[#222222]'
                      }`}
                    >
                      Non-Metro (40% HRA)
                    </button>
                  </div>
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">Metros: Mumbai, Delhi, Kolkata, Chennai.</p>
                </div>
              </div>

              {/* Task 2: Section 80CCD(2) Employer NPS Restructuring in Structure Tab */}
              <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                      <span className="text-[13px] font-semibold text-[#171717] dark:text-white">
                        Corporate NPS Restructuring (Section 80CCD(2))
                      </span>
                      {analysis.npsTaxSavingsAnnual > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20">
                          Saves {formatINR(analysis.npsTaxSavingsAnnual)} in annual income tax
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1]">
                      Employer contribution to your NPS account. 100% tax-deductible in <strong>both New and Old Regimes</strong>.
                    </p>
                  </div>

                  {/* 0% / 10% / 14% Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {[0, 10, 14].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, employerNpsPercent: pct }))}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-mono font-medium transition-all cursor-pointer ${
                          inputs.employerNpsPercent === pct
                            ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                            : 'bg-white dark:bg-[#121212] text-[#4d4d4d] dark:text-[#a1a1a1] border border-[#ebebeb] dark:border-[#262626] hover:text-[#171717] dark:hover:text-white'
                        }`}
                      >
                        {pct === 0 ? 'Disabled (0%)' : `${pct}% of Basic`}
                      </button>
                    ))}
                  </div>
                </div>

                {inputs.employerNpsPercent > 0 && (
                  <div className="flex justify-between items-center text-[12px] font-mono pt-1 border-t border-[#ebebeb] dark:border-[#262626]">
                    <span className="text-[#888888] dark:text-[#737373]">
                      Annual Employer NPS Contribution ({inputs.employerNpsPercent}% of {formatINR(analysis.basicAnnual)} Basic):
                    </span>
                    <span className="text-[#10b981] font-bold">
                      {formatINR(analysis.employerNpsAmount)}/yr
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DEDUCTIONS */}
          {activeTab === 'deductions' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Annual Rent Paid (HRA) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <label className="font-medium text-[#171717] dark:text-white">Annual Rent Paid (HRA)</label>
                    <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.annualRentPaid)}</span>
                  </div>
                  <input
                    type="number"
                    value={inputs.annualRentPaid || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, annualRentPaid: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 240000 (₹20k/mo)"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                  />
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">
                    Eligible HRA Exemption: {formatINR(analysis.oldRegime.hraExemption)} in Old Regime.
                  </p>
                </div>

                {/* Section 80C Investments */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <label className="font-medium text-[#171717] dark:text-white">Section 80C Investments</label>
                    <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec80C_Investments)}</span>
                  </div>
                  <input
                    type="number"
                    max={150000}
                    value={inputs.sec80C_Investments || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, sec80C_Investments: Math.min(150000, Number(e.target.value) || 0) }))}
                    placeholder="PPF, ELSS, LIC, Home Principal"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                  />
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">
                    Max ₹1.5L (Employee PF of {formatINR(analysis.employeePfAnnual)} is auto-included).
                  </p>
                </div>

                {/* Section 80D Health Insurance (Self/Family) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <label className="font-medium text-[#171717] dark:text-white">Section 80D (Self & Family)</label>
                    <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec80D_SelfFamily)}</span>
                  </div>
                  <input
                    type="number"
                    max={25000}
                    value={inputs.sec80D_SelfFamily || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, sec80D_SelfFamily: Math.min(25000, Number(e.target.value) || 0) }))}
                    placeholder="Max ₹25,000"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                  />
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">Mediclaim premiums for self, spouse & dependent children.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Section 80D Parents */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <label className="font-medium text-[#171717] dark:text-white">Section 80D (Parents Insurance)</label>
                    <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec80D_Parents)}</span>
                  </div>
                  <input
                    type="number"
                    max={inputs.sec80D_ParentsSenior ? 50000 : 25000}
                    value={inputs.sec80D_Parents || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, sec80D_Parents: Number(e.target.value) || 0 }))}
                    placeholder="₹25k (₹50k for Senior)"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                  />
                  <label className="flex items-center gap-2 text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={inputs.sec80D_ParentsSenior}
                      onChange={(e) => setInputs(prev => ({ ...prev, sec80D_ParentsSenior: e.target.checked }))}
                      className="rounded text-[#171717] dark:text-white"
                    />
                    <span>Parents are Senior Citizens (&gt; 60 yrs, cap ₹50,000)</span>
                  </label>
                </div>

                {/* Section 80CCD(1B) NPS */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <label className="font-medium text-[#171717] dark:text-white">Section 80CCD(1B) Self NPS</label>
                    <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec80CCD1B_NPS)}</span>
                  </div>
                  <input
                    type="number"
                    max={50000}
                    value={inputs.sec80CCD1B_NPS || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, sec80CCD1B_NPS: Math.min(50000, Number(e.target.value) || 0) }))}
                    placeholder="Max ₹50,000"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                  />
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">Self voluntary NPS deduction over and above ₹1.5L 80C.</p>
                </div>

                {/* Section 24 Home Loan Interest */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <label className="font-medium text-[#171717] dark:text-white">Home Loan Interest (Sec 24)</label>
                    <span className="font-mono font-semibold text-[#171717] dark:text-white">{formatINR(inputs.sec24_HomeLoanInterest)}</span>
                  </div>
                  <input
                    type="number"
                    max={200000}
                    value={inputs.sec24_HomeLoanInterest || ''}
                    onChange={(e) => setInputs(prev => ({ ...prev, sec24_HomeLoanInterest: Math.min(200000, Number(e.target.value) || 0) }))}
                    placeholder="Max ₹2,00,000"
                    className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                  />
                  <p className="text-[11px] text-[#888888] dark:text-[#737373]">Interest paid on self-occupied housing loan.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EPF & GRATUITY */}
          {activeTab === 'epf' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
              {/* EPF Capping */}
              <div className="p-4 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#171717] dark:text-white text-[13px]">EPF Statutory Cap Mode</label>
                  <input
                    type="checkbox"
                    checked={inputs.epfCapped}
                    onChange={(e) => setInputs(prev => ({ ...prev, epfCapped: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#171717]"
                  />
                </div>
                <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                  {inputs.epfCapped 
                    ? 'Capped at statutory ₹1,800/month (₹21,600/year). Maximizes immediate in-hand cash flow.'
                    : '12% of actual basic salary (uncapped). Standard for most software & tech companies.'}
                </p>
                <div className="text-[12px] font-mono text-[#171717] dark:text-white font-semibold">
                  Employee PF: {formatINR(analysis.newRegime.monthlyEmployeePf)}/mo
                </div>
              </div>

              {/* Employer PF inside CTC */}
              <div className="p-4 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#171717] dark:text-white text-[13px]">Employer PF inside CTC</label>
                  <input
                    type="checkbox"
                    checked={inputs.employerPfInCtc}
                    onChange={(e) => setInputs(prev => ({ ...prev, employerPfInCtc: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#171717]"
                  />
                </div>
                <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                  {inputs.employerPfInCtc
                    ? 'Employer 12% contribution is subtracted from CTC to compute gross pay (standard private practice).'
                    : 'Employer PF is paid on-top of your stated CTC.'}
                </p>
                <div className="text-[12px] font-mono text-[#171717] dark:text-white font-semibold">
                  Employer PF: {formatINR(analysis.employerPfAnnual)}/yr
                </div>
              </div>

              {/* Gratuity */}
              <div className="p-4 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#171717] dark:text-white text-[13px]">Gratuity inside CTC (15/26)</label>
                  <input
                    type="checkbox"
                    checked={inputs.includeGratuity}
                    onChange={(e) => setInputs(prev => ({ ...prev, includeGratuity: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#171717]"
                  />
                </div>
                <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                  {inputs.includeGratuity
                    ? 'Company deducts ~4.81% of basic salary as statutory gratuity provision inside CTC.'
                    : 'No gratuity deduction included in CTC.'}
                </p>
                <div className="text-[12px] font-mono text-[#171717] dark:text-white font-semibold">
                  Gratuity Provision: {formatINR(analysis.gratuityAnnual)}/yr
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BONUS & RSUS */}
          {activeTab === 'bonus' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
              {/* Annual Variable Bonus */}
              <div className="space-y-2">
                <label className="font-medium text-[#171717] dark:text-white text-[13px] block">Annual Variable Bonus</label>
                <input
                  type="number"
                  value={inputs.variableBonusAnnual || ''}
                  onChange={(e) => setInputs(prev => ({ ...prev, variableBonusAnnual: Number(e.target.value) || 0 }))}
                  placeholder="e.g. 150000"
                  className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                />
                <p className="text-[11px] text-[#888888] dark:text-[#737373]">Performance linked variable pay paid annually.</p>
              </div>

              {/* Joining / Sign-on Bonus */}
              <div className="space-y-2">
                <label className="font-medium text-[#171717] dark:text-white text-[13px] block">Joining / Relocation Bonus</label>
                <input
                  type="number"
                  value={inputs.joiningBonusAnnual || ''}
                  onChange={(e) => setInputs(prev => ({ ...prev, joiningBonusAnnual: Number(e.target.value) || 0 }))}
                  placeholder="e.g. 200000"
                  className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                />
                <p className="text-[11px] text-[#888888] dark:text-[#737373]">One-time sign-on bonus subject to slab TDS.</p>
              </div>

              {/* RSU / ESOP Vested */}
              <div className="space-y-2">
                <label className="font-medium text-[#171717] dark:text-white text-[13px] block">Annual ESOP / Stock Grants</label>
                <input
                  type="number"
                  value={inputs.rsuVestedAnnual || ''}
                  onChange={(e) => setInputs(prev => ({ ...prev, rsuVestedAnnual: Number(e.target.value) || 0 }))}
                  placeholder="e.g. 500000"
                  className="w-full h-10 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                />
                <p className="text-[11px] text-[#888888] dark:text-[#737373]">Annualized stock grant value.</p>
              </div>
            </div>
          )}

          {/* TAB 5: EXIT & GRATUITY */}
          {activeTab === 'exit' && (
            <div className="animate-in fade-in duration-200">
              <ExitGratuityCalculator
                monthlyBasicSalary={analysis.basicAnnual / 12}
                monthlyGrossSalary={analysis.monthlyGross}
                annualCtc={inputs.annualCtc}
              />
            </div>
          )}
        </div>
      </div>

      {/* Module 3: Standalone Exit Settlement & Gratuity Calculator Card */}
      <ExitGratuityCalculator
        monthlyBasicSalary={analysis.basicAnnual / 12}
        monthlyGrossSalary={analysis.monthlyGross}
        annualCtc={inputs.annualCtc}
      />

      {/* Financial Health & Wealth Blueprint */}
      <FinancialBlueprint
        monthlyTakeHome={activeRegimeData.monthlyTakeHome}
        annualCtc={inputs.annualCtc}
        epfMonthly={activeRegimeData.monthlyEmployeePf}
      />

      {/* Salary Slip Modal */}
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
