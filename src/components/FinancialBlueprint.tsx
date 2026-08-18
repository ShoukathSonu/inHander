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
    <div className="w-full max-w-6xl mx-auto space-y-6 pt-8">
      <div className="text-center space-y-2">
        <span className="text-[12px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] font-semibold">
          Financial Planning & Wealth Blueprint
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] dark:text-white tracking-tight">
          How to allocate your {formatINR(monthlyTakeHome)} monthly in-hand pay.
        </h2>
        <p className="text-[14px] text-[#4d4d4d] dark:text-[#a1a1a1] max-w-xl mx-auto">
          Proven financial thumb-rules for Indian professionals to build wealth, protect family, and plan retirement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {/* Card 1: 50/30/20 Budget Allocation */}
        <div className="vessa-card p-6 rounded-2xl shadow-stacked-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#e2e4e9] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#171717] dark:text-white">50 / 30 / 20 Budget Rule</h3>
              <p className="text-[12px] text-[#888888] dark:text-[#737373] font-mono mt-0.5">Ideal monthly cash allocation</p>
            </div>
            <div className="space-y-2 text-[12px] pt-1">
              <div className="flex justify-between items-center p-2 rounded-lg bg-[#fafafa] dark:bg-[#181818] border border-dashed border-[#e2e4e9] dark:border-[#262626]">
                <span className="text-[#4d4d4d] dark:text-[#a1a1a1]">50% Needs (Rent/EMI):</span>
                <span className="font-mono font-bold text-[#171717] dark:text-white">{formatINR(needs50)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-[#fafafa] dark:bg-[#181818] border border-dashed border-[#e2e4e9] dark:border-[#262626]">
                <span className="text-[#4d4d4d] dark:text-[#a1a1a1]">30% Wants (Lifestyle):</span>
                <span className="font-mono font-bold text-[#171717] dark:text-white">{formatINR(wants30)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-[#fafafa] dark:bg-[#181818] border border-dashed border-[#e2e4e9] dark:border-[#262626]">
                <span className="text-[#4d4d4d] dark:text-[#a1a1a1]">20% Wealth (SIPs/MF):</span>
                <span className="font-mono font-bold text-[#10b981]">{formatINR(savings20)}</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#888888] dark:text-[#737373] leading-tight pt-2 border-t border-dashed border-[#e2e4e9] dark:border-[#262626]">
            Automate a monthly SIP of {formatINR(savings20)} on salary credit day.
          </p>
        </div>

        {/* Card 2: Emergency Fund Target */}
        <div className="vessa-card p-6 rounded-2xl shadow-stacked-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#e2e4e9] dark:border-[#262626] flex items-center justify-center text-[#0070f3]">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#171717] dark:text-white">Emergency Fund Goal</h3>
              <p className="text-[12px] text-[#888888] dark:text-[#737373] font-mono mt-0.5">6 months essential buffer</p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Target Corpus</span>
              <span className="text-2xl font-bold font-mono text-[#0070f3] tracking-tight">
                {formatINR(emergencyFund)}
              </span>
            </div>
            <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
              Maintain 6 months of mandatory living expenses ({formatINR(needs50)}/mo) in liquid funds, sweep-in fixed deposits, or high-yield savings accounts.
            </p>
          </div>
          <p className="text-[11px] text-[#888888] dark:text-[#737373] leading-tight pt-2 border-t border-dashed border-[#e2e4e9] dark:border-[#262626]">
            Gives career independence during job transitions or layoffs.
          </p>
        </div>

        {/* Card 3: Term Life Insurance Protection */}
        <div className="vessa-card p-6 rounded-2xl shadow-stacked-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#e2e4e9] dark:border-[#262626] flex items-center justify-center text-[#10b981]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#171717] dark:text-white">Term Insurance Cover</h3>
              <p className="text-[12px] text-[#888888] dark:text-[#737373] font-mono mt-0.5">10x – 15x CTC protection rule</p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Recommended Life Cover</span>
              <span className="text-2xl font-bold font-mono text-[#10b981] tracking-tight">
                {formatINR(termInsuranceMin)} – {formatINR(termInsuranceMax)}
              </span>
            </div>
            <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
              Pure term insurance policy ensures 100% financial security for your dependents without expensive endowment/ULIP traps.
            </p>
          </div>
          <p className="text-[11px] text-[#888888] dark:text-[#737373] leading-tight pt-2 border-t border-dashed border-[#e2e4e9] dark:border-[#262626]">
            Premium eligible under Sec 80C in Old Tax Regime.
          </p>
        </div>

        {/* Card 4: EPF Retirement Wealth Compounding */}
        <div className="vessa-card p-6 rounded-2xl shadow-stacked-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#7928ca]">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#171717] dark:text-white">EPF Corpus at Retirement</h3>
              <p className="text-[12px] text-[#888888] dark:text-[#737373] font-mono mt-0.5">Compounded @ 8.25% over 25 yrs</p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Projected PF Balance</span>
              <span className="text-2xl font-bold font-mono text-[#7928ca] tracking-tight">
                {formatINR(futureEpfCorpus)}
              </span>
            </div>
            <p className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
              Your monthly EPF deduction ({formatINR(epfMonthly)}) matched by your employer ({formatINR(epfMonthly)}) compounding tax-free under Section 10(11).
            </p>
          </div>
          <p className="text-[11px] text-[#888888] dark:text-[#737373] leading-tight pt-2 border-t border-[#ebebeb] dark:border-[#262626]">
            Retirement corpus assumes steady contribution at current basic salary.
          </p>
        </div>
      </div>
    </div>
  );
};
