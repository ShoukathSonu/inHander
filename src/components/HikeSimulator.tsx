import React, { useState, useMemo } from 'react';
import { calculateSalary, DEFAULT_SALARY_INPUTS } from '../lib/taxEngine';
import { formatINR } from '../lib/formatters';
import { TrendingUp, ArrowRight, Sparkles, FileText, Wallet, AlertCircle, ShieldAlert } from 'lucide-react';

const HIKE_PRESETS = [10, 15, 20, 25, 30, 40, 50];

export const HikeSimulator: React.FC = () => {
  const [currentCtc, setCurrentCtc] = useState<number>(1200000);
  const [hikePercentage, setHikePercentage] = useState<number>(25);

  const newCtc = useMemo(() => {
    return Math.round(currentCtc * (1 + hikePercentage / 100));
  }, [currentCtc, hikePercentage]);

  const currentAnalysis = useMemo(() => {
    return calculateSalary({ ...DEFAULT_SALARY_INPUTS, annualCtc: currentCtc });
  }, [currentCtc]);

  const newAnalysis = useMemo(() => {
    return calculateSalary({ ...DEFAULT_SALARY_INPUTS, annualCtc: newCtc });
  }, [newCtc]);

  const currentBest = currentAnalysis.betterRegime === 'OLD' ? currentAnalysis.oldRegime : currentAnalysis.newRegime;
  const newBest = newAnalysis.betterRegime === 'OLD' ? newAnalysis.oldRegime : newAnalysis.newRegime;

  const monthlyIncrease = newBest.monthlyTakeHome - currentBest.monthlyTakeHome;
  const annualNetIncrease = newBest.annualTakeHome - currentBest.annualTakeHome;
  const extraTaxPaid = newBest.totalAnnualTax - currentBest.totalAnnualTax;
  
  // Real in-hand hike calculations
  const nominalHikePct = hikePercentage;
  const realInHandGrowthPct = currentBest.monthlyTakeHome > 0 ? (monthlyIncrease / currentBest.monthlyTakeHome) * 100 : 0;
  const taxDragPct = Math.max(0, nominalHikePct - realInHandGrowthPct);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 sm:p-8 border border-[#ebebeb] dark:border-[#262626] shadow-stacked space-y-8 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#171717] dark:bg-white text-white dark:text-[#171717]">
              Salary Increment Calculator
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] dark:text-white tracking-tight mt-1">
            Simulate Your Post-Tax Salary Hike.
          </h2>
          <p className="text-[14px] text-[#4d4d4d] dark:text-[#a1a1a1] mt-1 max-w-2xl">
            See your exact monthly bank credit increase after an appraisal or job switch, accounting for tax slab progression.
          </p>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
          {/* Current CTC */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[13px]">
              <label className="font-semibold text-[#171717] dark:text-white">Current Annual CTC</label>
              <span className="font-mono font-bold text-[#171717] dark:text-white text-[15px]">{formatINR(currentCtc)}</span>
            </div>
            <input
              type="range"
              min={300000}
              max={8000000}
              step={50000}
              value={currentCtc}
              onChange={(e) => setCurrentCtc(Number(e.target.value))}
              className="w-full h-2 bg-[#ebebeb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-[#888888] dark:text-[#737373]">
              <span>₹3 LPA</span>
              <span>₹80 LPA</span>
            </div>
          </div>

          {/* Expected Hike % */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[13px]">
              <label className="font-semibold text-[#171717] dark:text-white">Expected Hike Percentage</label>
              <span className="font-mono font-bold text-[#0070f3] text-[15px]">+{hikePercentage}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={hikePercentage}
              onChange={(e) => setHikePercentage(Number(e.target.value))}
              className="w-full h-2 bg-[#ebebeb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {HIKE_PRESETS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setHikePercentage(pct)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                    hikePercentage === pct
                      ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717]'
                      : 'bg-white dark:bg-[#121212] text-[#4d4d4d] dark:text-[#a1a1a1] border border-[#ebebeb] dark:border-[#262626] hover:bg-[#f5f5f5] dark:hover:bg-[#222222]'
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task 3: "Real In-Hand Hike" Reality Badge Side-by-Side Strip */}
        <div className="p-5 rounded-2xl bg-linear-to-r from-[#0070f3]/5 via-[#10b981]/5 to-transparent border border-[#0070f3]/20 dark:border-[#0070f3]/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] font-semibold">
              Hike Reality Check (Paper vs. Bank)
            </span>
            {taxDragPct > 1 && (
              <span className="text-[11px] font-mono text-[#ee0000] bg-[#ee0000]/10 px-2 py-0.5 rounded-md">
                -{taxDragPct.toFixed(1)}% Tax Drag
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* On Paper Badge */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#fafafa] dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#888888] dark:text-[#737373]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-[#888888] dark:text-[#737373] block uppercase font-mono">
                    On Paper (Gross CTC)
                  </span>
                  <span className="text-xl font-bold font-mono text-[#171717] dark:text-white">
                    +{nominalHikePct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="text-[12px] font-mono text-[#888888] dark:text-[#737373]">
                +{formatINR(newCtc - currentCtc)}/yr
              </span>
            </div>

            {/* Actual In-Hand Badge */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#181818] border border-[#10b981]/40 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-[#10b981] block uppercase font-mono font-semibold">
                    Actual In-Hand (Net Bank)
                  </span>
                  <span className="text-xl font-bold font-mono text-[#10b981]">
                    +{realInHandGrowthPct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#10b981]">
                +{formatINR(monthlyIncrease)}/mo cash
              </span>
            </div>
          </div>
        </div>

        {/* Big Results Transformation Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-6 rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
          {/* Before */}
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Before Hike</span>
            <div className="text-xl font-bold font-mono text-[#171717] dark:text-white">{formatINR(currentCtc)} CTC</div>
            <div className="text-2xl font-bold font-mono text-[#4d4d4d] dark:text-[#a1a1a1] pt-1">
              {formatINR(currentBest.monthlyTakeHome)}
              <span className="text-xs font-normal text-[#888888] dark:text-[#737373]"> /mo in-hand</span>
            </div>
          </div>

          {/* Increment Hero Metric */}
          <div className="text-center p-5 rounded-xl bg-white dark:bg-[#121212] border border-[#10b981] shadow-stacked space-y-1">
            <span className="text-[11px] font-mono uppercase text-[#10b981] font-semibold block flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Extra Bank Credit
            </span>
            <div className="text-3xl sm:text-4xl font-bold font-mono text-[#10b981]">
              +{formatINR(monthlyIncrease)}
            </div>
            <span className="text-[12px] font-mono text-[#4d4d4d] dark:text-[#a1a1a1] block">
              per month (+{realInHandGrowthPct.toFixed(1)}% real net growth)
            </span>
          </div>

          {/* After */}
          <div className="space-y-1 text-left md:text-right">
            <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">After {hikePercentage}% Hike</span>
            <div className="text-xl font-bold font-mono text-[#0070f3]">{formatINR(newCtc)} CTC</div>
            <div className="text-2xl font-bold font-mono text-[#10b981] pt-1">
              {formatINR(newBest.monthlyTakeHome)}
              <span className="text-xs font-normal text-[#888888] dark:text-[#737373]"> /mo in-hand</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
            <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Annual Net In-Hand Increase</span>
            <span className="text-xl font-bold font-mono text-[#10b981] block mt-1">
              +{formatINR(annualNetIncrease)}
            </span>
            <p className="text-[11px] text-[#888888] dark:text-[#737373] mt-1">Total extra cash credited in bank per year.</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
            <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Incremental Tax Owed</span>
            <span className="text-xl font-bold font-mono text-[#ee0000] block mt-1">
              +{formatINR(extraTaxPaid)}
            </span>
            <p className="text-[11px] text-[#888888] dark:text-[#737373] mt-1">Additional annual income tax on the hike amount.</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626]">
            <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">CTC Increase</span>
            <span className="text-xl font-bold font-mono text-[#171717] dark:text-white block mt-1">
              +{formatINR(newCtc - currentCtc)}
            </span>
            <p className="text-[11px] text-[#888888] dark:text-[#737373] mt-1">Gross annual increment on paper.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
