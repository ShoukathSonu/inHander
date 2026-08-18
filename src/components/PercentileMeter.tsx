import React, { useState, useEffect, useMemo } from 'react';
import { calculateSalaryPercentile } from '../lib/salaryPercentileData';
import { formatCompactINR, formatINR } from '../lib/formatters';
import { Trophy, TrendingUp, Users, Share2, Check, Sparkles, Award } from 'lucide-react';
import type { SalaryInputs } from '../lib/taxEngine';
import { encodeInputsToQuery } from '../lib/shareUrl';

interface PercentileMeterProps {
  annualCtc: number;
  salaryInputs: SalaryInputs;
  initialExperience?: number;
}

export const PercentileMeter: React.FC<PercentileMeterProps> = ({
  annualCtc,
  salaryInputs,
  initialExperience = 4
}) => {
  const [experienceYears, setExperienceYears] = useState<number>(initialExperience);
  const [copied, setCopied] = useState(false);

  // Sync initial experience if passed from URL decode
  useEffect(() => {
    if (initialExperience !== undefined && initialExperience >= 0) {
      setExperienceYears(initialExperience);
    }
  }, [initialExperience]);

  const percentileData = useMemo(() => {
    return calculateSalaryPercentile(annualCtc, experienceYears);
  }, [annualCtc, experienceYears]);

  const handleShareMetric = () => {
    if (typeof window !== 'undefined') {
      const query = encodeInputsToQuery(salaryInputs, { exp: experienceYears });
      const shareUrl = `${window.location.origin}${window.location.pathname}?${query}`;
      
      const shareText = `My CTC of ${formatCompactINR(annualCtc)} puts me in the Top ${percentileData.topPercent}% of professionals with ${experienceYears} yrs experience in India! Check where you stand: ${shareUrl}`;

      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Convert CTC to human friendly LPA string
  const ctcLpaStr = formatCompactINR(annualCtc);

  return (
    <div className="p-6 sm:p-7 bg-white dark:bg-[#121212] border-b border-dashed border-[#e2e4e9] dark:border-[#262626] space-y-6 transition-colors">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0070f3]/10 dark:bg-[#0070f3]/20 text-[#0070f3] dark:text-[#38bdf8]">
              <Trophy className="w-4 h-4" />
            </span>
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#171717] dark:text-white tracking-tight">
              Where Do You Stand? <span className="text-[#888888] dark:text-[#737373] font-normal text-[13px]">(Salary Percentile Benchmark)</span>
            </h3>
          </div>
          <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1]">
            Benchmark your compensation against verified Indian tech &amp; corporate cohorts.
          </p>
        </div>

        {/* Share Metric Button */}
        <button
          onClick={handleShareMetric}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] text-[#171717] dark:text-white text-[12px] font-medium transition-all hover:scale-102 shadow-2xs self-start sm:self-auto cursor-pointer"
          title="Copy anonymous percentile badge and link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="text-[#10b981] font-semibold">Copied Share Link!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-[#888888] dark:text-[#737373]" />
              <span>Share Metric</span>
            </>
          )}
        </button>
      </div>

      {/* Experience Selector & Dynamic Microcopy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 5 Cols: Experience Slider */}
        <div className="lg:col-span-5 space-y-3 bg-[#fafafa] dark:bg-[#181818] p-4 rounded-xl border border-[#ebebeb] dark:border-[#262626]">
          <div className="flex justify-between items-center text-[13px]">
            <label className="font-semibold text-[#171717] dark:text-white flex items-center gap-1.5">
              <span>Total Experience:</span>
              <span className="font-mono text-[#0070f3] dark:text-[#38bdf8] font-bold">
                {experienceYears} {experienceYears === 1 ? 'Year' : 'Years'}
              </span>
            </label>
            <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373]">
              {percentileData.bracket.label}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value))}
            className="w-full h-2 bg-[#ebebeb] dark:bg-[#2c2c2c] rounded-lg appearance-none cursor-pointer accent-[#0070f3]"
          />

          <div className="flex justify-between text-[10px] font-mono text-[#888888] dark:text-[#737373]">
            <span>0y (Fresher)</span>
            <span>5y (Mid)</span>
            <span>10y (Lead)</span>
            <span>20+y (Exec)</span>
          </div>
        </div>

        {/* Right 7 Cols: Visual Percentile Gauge & Highlight Microcopy */}
        <div className="lg:col-span-7 space-y-3">
          {/* Dynamic Highlight Sentence */}
          <div className="p-3.5 rounded-xl bg-linear-to-r from-[#0070f3]/5 via-[#10b981]/5 to-transparent border border-[#0070f3]/20 dark:border-[#0070f3]/30">
            <p className="text-[13px] sm:text-[14px] text-[#171717] dark:text-white leading-relaxed">
              Your CTC of <span className="font-bold font-mono text-[#0070f3] dark:text-[#38bdf8]">{ctcLpaStr}</span> puts you in the{' '}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#10b981]/15 text-[#10b981] font-mono font-bold">
                <Sparkles className="w-3 h-3 inline" /> Top {percentileData.topPercent}%
              </span>{' '}
              of professionals with <span className="font-semibold">{experienceYears} years</span> of experience.
            </p>
          </div>

          {/* Sleek Visual Progress Gauge */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-[#888888] dark:text-[#737373]">
              <span>Percentile Rank: <strong className="text-[#171717] dark:text-white font-bold">{percentileData.percentileRank}th</strong></span>
              <span className="text-[#10b981] font-semibold">{percentileData.tierDescription}</span>
            </div>

            {/* Gauge Bar */}
            <div className="relative w-full h-3.5 bg-[#ebebeb] dark:bg-[#262626] rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full rounded-full bg-linear-to-r from-[#0070f3] via-[#7928ca] to-[#10b981] transition-all duration-500 ease-out shadow-xs"
                style={{ width: `${Math.max(4, Math.min(100, percentileData.percentileRank))}%` }}
              />
            </div>

            {/* Gauge Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-[#888888] dark:text-[#737373] px-0.5">
              <span>0% (Entry)</span>
              <span>50% (Median)</span>
              <span>75% (High)</span>
              <span>99% (Top 1%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Benchmarks Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="p-2.5 rounded-lg bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
          <span className="text-[10px] font-mono text-[#888888] dark:text-[#737373] uppercase block">25th Percentile</span>
          <span className="text-[13px] font-bold font-mono text-[#171717] dark:text-white">
            {formatCompactINR(percentileData.p25Ctc)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
          <span className="text-[10px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Median (50th)</span>
          <span className="text-[13px] font-bold font-mono text-[#0070f3] dark:text-[#38bdf8]">
            {formatCompactINR(percentileData.medianCtc)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
          <span className="text-[10px] font-mono text-[#888888] dark:text-[#737373] uppercase block">75th Percentile</span>
          <span className="text-[13px] font-bold font-mono text-[#7928ca] dark:text-[#a855f7]">
            {formatCompactINR(percentileData.p75Ctc)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
          <span className="text-[10px] font-mono text-[#888888] dark:text-[#737373] uppercase block">90th Percentile</span>
          <span className="text-[13px] font-bold font-mono text-[#10b981]">
            {formatCompactINR(percentileData.p90Ctc)}
          </span>
        </div>
      </div>
    </div>
  );
};
