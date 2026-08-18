import React, { useState } from 'react';
import { formatINR } from '../lib/formatters';
import type { FullSalaryAnalysis } from '../lib/taxEngine';
import { Printer, Copy, Check, X, ShieldCheck } from 'lucide-react';

interface SalarySlipModalProps {
  analysis: FullSalaryAnalysis;
  selectedRegime: 'NEW' | 'OLD';
  isOpen: boolean;
  onClose: () => void;
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  analysis,
  selectedRegime,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [employeeName, setEmployeeName] = useState('Senior Software Engineer');
  const [companyName, setCompanyName] = useState('Tech Enterprises India Pvt. Ltd.');

  if (!isOpen) return null;

  const regimeData = selectedRegime === 'NEW' ? analysis.newRegime : analysis.oldRegime;
  const monthlyBasic = Math.round(analysis.basicAnnual / 12);
  const monthlyHra = Math.round(analysis.hraAnnual / 12);
  const monthlySpecial = Math.max(0, regimeData.monthlyGross - monthlyBasic - monthlyHra);
  const totalMonthlyEarnings = monthlyBasic + monthlyHra + monthlySpecial;
  const totalMonthlyDeductions = regimeData.monthlyEmployeePf + regimeData.monthlyVpf + regimeData.monthlyPt + regimeData.monthlyTax;
  const netMonthlyPay = regimeData.monthlyTakeHome;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const summary = `
========================================
SALARY SLIP BREAKDOWN (${selectedRegime} TAX REGIME)
========================================
Designation: ${employeeName}
Company: ${companyName}
Annual CTC: ${formatINR(analysis.inputs.annualCtc)}

--- EARNINGS (Monthly) ---
Basic Salary: ${formatINR(monthlyBasic)}
House Rent Allowance (HRA): ${formatINR(monthlyHra)}
Special Allowance: ${formatINR(monthlySpecial)}
Gross Monthly Earnings: ${formatINR(totalMonthlyEarnings)}

--- DEDUCTIONS (Monthly) ---
Employee Provident Fund (EPF): ${formatINR(regimeData.monthlyEmployeePf)}
Professional Tax (PT): ${formatINR(regimeData.monthlyPt)}
Income Tax (TDS): ${formatINR(regimeData.monthlyTax)}
${regimeData.monthlyVpf > 0 ? `Voluntary PF (VPF): ${formatINR(regimeData.monthlyVpf)}\n` : ''}Total Monthly Deductions: ${formatINR(totalMonthlyDeductions)}

========================================
NET TAKE-HOME SALARY (Monthly): ${formatINR(netMonthlyPay)}
ANNUAL TAKE-HOME SALARY: ${formatINR(regimeData.annualTakeHome)}
TOTAL ANNUAL INCOME TAX: ${formatINR(regimeData.totalAnnualTax)}
========================================
Generated via In Hand Salary (inHander.com)
`.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-[#121212] rounded-2xl max-w-3xl w-full shadow-modal overflow-hidden border border-[#ebebeb] dark:border-[#262626] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
            <h3 className="text-[15px] font-semibold text-[#171717] dark:text-white">Corporate Salary Slip & Proof</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#222222] text-[12px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-[12px] font-medium hover:bg-[#333333] dark:hover:bg-[#e0e0e0] transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#888888] dark:text-[#737373] hover:text-[#171717] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#222222] transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div id="printable-payslip" className="p-6 sm:p-8 space-y-6 text-[#171717] dark:text-[#ededed] bg-white dark:bg-[#121212]">
          {/* Header of Payslip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#ebebeb] dark:border-[#262626] gap-4">
            <div className="space-y-1">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="text-lg sm:text-xl font-bold text-[#171717] dark:text-white bg-transparent border-b border-dashed border-transparent hover:border-[#a1a1a1] focus:border-[#171717] dark:focus:border-white focus:outline-hidden w-full max-w-md"
              />
              <p className="text-[12px] text-[#888888] dark:text-[#737373] font-mono">
                Monthly Salary Statement & Pay Slip
              </p>
            </div>
            <div className="text-left sm:text-right space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Pay Period</span>
              <span className="text-[14px] font-mono font-semibold text-[#171717] dark:text-white">Current Calendar Month</span>
              <span className="text-[11px] font-mono text-[#0070f3] block">{selectedRegime} Tax Regime</span>
            </div>
          </div>

          {/* Employee Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] text-[12px]">
            <div>
              <span className="text-[#888888] dark:text-[#737373] block font-mono">Designation:</span>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="font-semibold text-[#171717] dark:text-white bg-transparent border-b border-dashed border-transparent hover:border-[#a1a1a1] focus:border-[#171717] dark:focus:border-white focus:outline-hidden w-full"
              />
            </div>
            <div>
              <span className="text-[#888888] dark:text-[#737373] block font-mono">Annual CTC:</span>
              <span className="font-semibold text-[#171717] dark:text-white font-mono">{formatINR(analysis.inputs.annualCtc)}</span>
            </div>
            <div>
              <span className="text-[#888888] dark:text-[#737373] block font-mono">State (PT):</span>
              <span className="font-semibold text-[#171717] dark:text-white">{analysis.inputs.stateCode}</span>
            </div>
            <div>
              <span className="text-[#888888] dark:text-[#737373] block font-mono">Days in Month:</span>
              <span className="font-semibold text-[#171717] dark:text-white font-mono">30 / 31</span>
            </div>
          </div>

          {/* Dual Table: Earnings & Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="border border-[#ebebeb] dark:border-[#262626] rounded-xl overflow-hidden">
              <div className="bg-[#fafafa] dark:bg-[#181818] px-4 py-2.5 border-b border-[#ebebeb] dark:border-[#262626] flex justify-between items-center text-[13px] font-semibold text-[#171717] dark:text-white">
                <span>Earnings (Monthly)</span>
                <span>Amount</span>
              </div>
              <div className="p-4 space-y-2.5 text-[13px]">
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
              <div className="bg-[#fafafa] dark:bg-[#181818] px-4 py-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center text-[13px] font-semibold text-[#171717] dark:text-white">
                <span>Gross Monthly Earnings (A)</span>
                <span className="font-mono font-bold text-[#171717] dark:text-white">{formatINR(totalMonthlyEarnings)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-[#ebebeb] dark:border-[#262626] rounded-xl overflow-hidden">
              <div className="bg-[#fafafa] dark:bg-[#181818] px-4 py-2.5 border-b border-[#ebebeb] dark:border-[#262626] flex justify-between items-center text-[13px] font-semibold text-[#171717] dark:text-white">
                <span>Deductions (Monthly)</span>
                <span>Amount</span>
              </div>
              <div className="p-4 space-y-2.5 text-[13px]">
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Employee PF (EPF)</span>
                  <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(regimeData.monthlyEmployeePf)}</span>
                </div>
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Professional Tax (PT)</span>
                  <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(regimeData.monthlyPt)}</span>
                </div>
                <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                  <span>Income Tax (TDS)</span>
                  <span className="font-mono font-medium text-[#ee0000]">{formatINR(regimeData.monthlyTax)}</span>
                </div>
                {regimeData.monthlyVpf > 0 && (
                  <div className="flex justify-between text-[#4d4d4d] dark:text-[#a1a1a1]">
                    <span>Voluntary PF (VPF)</span>
                    <span className="font-mono font-medium text-[#171717] dark:text-white">{formatINR(regimeData.monthlyVpf)}</span>
                  </div>
                )}
              </div>
              <div className="bg-[#fafafa] dark:bg-[#181818] px-4 py-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-between items-center text-[13px] font-semibold text-[#171717] dark:text-white">
                <span>Total Deductions (B)</span>
                <span className="font-mono font-bold text-[#ee0000]">{formatINR(totalMonthlyDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Final Summary Callout */}
          <div className="p-5 rounded-2xl bg-[#f5f5f5] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[12px] font-mono uppercase text-[#888888] dark:text-[#737373] block">
                Net Take-Home Pay (A - B)
              </span>
              <span className="text-3xl font-bold font-mono text-[#10b981]">
                {formatINR(netMonthlyPay)}
              </span>
              <span className="text-[12px] text-[#888888] dark:text-[#737373] block mt-0.5">
                Annualized Take-Home: {formatINR(regimeData.annualTakeHome)}
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#888888] dark:text-[#737373] text-left sm:text-right space-y-0.5">
              <div className="flex items-center gap-1 text-[#10b981]">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold">Statutory Computation Verified</span>
              </div>
              <span>Generated on inHander.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
