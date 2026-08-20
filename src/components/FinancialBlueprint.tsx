import React from 'react';
import { formatINR } from '../lib/formatters';
import { ShieldCheck, PiggyBank, HeartHandshake, Compass } from 'lucide-react';

interface FinancialBlueprintProps {
  monthlyTakeHome: number;
  annualCtc: number;
  epfMonthly: number;
}

export const FinancialBlueprint: React.FC<FinancialBlueprintProps> = ({
  monthlyTakeHome,
  annualCtc,
  epfMonthly
}) => {
  if (monthlyTakeHome <= 0) return null;

  // 50-30-20 Rule
  const needs50 = Math.round(monthlyTakeHome * 0.50);
  const wants30 = Math.round(monthlyTakeHome * 0.30);
  const savings20 = Math.round(monthlyTakeHome * 0.20);

  // Term insurance rule of thumb: 10x to 15x annual income
  const termInsuranceMin = annualCtc * 10;
  const termInsuranceMax = annualCtc * 15;

  // Emergency Fund: 6 months of living expenses (50% needs)
  const emergencyFund = needs50 * 6;

  // 25-year EPF projection (assuming 8.25% return, 12% employee + 12% employer = 24%)
  const totalMonthlyPf = epfMonthly * 2;
  const years = 25;
  const monthlyRate = 0.0825 / 12;
  const totalMonths = years * 12;
  const futureEpfCorpus = totalMonthlyPf > 0
    ? Math.round(totalMonthlyPf * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate))
    : 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pt-4">
      <div className="text-center space-y-1.5">
        <span className="text-xs text-[#888888] dark:text-[#777777] font-normal block">
          Financial planning &amp; wealth blueprint
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold text-[#171717] dark:text-white tracking-tight">
          How to allocate your {formatINR(monthlyTakeHome)} monthly take-home pay.
        </h2>
        <p className="text-sm text-[#666666] dark:text-[#999999] max-w-xl mx-auto font-normal">
          Financial principles for Indian professionals to build wealth and secure retirement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: 50/30/20 Budget Allocation */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#121212] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-[#fafafa] dark:bg-[#1a1a1a] flex items-center justify-center text-[#171717] dark:text-white">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#171717] dark:text-white">50 / 30 / 20 Budget</h3>
              <p className="text-xs text-[#777777] dark:text-[#888888] font-normal mt-0.5">Recommended monthly allocation</p>
            </div>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#fafafa] dark:bg-[#161616]">
                <span className="text-[#555555] dark:text-[#aaaaaa]">Needs (50%):</span>
                <span className="font-medium text-[#171717] dark:text-white">{formatINR(needs50)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#fafafa] dark:bg-[#161616]">
                <span className="text-[#555555] dark:text-[#aaaaaa]">Wants (30%):</span>
                <span className="font-medium text-[#171717] dark:text-white">{formatINR(wants30)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#fafafa] dark:bg-[#161616]">
                <span className="text-[#555555] dark:text-[#aaaaaa]">Wealth (20%):</span>
                <span className="font-medium text-[#10b981]">{formatINR(savings20)}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#777777] dark:text-[#888888] font-normal leading-relaxed pt-2">
            Automate a monthly SIP of {formatINR(savings20)} on salary credit day.
          </p>
        </div>

        {/* Card 2: Emergency Fund Target */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#121212] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-[#fafafa] dark:bg-[#1a1a1a] flex items-center justify-center text-[#0070f3]">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#171717] dark:text-white">Emergency Fund</h3>
              <p className="text-xs text-[#777777] dark:text-[#888888] font-normal mt-0.5">6 months living expenses</p>
            </div>
            <div className="pt-2">
              <span className="text-xs text-[#777777] dark:text-[#888888] block font-normal">Target corpus</span>
              <span className="text-2xl font-bold text-[#0070f3] tracking-tight">
                {formatINR(emergencyFund)}
              </span>
            </div>
            <p className="text-xs text-[#666666] dark:text-[#999999] leading-relaxed font-normal">
              Keep this in an instant-access high-yield savings account or liquid fund.
            </p>
          </div>
          <span className="text-xs text-[#10b981] font-medium">Liquid Buffer</span>
        </div>

        {/* Card 3: Term Insurance Cover */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#121212] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-[#fafafa] dark:bg-[#1a1a1a] flex items-center justify-center text-[#7928ca]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#171717] dark:text-white">Life Cover Target</h3>
              <p className="text-xs text-[#777777] dark:text-[#888888] font-normal mt-0.5">10x to 15x annual CTC</p>
            </div>
            <div className="pt-2">
              <span className="text-xs text-[#777777] dark:text-[#888888] block font-normal">Recommended cover</span>
              <span className="text-2xl font-bold text-[#7928ca] dark:text-[#a855f7] tracking-tight">
                {formatINR(termInsuranceMin)}
              </span>
            </div>
            <p className="text-xs text-[#666666] dark:text-[#999999] leading-relaxed font-normal">
              Pure term life policy with coverage up to {formatINR(termInsuranceMax)}.
            </p>
          </div>
          <span className="text-xs text-[#7928ca] dark:text-[#a855f7] font-medium">Family Protection</span>
        </div>

        {/* Card 4: EPF Retirement Wealth */}
        <div className="p-8 rounded-3xl bg-white dark:bg-[#121212] shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-[#fafafa] dark:bg-[#1a1a1a] flex items-center justify-center text-[#10b981]">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#171717] dark:text-white">25-Yr EPF Corpus</h3>
              <p className="text-xs text-[#777777] dark:text-[#888888] font-normal mt-0.5">At 8.25% compounding</p>
            </div>
            <div className="pt-2">
              <span className="text-xs text-[#777777] dark:text-[#888888] block font-normal">Projected retirement wealth</span>
              <span className="text-2xl font-bold text-[#10b981] tracking-tight">
                {formatINR(futureEpfCorpus)}
              </span>
            </div>
            <p className="text-xs text-[#666666] dark:text-[#999999] leading-relaxed font-normal">
              Based on {formatINR(totalMonthlyPf)}/mo combined employee and employer PF.
            </p>
          </div>
          <span className="text-xs text-[#10b981] font-medium">Tax-Free Retirement</span>
        </div>
      </div>
    </div>
  );
};
