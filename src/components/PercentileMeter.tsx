import React, { useState, useEffect, useMemo } from 'react';
import { calculateSalaryPercentile } from '../lib/salaryPercentileData';
import { formatCompactINR } from '../lib/formatters';
import { Trophy, Share2, Check } from 'lucide-react';
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

  const ctcLpaStr = formatCompactINR(annualCtc);

  return (
    <div className="p-8 sm:p-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#f5a623]" />
            <h2 className="text-base sm:text-lg font-semibold text-[#171717] dark:text-white tracking-tight">
              Salary Percentile Benchmark
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#777777] dark:text-[#888888] font-normal">
            Benchmark your compensation against verified Indian corporate cohorts
          </p>
        </div>

        <button
          onClick={handleShareMetric}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs text-[#555555] dark:text-[#aaaaaa] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="text-[#10b981] font-medium">Link copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share metric</span>
            </>
          )}
        </button>
      </div>

      {/* Experience Selector & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 space-y-3 bg-[#fafafa] dark:bg-[#161616] p-6 rounded-2xl">
          <div className="flex justify-between items-center text-sm">
            <label className="font-normal text-[#171717] dark:text-white">
              Total Experience: <span className="font-medium text-[#0070f3]">{experienceYears} {experienceYears === 1 ? 'Year' : 'Years'}</span>
            </label>
            <span className="text-xs text-[#888888]">
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
            className="w-full h-1.5 bg-[#e5e7eb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
          />

          <div className="flex justify-between text-xs text-[#888888] pt-1">
            <span>Fresher (0 yr)</span>
            <span>Mid (5-8 yrs)</span>
            <span>Lead (15+ yrs)</span>
          </div>
        </div>

        {/* Right 7 Cols: Top Percentage Result */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#fafafa] dark:bg-[#161616] space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#777777] dark:text-[#888888] font-normal">Cohort Standing</span>
            <span className="text-xs font-medium text-[#10b981]">{percentileData.tierLabel}</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-[#171717] dark:text-white tracking-tight">
              Top {percentileData.topPercent}%
            </span>
            <span className="text-xs text-[#777777] dark:text-[#888888]">
              among {experienceYears}-year peers in India
            </span>
          </div>

          {/* Clean Progress Meter */}
          <div className="w-full h-2 rounded-full bg-[#e5e7eb] dark:bg-[#262626] overflow-hidden">
            <div
              style={{ width: `${percentileData.percentile}%` }}
              className="h-full bg-[#10b981] transition-all duration-500 rounded-full"
            />
          </div>

          <p className="text-xs text-[#666666] dark:text-[#999999] leading-relaxed font-normal pt-1">
            For an annual package of {ctcLpaStr} at {experienceYears} years of experience, you earn more than {percentileData.percentile}% of salaried peers in India.
          </p>
        </div>
      </div>
    </div>
  );
};
