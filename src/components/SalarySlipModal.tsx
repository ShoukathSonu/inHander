import React, { useState } from 'react';
import { formatINR } from '../lib/formatters';
import type { FullSalaryAnalysis } from '../lib/taxEngine';
import { Printer, Copy, Check, X, Share2 } from 'lucide-react';

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
  const [shared, setShared] = useState(false);
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
SALARY SLIP BREAKDOWN (${selectedRegime} TAX REGIME)
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

NET TAKE-HOME SALARY (Monthly): ${formatINR(netMonthlyPay)}
ANNUAL TAKE-HOME SALARY: ${formatINR(regimeData.annualTakeHome)}
TOTAL ANNUAL INCOME TAX: ${formatINR(regimeData.totalAnnualTax)}

Generated via inHander.com
`.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareModal = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'In Hand Salary Slip',
          text: `My In Hand Take-Home Salary: ${formatINR(netMonthlyPay)}/month (${selectedRegime} Regime)`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      }
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-[#121212] rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-8 py-5 bg-[#fafafa] dark:bg-[#161616] no-print">
          <h2 className="text-base font-semibold text-[#171717] dark:text-white">
            Salary Statement &amp; Proof
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white transition-colors"
            >
              {shared ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{shared ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#888888] dark:text-[#777777] hover:text-[#171717] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div id="printable-payslip" className="p-8 sm:p-12 space-y-8 text-[#171717] dark:text-[#ededed] bg-white dark:bg-[#121212]">
          {/* Header of Payslip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4">
            <div className="space-y-1">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="text-lg sm:text-xl font-semibold text-[#171717] dark:text-white bg-transparent border-0 focus:outline-hidden w-full max-w-md"
              />
              <p className="text-xs text-[#777777] dark:text-[#888888] font-normal">
                Monthly Salary Statement &amp; Pay Slip
              </p>
            </div>
            <div className="text-left sm:text-right space-y-0.5 text-xs text-[#777777] dark:text-[#888888]">
              <span>Current Calendar Month</span>
              <span className="block font-medium text-[#171717] dark:text-white">{selectedRegime} Tax Regime</span>
            </div>
          </div>

          {/* Employee Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-2xl bg-[#fafafa] dark:bg-[#161616] text-xs">
            <div>
              <span className="text-[#888888] block">Designation:</span>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="font-medium text-[#171717] dark:text-white bg-transparent border-0 focus:outline-hidden w-full mt-0.5"
              />
            </div>
            <div>
              <span className="text-[#888888] block">Annual CTC:</span>
              <span className="font-medium text-[#171717] dark:text-white block mt-0.5">{formatINR(analysis.inputs.annualCtc)}</span>
            </div>
            <div>
              <span className="text-[#888888] block">State (PT):</span>
              <span className="font-medium text-[#171717] dark:text-white block mt-0.5">{analysis.inputs.stateCode}</span>
            </div>
            <div>
              <span className="text-[#888888] block">Days in Month:</span>
              <span className="font-medium text-[#171717] dark:text-white block mt-0.5">30 / 31</span>
            </div>
          </div>

          {/* Dual Table: Earnings & Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Earnings */}
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

            {/* Deductions */}
            <div className="p-6 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
              <h3 className="text-sm font-semibold text-[#171717] dark:text-white pb-1">Deductions (Monthly)</h3>
              <div className="space-y-2 text-sm text-[#555555] dark:text-[#aaaaaa]">
                <div className="flex justify-between">
                  <span>Employee PF (EPF)</span>
                  <span className="font-medium text-[#171717] dark:text-white">{formatINR(regimeData.monthlyEmployeePf)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Professional Tax (PT)</span>
                  <span className="font-medium text-[#171717] dark:text-white">{formatINR(regimeData.monthlyPt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Income Tax (TDS)</span>
                  <span className="font-medium text-[#ee0000]">{formatINR(regimeData.monthlyTax)}</span>
                </div>
                <div className="flex justify-between pt-3 font-semibold text-[#171717] dark:text-white">
                  <span>Total Monthly Deductions</span>
                  <span className="text-[#ee0000]">{formatINR(totalMonthlyDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Callout */}
          <div className="p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#161616] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[#777777] dark:text-[#888888] font-normal block">Net take-home pay</span>
              <span className="text-3xl sm:text-4xl font-bold text-[#10b981]">{formatINR(netMonthlyPay)}</span>
            </div>
            <span className="text-xs text-[#888888] font-normal">100% Tax Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
