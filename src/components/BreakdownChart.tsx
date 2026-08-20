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
    <div className="bg-[#fafafa]/80 dark:bg-[#181818]/80 rounded-2xl p-4 sm:p-6 border border-dashed border-[#e2e4e9] dark:border-[#262626] shadow-stacked-sm flex flex-col justify-between h-full space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dashed border-[#e2e4e9] dark:border-[#262626] pb-2.5 sm:pb-3">
        <div>
          <h4 className="text-[13px] sm:text-[14px] font-semibold text-[#171717] dark:text-white">Annual CTC Distribution</h4>
          <span className="text-[10.5px] sm:text-[11px] font-mono text-[#888888] dark:text-[#737373]">{regimeName} Tax Regime</span>
        </div>
        <div className="text-right">
          <span className="text-[14px] sm:text-[15px] font-bold font-mono text-[#10b981]">{formatPercent(takeHomePct, 1)}</span>
          <span className="text-[9.5px] sm:text-[10px] font-mono uppercase text-[#888888] dark:text-[#737373] block">In-Hand Share</span>
        </div>
      </div>

      {/* Multi-segment Horizontal Progress Bar */}
      <div className="w-full space-y-1.5">
        <div className="w-full h-2.5 sm:h-3 rounded-full bg-[#f0f0f0] dark:bg-[#262626] flex overflow-hidden p-0.5 gap-0.5">
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

      {/* Donut Graphic & Legend (Clean Side-by-Side Flex Layout) */}
      <div className="flex flex-row items-center gap-3 sm:gap-5 pt-1">
        {/* Donut Chart SVG */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90" viewBox="0 0 96 96">
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
            <span className="text-[11px] sm:text-[12px] font-mono font-bold text-[#171717] dark:text-white leading-none">{formatPercent(takeHomePct, 0)}</span>
            <span className="text-[7.5px] sm:text-[8px] text-[#888888] dark:text-[#737373] font-mono uppercase mt-0.5">In-Hand</span>
          </div>
        </div>

        {/* Legend Rows */}
        <div className="w-full space-y-1.5 sm:space-y-2 text-[11px] sm:text-[12px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0"></span>
              <span className="text-[#4d4d4d] dark:text-[#a1a1a1] truncate">In-Hand Pay</span>
            </div>
            <span className="font-mono font-medium text-[#171717] dark:text-white shrink-0 ml-1">{formatINR(takeHomeAnnual)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#ee0000] shrink-0"></span>
              <span className="text-[#4d4d4d] dark:text-[#a1a1a1] truncate">Income Tax</span>
            </div>
            <span className="font-mono font-medium text-[#ee0000] shrink-0 ml-1">{formatINR(totalTaxAnnual)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#0070f3] shrink-0"></span>
              <span className="text-[#4d4d4d] dark:text-[#a1a1a1] truncate">Provident Fund</span>
            </div>
            <span className="font-mono font-medium text-[#171717] dark:text-white shrink-0 ml-1">{formatINR(epfAnnual)}</span>
          </div>

          {otherDeductionsAnnual > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#f5a623] shrink-0"></span>
                <span className="text-[#4d4d4d] dark:text-[#a1a1a1] truncate">PT &amp; Benefits</span>
              </div>
              <span className="font-mono font-medium text-[#171717] dark:text-white shrink-0 ml-1">{formatINR(otherDeductionsAnnual)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
