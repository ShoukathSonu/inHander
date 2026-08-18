import React, { useState, useMemo } from 'react';
import { calculateNewRegimeTax, calculateOldRegimeTax } from '../lib/taxEngine';
import { formatINR } from '../lib/formatters';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export const FreelanceCalculator: React.FC = () => {
  const [grossInvoicing, setGrossInvoicing] = useState<number>(2400000); // 24 LPA gross receipts
  const [isExportService, setIsExportService] = useState<boolean>(true); // US / EU clients (LUT)
  const [selectedRegime, setSelectedRegime] = useState<'NEW' | 'OLD'>('NEW');

  // Section 44ADA: 50% of gross turnover is considered taxable profit
  const presumedTaxableProfit = useMemo(() => {
    return Math.round(grossInvoicing * 0.50);
  }, [grossInvoicing]);

  const newTax = useMemo(() => calculateNewRegimeTax(presumedTaxableProfit), [presumedTaxableProfit]);
  const oldTax = useMemo(() => calculateOldRegimeTax(presumedTaxableProfit), [presumedTaxableProfit]);

  const activeTax = selectedRegime === 'NEW' ? newTax.totalTax : oldTax.totalTax;
  const netTakeHome = grossInvoicing - activeTax;
  const monthlyNet = Math.round(netTakeHome / 12);
  const effectiveTaxRate = grossInvoicing > 0 ? (activeTax / grossInvoicing) * 100 : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 sm:p-8 border border-[#ebebeb] dark:border-[#262626] shadow-stacked space-y-8 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#171717] dark:bg-white text-white dark:text-[#171717]">
              Section 44ADA Presumptive Taxation
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] dark:text-white tracking-tight mt-1">
            Freelancer & Consultant Tax Calculator.
          </h2>
          <p className="text-[14px] text-[#4d4d4d] dark:text-[#a1a1a1] mt-1 max-w-2xl">
            For Indian software engineers, remote contractors, tech consultants, and agency owners billing Indian or overseas clients.
          </p>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[13px]">
              <label className="font-semibold text-[#171717] dark:text-white">Annual Invoicing / Gross Receipts</label>
              <span className="font-mono font-bold text-[#171717] dark:text-white text-[15px]">{formatINR(grossInvoicing)}</span>
            </div>
            <input
              type="range"
              min={300000}
              max={7500000}
              step={50000}
              value={grossInvoicing}
              onChange={(e) => setGrossInvoicing(Number(e.target.value))}
              className="w-full h-2 bg-[#ebebeb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-[#888888] dark:text-[#737373]">
              <span>₹3 LPA</span>
              <span>₹75 LPA (44ADA Ceiling)</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="font-semibold text-[#171717] dark:text-white text-[13px] block">Client Location / GST LUT Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsExportService(true)}
                className={`h-10 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                  isExportService
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] border-[#171717] dark:border-white'
                    : 'bg-white dark:bg-[#121212] text-[#4d4d4d] dark:text-[#a1a1a1] border-[#ebebeb] dark:border-[#262626]'
                }`}
              >
                Foreign Client (0% GST LUT)
              </button>
              <button
                onClick={() => setIsExportService(false)}
                className={`h-10 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                  !isExportService
                    ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] border-[#171717] dark:border-white'
                    : 'bg-white dark:bg-[#121212] text-[#4d4d4d] dark:text-[#a1a1a1] border-[#ebebeb] dark:border-[#262626]'
                }`}
              >
                Indian Clients (18% GST)
              </button>
            </div>
            <p className="text-[11px] text-[#888888] dark:text-[#737373]">
              {isExportService 
                ? 'Export of services with Letter of Undertaking (LUT) is zero-rated under GST.' 
                : 'Domestic clients require 18% GST invoicing if turnover exceeds ₹20 Lakhs.'}
            </p>
          </div>
        </div>

        {/* 44ADA Calculation Summary Hero */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ebebeb] dark:border-[#262626]">
            <div>
              <span className="text-[12px] font-mono uppercase text-[#888888] dark:text-[#737373] block">
                Net Take-Home Cash Flow
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-bold font-mono text-[#10b981]">
                  {formatINR(monthlyNet)}
                </span>
                <span className="text-lg font-mono text-[#888888] dark:text-[#737373]">/ month</span>
              </div>
            </div>

            {/* Regime switch */}
            <div className="inline-flex p-1 rounded-full bg-[#f0f0f0] dark:bg-[#262626] border border-[#ebebeb] dark:border-[#333333]">
              <button
                onClick={() => setSelectedRegime('NEW')}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                  selectedRegime === 'NEW'
                    ? 'bg-white dark:bg-[#121212] text-[#171717] dark:text-white shadow-xs font-semibold'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1]'
                }`}
              >
                New Regime (Recommended)
              </button>
              <button
                onClick={() => setSelectedRegime('OLD')}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                  selectedRegime === 'OLD'
                    ? 'bg-white dark:bg-[#121212] text-[#171717] dark:text-white shadow-xs font-semibold'
                    : 'text-[#4d4d4d] dark:text-[#a1a1a1]'
                }`}
              >
                Old Regime
              </button>
            </div>
          </div>

          {/* 44ADA breakdown 3-column stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#ebebeb] dark:border-[#262626]">
              <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">50% Deemed Profit</span>
              <span className="text-xl font-bold font-mono text-[#171717] dark:text-white block mt-1">
                {formatINR(presumedTaxableProfit)}
              </span>
              <p className="text-[11px] text-[#888888] dark:text-[#737373] mt-1">Only 50% of revenue is taxed. No expense receipts needed.</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#ebebeb] dark:border-[#262626]">
              <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Total Income Tax</span>
              <span className="text-xl font-bold font-mono text-[#ee0000] block mt-1">
                {formatINR(activeTax)}
              </span>
              <p className="text-[11px] text-[#888888] dark:text-[#737373] mt-1">Effective tax is only {effectiveTaxRate.toFixed(1)}% of total revenue.</p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#ebebeb] dark:border-[#262626]">
              <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Annual Take-Home</span>
              <span className="text-xl font-bold font-mono text-[#10b981] block mt-1">
                {formatINR(netTakeHome)}
              </span>
              <p className="text-[11px] text-[#888888] dark:text-[#737373] mt-1">Net bank balance retained after all tax TDS/Advance tax.</p>
            </div>
          </div>

          {/* 44ADA Compliance Highlights */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-[#ebebeb] dark:border-[#262626] space-y-2 text-[12px]">
            <div className="flex items-center gap-2 text-[#10b981] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Section 44ADA Benefits Checklist for Tech Freelancers</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#4d4d4d] dark:text-[#a1a1a1] pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Zero book-keeping / CA audit required up to ₹75 Lakhs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Pay 100% advance tax in 1 installment by 15th March</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Eligible for ITR-4 filing in under 15 minutes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Up to ₹20 Lakhs turnover requires no GST registration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
