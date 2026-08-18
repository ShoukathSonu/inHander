import React from 'react';
import { formatINR, formatPercent } from '../lib/formatters';

interface BreakdownChartProps {
  grossAnnual: number;
  takeHomeAnnual: number;
  totalTaxAnnual: number;
  epfAnnual: number;
  otherDeductionsAnnual: number;
  regimeName: string;
}

export const BreakdownChart: React.FC<BreakdownChartProps> = ({
  grossAnnual,
  takeHomeAnnual,
  totalTaxAnnual,
  epfAnnual,
  otherDeductionsAnnual,
  regimeName
}) => {
  if (grossAnnual <= 0) return null;

  const takeHomePct = Math.max(0, Math.min(100, (takeHomeAnnual / grossAnnual) * 100));
  const taxPct = Math.max(0, Math.min(100, (totalTaxAnnual / grossAnnual) * 100));
  const epfPct = Math.max(0, Math.min(100, (epfAnnual / grossAnnual) * 100));
  const otherPct = Math.max(0, Math.min(100, 100 - takeHomePct - taxPct - epfPct));

  // Donut SVG geometry
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  
  const takeHomeDash = (takeHomePct / 100) * circumference;
  const taxDash = (taxPct / 100) * circumference;
  const epfDash = (epfPct / 100) * circumference;
  const otherDash = (otherPct / 100) * circumference;

  const taxOffset = -takeHomeDash;
  const epfOffset = -(takeHomeDash + taxDash);
  const otherOffset = -(takeHomeDash + taxDash + epfDash);

  return (
    <div className="bg-[#fafafa] dark:bg-[#181818] rounded-2xl p-5 sm:p-6 border border-[#ebebeb] dark:border-[#262626] shadow-stacked-sm flex flex-col justify-between h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ebebeb] dark:border-[#262626] pb-3">
        <div>
          <h4 className="text-[14px] font-semibold text-[#171717] dark:text-white">Annual CTC Distribution</h4>
          <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373]">{regimeName} Tax Regime</span>
        </div>
        <div className="text-right">
          <span className="text-[15px] font-bold font-mono text-[#10b981]">{formatPercent(takeHomePct, 1)}</span>
          <span className="text-[10px] font-mono uppercase text-[#888888] dark:text-[#737373] block">In-Hand Share</span>
        </div>
      </div>

      {/* Multi-segment Horizontal Progress Bar */}
      <div className="w-full space-y-1.5">
        <div className="w-full h-3 rounded-full bg-[#f0f0f0] dark:bg-[#262626] flex overflow-hidden p-0.5 gap-0.5">
          <div 
            style={{ width: `${takeHomePct}%` }} 
            className="h-full bg-[#10b981] rounded-l-full transition-all duration-500" 
            title={`Take Home: ${formatPercent(takeHomePct)}`}
          />
          {taxPct > 0 && (
            <div 
              style={{ width: `${taxPct}%` }} 
              className="h-full bg-[#ee0000] transition-all duration-500" 
              title={`Tax: ${formatPercent(taxPct)}`}
            />
          )}
          {epfPct > 0 && (
            <div 
              style={{ width: `${epfPct}%` }} 
              className="h-full bg-[#0070f3] transition-all duration-500" 
              title={`EPF: ${formatPercent(epfPct)}`}
            />
          )}
          {otherPct > 0 && (
            <div 
              style={{ width: `${otherPct}%` }} 
              className="h-full bg-[#f5a623] rounded-r-full transition-all duration-500" 
              title={`PT & Benefits: ${formatPercent(otherPct)}`}
            />
          )}
        </div>
      </div>

      {/* Donut Graphic & Legend */}
      <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5 pt-1">
        {/* Donut Chart SVG */}
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#f0f0f0" className="dark:stroke-[#262626]" strokeWidth="10" />
            {/* Take Home (Green) */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="#10b981"
              strokeWidth="10"
              strokeDasharray={`${takeHomeDash} ${circumference}`}
              strokeDashoffset="0"
              className="transition-all duration-500 ease-out"
            />
            {/* Tax (Red) */}
            {taxPct > 0 && (
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="#ee0000"
                strokeWidth="10"
                strokeDasharray={`${taxDash} ${circumference}`}
                strokeDashoffset={taxOffset}
                className="transition-all duration-500 ease-out"
              />
            )}
            {/* EPF (Blue) */}
            {epfPct > 0 && (
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="#0070f3"
                strokeWidth="10"
                strokeDasharray={`${epfDash} ${circumference}`}
                strokeDashoffset={epfOffset}
                className="transition-all duration-500 ease-out"
              />
            )}
            {/* Other (Amber) */}
            {otherPct > 0 && (
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="#f5a623"
                strokeWidth="10"
                strokeDasharray={`${otherDash} ${circumference}`}
                strokeDashoffset={otherOffset}
                className="transition-all duration-500 ease-out"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[12px] font-mono font-bold text-[#171717] dark:text-white leading-none">{formatPercent(takeHomePct, 0)}</span>
            <span className="text-[8px] text-[#888888] dark:text-[#737373] font-mono uppercase mt-0.5">In-Hand</span>
          </div>
        </div>

        {/* Legend Rows */}
        <div className="w-full space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0"></span>
              <span className="text-[#4d4d4d] dark:text-[#a1a1a1] truncate">In-Hand Pay</span>
            </div>
            <span className="font-mono font-medium text-[#171717] dark:text-white shrink-0">{formatINR(takeHomeAnnual)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ee0000] shrink-0"></span>
              <span className="text-[#4d4d4d] dark:text-[#a1a1a1] truncate">Income Tax</span>
            </div>
            <span className="font-mono font-medium text-[#ee0000] shrink-0">{formatINR(totalTaxAnnual)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0070f3] shrink-0"></span>
              <span className="text-[#4d4d4d] dark:text-[#a1a1a1] truncate">Provident Fund</span>
            </div>
            <span className="font-mono font-medium text-[#171717] dark:text-white shrink-0">{formatINR(epfAnnual)}</span>
          </div>

          {otherDeductionsAnnual > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f5a623] shrink-0"></span>
                <span className="text-[#4d4d4d] dark:text-[#a1a1a1] truncate">PT & Benefits</span>
              </div>
              <span className="font-mono font-medium text-[#171717] dark:text-white shrink-0">{formatINR(otherDeductionsAnnual)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
