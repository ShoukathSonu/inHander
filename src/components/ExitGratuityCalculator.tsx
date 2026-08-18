import React, { useState, useMemo } from 'react';
import { formatINR } from '../lib/formatters';
import { 
  Building2, 
  Calendar, 
  Clock, 
  HelpCircle, 
  ShieldCheck, 
  AlertCircle, 
  DollarSign, 
  ArrowRight, 
  Briefcase,
  FileSpreadsheet,
  Check,
  Sparkles,
  Info
} from 'lucide-react';

interface ExitGratuityCalculatorProps {
  monthlyBasicSalary: number;
  monthlyGrossSalary: number;
  annualCtc: number;
}

export const ExitGratuityCalculator: React.FC<ExitGratuityCalculatorProps> = ({
  monthlyBasicSalary,
  monthlyGrossSalary,
  annualCtc
}) => {
  // Gratuity states
  const [serviceYears, setServiceYears] = useState<number>(5);
  const [customBasic, setCustomBasic] = useState<number | null>(null);
  const [isCustomBasicActive, setIsCustomBasicActive] = useState<boolean>(false);

  // Notice Period states
  const [noticePeriodDays, setNoticePeriodDays] = useState<number>(90);
  const [unservedDays, setUnservedDays] = useState<number>(0);
  const [buyoutMode, setBuyoutMode] = useState<'recovery' | 'paid_by_company'>('recovery');

  // Leave Encashment states (optional settlement component)
  const [unavailedLeaves, setUnavailedLeaves] = useState<number>(0);

  // Computed Basic Salary
  const activeBasicMonthly = isCustomBasicActive && customBasic !== null ? customBasic : monthlyBasicSalary;

  // Gratuity calculation: (15 * Monthly Basic * Years) / 26
  const isGratuityEligible = serviceYears >= 5;
  const gratuityRawAmount = isGratuityEligible
    ? Math.round((15 * activeBasicMonthly * serviceYears) / 26)
    : 0;

  // Section 10(10) exemption limit for private sector employees: ₹20,00,000 (20 Lakhs)
  const GRATUITY_EXEMPTION_LIMIT = 2000000;
  const gratuityTaxExemptAmount = Math.min(gratuityRawAmount, GRATUITY_EXEMPTION_LIMIT);
  const gratuityTaxableAmount = Math.max(0, gratuityRawAmount - GRATUITY_EXEMPTION_LIMIT);

  // Notice Period buyout: (Monthly Gross / 30) * Unserved Days
  const perDayGrossSalary = monthlyGrossSalary / 30;
  const noticeAdjustmentAmount = Math.round(perDayGrossSalary * Math.max(0, unservedDays));

  // Leave Encashment: (Monthly Basic / 30) * Unavailed Leaves (standard Indian corporate practice)
  const perDayBasic = activeBasicMonthly / 30;
  const leaveEncashmentAmount = Math.round(perDayBasic * Math.max(0, unavailedLeaves));

  // Net Terminal Settlement Calculation
  // In recovery mode: Settlement = Gratuity + Leaves - Notice Recovery
  // In company buyout mode: Settlement = Gratuity + Leaves + Notice Pay
  const netTerminalSettlement = useMemo(() => {
    let total = gratuityRawAmount + leaveEncashmentAmount;
    if (buyoutMode === 'recovery') {
      total -= noticeAdjustmentAmount;
    } else {
      total += noticeAdjustmentAmount;
    }
    return total;
  }, [gratuityRawAmount, leaveEncashmentAmount, noticeAdjustmentAmount, buyoutMode]);

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-[#ebebeb] dark:border-[#262626] shadow-stacked overflow-hidden transition-colors space-y-0">
      {/* Module Header */}
      <div className="p-6 sm:p-7 border-b border-[#ebebeb] dark:border-[#262626] bg-[#fafafa]/50 dark:bg-[#181818]/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#10b981]/10 text-[#10b981]">
                <Briefcase className="w-4 h-4" />
              </span>
              <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#171717] dark:text-white tracking-tight">
                Exit Settlement &amp; Gratuity Calculator
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                Payment of Gratuity Act 1972
              </span>
            </div>
            <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1]">
              Calculate statutory gratuity payout, notice period shortfall recovery/buyout, and net full &amp; final (F&amp;F) settlement upon resignation.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Interactive Calculation Modules */}
        <div className="lg:col-span-7 space-y-6">
          {/* SUB-MODULE A: GRATUITY CALCULATION */}
          <div className="p-5 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#171717] dark:text-white">
                  1. Statutory Gratuity Payout
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] text-[#4d4d4d] dark:text-[#a1a1a1]">
                  (15 × Basic × Years) / 26
                </span>
              </div>
              {isGratuityEligible ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full border border-[#10b981]/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> Eligible (≥ 5 Yrs)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[#f5a623] bg-[#f5a623]/10 px-2 py-0.5 rounded-full border border-[#f5a623]/20">
                  <AlertCircle className="w-3.5 h-3.5" /> &lt; 5 Yrs (No Gratuity)
                </span>
              )}
            </div>

            {/* Inputs: Years of Service & Monthly Basic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Continuous Service Years */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="font-medium text-[#171717] dark:text-white">Continuous Service</label>
                  <span className="font-mono font-bold text-[#0070f3] dark:text-[#38bdf8]">
                    {serviceYears} {serviceYears === 1 ? 'Year' : 'Years'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={35}
                  step={1}
                  value={serviceYears}
                  onChange={(e) => setServiceYears(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#ebebeb] dark:bg-[#2c2c2c] rounded-lg appearance-none cursor-pointer accent-[#0070f3]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#888888] dark:text-[#737373]">
                  <span>0y</span>
                  <span>5y (Threshold)</span>
                  <span>15y</span>
                  <span>35y</span>
                </div>
              </div>

              {/* Monthly Basic Salary */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="font-medium text-[#171717] dark:text-white">Last Drawn Basic/mo</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomBasicActive(!isCustomBasicActive);
                      if (!isCustomBasicActive && customBasic === null) {
                        setCustomBasic(monthlyBasicSalary);
                      }
                    }}
                    className="text-[10px] font-mono text-[#0070f3] dark:text-[#38bdf8] hover:underline cursor-pointer"
                  >
                    {isCustomBasicActive ? 'Reset to CTC Auto' : 'Customize'}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[13px] font-mono text-[#888888] dark:text-[#737373]">₹</span>
                  <input
                    type="number"
                    value={activeBasicMonthly || ''}
                    disabled={!isCustomBasicActive}
                    onChange={(e) => setCustomBasic(Number(e.target.value) || 0)}
                    placeholder="Monthly basic"
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[13px] font-mono text-[#171717] dark:text-white disabled:opacity-75 focus:outline-hidden focus:border-[#0070f3]"
                  />
                </div>
                <p className="text-[10px] text-[#888888] dark:text-[#737373]">
                  Auto-populated from 50% Basic CTC breakdown ({formatINR(monthlyBasicSalary)}/mo).
                </p>
              </div>
            </div>

            {/* Gratuity Result Preview Pill */}
            <div className="pt-2 border-t border-[#ebebeb] dark:border-[#262626] flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1]">Gross Gratuity Entitlement:</span>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold font-mono text-[#10b981]">
                  {formatINR(gratuityRawAmount)}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981]">
                  {gratuityRawAmount <= GRATUITY_EXEMPTION_LIMIT 
                    ? '100% Tax-Free (Sec 10(10))' 
                    : `₹20L Tax-Free + ${formatINR(gratuityTaxableAmount)} Taxable`}
                </span>
              </div>
            </div>
          </div>

          {/* SUB-MODULE B: NOTICE PERIOD BUYOUT & RECOVERY */}
          <div className="p-5 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#171717] dark:text-white">
                2. Notice Period Adjustment
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] text-[#4d4d4d] dark:text-[#a1a1a1]">
                (Monthly Gross / 30) × Unserved Days
              </span>
            </div>

            {/* Mode selection toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-white dark:bg-[#121212] rounded-lg border border-[#ebebeb] dark:border-[#262626]">
              <button
                type="button"
                onClick={() => setBuyoutMode('recovery')}
                className={`py-1.5 px-3 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                  buyoutMode === 'recovery'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white'
                }`}
              >
                Early Resignation Recovery (Deduction)
              </button>
              <button
                type="button"
                onClick={() => setBuyoutMode('paid_by_company')}
                className={`py-1.5 px-3 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                  buyoutMode === 'paid_by_company'
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] shadow-xs'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white'
                }`}
              >
                Notice Period Buyout (Payout by Co.)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Notice Period */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#171717] dark:text-white block">
                  Mandated Notice Period
                </label>
                <select
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[13px] text-[#171717] dark:text-white focus:outline-hidden"
                >
                  <option value={30}>30 Days (1 Month)</option>
                  <option value={60}>60 Days (2 Months)</option>
                  <option value={90}>90 Days (3 Months standard)</option>
                </select>
              </div>

              {/* Unserved Shortfall Days */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[12px]">
                  <label className="font-medium text-[#171717] dark:text-white">Unserved / Shortfall Days</label>
                  <span className="font-mono font-bold text-[#171717] dark:text-white">{unservedDays} Days</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={noticePeriodDays}
                  value={unservedDays}
                  onChange={(e) => setUnservedDays(Math.min(noticePeriodDays, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-full h-9 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[13px] font-mono text-[#171717] dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Notice Adjustment Preview */}
            <div className="pt-2 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center">
              <span className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1]">
                {buyoutMode === 'recovery' ? 'Notice Shortfall Deduction:' : 'Notice Buyout Credit:'}
              </span>
              <span className={`text-[14px] font-mono font-bold ${
                buyoutMode === 'recovery' ? 'text-[#ee0000]' : 'text-[#10b981]'
              }`}>
                {buyoutMode === 'recovery' ? '-' : '+'} {formatINR(noticeAdjustmentAmount)}
              </span>
            </div>
          </div>

          {/* SUB-MODULE C: LEAVE ENCASHMENT (BONUS) */}
          <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[13px] font-semibold text-[#171717] dark:text-white block">
                3. Earned Leave (EL) Encashment
              </span>
              <span className="text-[11px] text-[#888888] dark:text-[#737373]">
                Unavailed paid leaves paid out on basic per-day rate
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={unavailedLeaves}
                  onChange={(e) => setUnavailedLeaves(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-16 h-8 px-2 rounded border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[12px] font-mono text-center"
                />
                <span className="text-[12px] text-[#888888] dark:text-[#737373]">Days</span>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#10b981]">
                +{formatINR(leaveEncashmentAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Net Terminal Settlement Summary Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] shadow-stacked-sm space-y-5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] font-semibold block">
                Final Settlement Statement
              </span>
              <h4 className="text-[18px] font-bold text-[#171717] dark:text-white tracking-tight mt-0.5">
                Net Resignation Payout
              </h4>
            </div>

            {/* Big Headline Number */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#ebebeb] dark:border-[#262626] space-y-1">
              <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373] block">
                Estimated Net Cash Credit
              </span>
              <div className="text-3xl font-bold font-mono tracking-tight text-[#10b981]">
                {formatINR(Math.max(0, netTerminalSettlement))}
              </div>
              {netTerminalSettlement < 0 && (
                <span className="text-[11px] font-mono text-[#ee0000] block">
                  (Shortfall payable to employer: {formatINR(Math.abs(netTerminalSettlement))})
                </span>
              )}
            </div>

            {/* Itemized Line Items */}
            <div className="space-y-2.5 text-[13px] pt-1">
              <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                <span>Statutory Gratuity ({serviceYears} yrs)</span>
                <span className="font-mono font-semibold text-[#171717] dark:text-white">
                  {formatINR(gratuityRawAmount)}
                </span>
              </div>

              <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                <span>Leave Encashment ({unavailedLeaves} days)</span>
                <span className="font-mono text-[#10b981]">
                  +{formatINR(leaveEncashmentAmount)}
                </span>
              </div>

              <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                <span>
                  Notice {buyoutMode === 'recovery' ? 'Shortfall Recovery' : 'Buyout Pay'} ({unservedDays}d)
                </span>
                <span className={`font-mono ${buyoutMode === 'recovery' ? 'text-[#ee0000]' : 'text-[#10b981]'}`}>
                  {buyoutMode === 'recovery' ? '-' : '+'} {formatINR(noticeAdjustmentAmount)}
                </span>
              </div>

              <div className="pt-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center">
                <span className="font-semibold text-[#171717] dark:text-white text-[14px]">Net Terminal Cash</span>
                <span className="text-[16px] font-bold font-mono text-[#10b981]">
                  {formatINR(netTerminalSettlement)}
                </span>
              </div>
            </div>

            {/* Regulatory & Tax Note */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#121212] border border-[#ebebeb] dark:border-[#262626] text-[11px] text-[#737373] dark:text-[#a1a1a1] space-y-1">
              <div className="font-semibold text-[#171717] dark:text-white flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-[#0070f3]" />
                Tax Rules on Exit (Section 10(10))
              </div>
              <p className="leading-relaxed">
                Gratuity is 100% tax-free up to ₹20,00,000 for continuous service ≥ 5 years. Leave encashment upon resignation is exempt up to ₹25,00,000 under Section 10(10AA).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
