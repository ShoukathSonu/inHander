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
    <div className="bg-[#f9fafb] dark:bg-[#161616] rounded-2xl p-6 sm:p-8 flex flex-col justify-between h-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-sm font-semibold text-[#171717] dark:text-white">Annual CTC distribution</h3>
          <span className="text-xs text-[#777777] dark:text-[#888888] font-normal">{regimeName} Tax Regime</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-[#10b981]">{formatPercent(takeHomePct, 1)}</span>
          <span className="text-xs text-[#777777] dark:text-[#888888] font-normal block">in-hand share</span>
        </div>
      </div>

      {/* Multi-segment Horizontal Progress Bar */}
      <div className="w-full space-y-1.5">
        <div className="w-full h-2 rounded-full bg-[#e5e7eb] dark:bg-[#262626] flex overflow-hidden p-0.5 gap-0.5">
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
      <div className="flex flex-row items-center gap-5 pt-1">
        {/* Donut Chart SVG */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" className="dark:stroke-[#262626]" strokeWidth="8" />
            {/* Take Home (Green) */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="#10b981"
              strokeWidth="8"
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
                strokeWidth="8"
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
                strokeWidth="8"
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
                strokeWidth="8"
                strokeDasharray={`${otherDash} ${circumference}`}
                strokeDashoffset={otherOffset}
                className="transition-all duration-500 ease-out"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-[#171717] dark:text-white leading-none">{formatPercent(takeHomePct, 0)}</span>
            <span className="text-[9px] text-[#777777] dark:text-[#888888] mt-0.5">take-home</span>
          </div>
        </div>

        {/* Legend Rows */}
        <div className="w-full space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0"></span>
              <span className="text-[#555555] dark:text-[#aaaaaa] truncate">In-hand pay</span>
            </div>
            <span className="font-medium text-[#171717] dark:text-white shrink-0 ml-1">{formatINR(takeHomeAnnual)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#ee0000] shrink-0"></span>
              <span className="text-[#555555] dark:text-[#aaaaaa] truncate">Income tax</span>
            </div>
            <span className="font-medium text-[#ee0000] shrink-0 ml-1">{formatINR(totalTaxAnnual)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#0070f3] shrink-0"></span>
              <span className="text-[#555555] dark:text-[#aaaaaa] truncate">Provident fund</span>
            </div>
            <span className="font-medium text-[#171717] dark:text-white shrink-0 ml-1">{formatINR(epfAnnual)}</span>
          </div>

          {otherDeductionsAnnual > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#f5a623] shrink-0"></span>
                <span className="text-[#555555] dark:text-[#aaaaaa] truncate">PT &amp; benefits</span>
              </div>
              <span className="font-medium text-[#171717] dark:text-white shrink-0 ml-1">{formatINR(otherDeductionsAnnual)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
