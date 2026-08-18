import React, { useState } from 'react';
import { calculateSalary, DEFAULT_SALARY_INPUTS, type SalaryInputs } from '../lib/taxEngine';
import { formatINR } from '../lib/formatters';
import { DocumentImportModal } from './DocumentImportModal';
import { Plus, Trash2, Award, Scan, FileText, Wallet, Sparkles } from 'lucide-react';

interface OfferProfile {
  id: string;
  name: string;
  company: string;
  ctc: number;
  variablePay: number;
  stockAnnual: number;
  joiningBonus: number;
  relocation: number;
  stateCode: string;
}

const INITIAL_OFFERS: OfferProfile[] = [
  {
    id: '1',
    name: 'Current Role',
    company: 'Current Employer',
    ctc: 1200000,
    variablePay: 0,
    stockAnnual: 0,
    joiningBonus: 0,
    relocation: 0,
    stateCode: 'KA'
  },
  {
    id: '2',
    name: 'Offer A (Product Co)',
    company: 'Tech Unicorn',
    ctc: 1800000,
    variablePay: 150000,
    stockAnnual: 300000,
    joiningBonus: 100000,
    relocation: 50000,
    stateCode: 'KA'
  },
  {
    id: '3',
    name: 'Offer B (Remote Startup)',
    company: 'US Startup (India Entity)',
    ctc: 2200000,
    variablePay: 200000,
    stockAnnual: 400000,
    joiningBonus: 200000,
    relocation: 0,
    stateCode: 'KA'
  }
];

export const OfferComparator: React.FC = () => {
  const [offers, setOffers] = useState<OfferProfile[]>(INITIAL_OFFERS);
  const [scanningOfferId, setScanningOfferId] = useState<string | null>(null);

  const handleUpdate = (id: string, field: keyof OfferProfile, value: any) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const handleApplyToOffer = (extracted: Partial<SalaryInputs>) => {
    if (!scanningOfferId) return;
    setOffers(prev => prev.map(o => {
      if (o.id !== scanningOfferId) return o;
      return {
        ...o,
        ctc: extracted.annualCtc || o.ctc,
        variablePay: extracted.variableBonusAnnual ?? o.variablePay,
        joiningBonus: extracted.joiningBonusAnnual ?? o.joiningBonus,
        stockAnnual: extracted.rsuVestedAnnual ?? o.stockAnnual,
        stateCode: extracted.stateCode ?? o.stateCode
      };
    }));
  };

  const handleAddOffer = () => {
    if (offers.length >= 4) return;
    const newOffer: OfferProfile = {
      id: Date.now().toString(),
      name: `Offer ${String.fromCharCode(65 + offers.length - 1)}`,
      company: 'New Company',
      ctc: 2000000,
      variablePay: 0,
      stockAnnual: 0,
      joiningBonus: 0,
      relocation: 0,
      stateCode: 'KA'
    };
    setOffers(prev => [...prev, newOffer]);
  };

  const handleRemove = (id: string) => {
    if (offers.length <= 2) return;
    setOffers(prev => prev.filter(o => o.id !== id));
  };

  // Compute calculated metrics for each offer
  const evaluated = offers.map(offer => {
    const inputs: SalaryInputs = {
      ...DEFAULT_SALARY_INPUTS,
      annualCtc: offer.ctc,
      stateCode: offer.stateCode,
      variableBonusAnnual: offer.variablePay,
      joiningBonusAnnual: offer.joiningBonus,
      rsuVestedAnnual: offer.stockAnnual
    };
    const analysis = calculateSalary(inputs);
    const bestRegime = analysis.betterRegime === 'OLD' ? analysis.oldRegime : analysis.newRegime;
    const firstYearTotal = offer.ctc + offer.stockAnnual + offer.joiningBonus + offer.relocation;
    
    return {
      offer,
      analysis,
      monthlyTakeHome: bestRegime.monthlyTakeHome,
      annualTakeHome: bestRegime.annualTakeHome,
      totalTax: bestRegime.totalAnnualTax,
      firstYearTotal
    };
  });

  // Base offer (first offer in array) for hike comparison
  const baseOffer = evaluated[0];

  // Find the top offer by monthly take home
  const topMonthlyOfferId = [...evaluated].sort((a, b) => b.monthlyTakeHome - a.monthlyTakeHome)[0]?.offer.id;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Header card */}
      <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 sm:p-8 border border-[#ebebeb] dark:border-[#262626] shadow-stacked transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#171717] dark:bg-white text-white dark:text-[#171717]">
                Multi-Offer Comparison
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] dark:text-white tracking-tight mt-1">
              Compare Job Offers Side-by-Side.
            </h2>
            <p className="text-[14px] text-[#4d4d4d] dark:text-[#a1a1a1] mt-1 max-w-2xl">
              Evaluate real monthly take-home, first-year total value (joining bonus + ESOPs/RSUs), and tax impact across multiple offers.
            </p>
          </div>

          {offers.length < 4 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOffers([
                  { id: '1', name: 'Current Role', company: 'Current Tech Co', ctc: 1500000, variablePay: 100000, stockAnnual: 0, joiningBonus: 0, relocation: 0, stateCode: 'KA' },
                  { id: '2', name: 'Product Unicorn (High Base)', company: 'Fintech Leader', ctc: 2500000, variablePay: 250000, stockAnnual: 300000, joiningBonus: 150000, relocation: 0, stateCode: 'KA' },
                  { id: '3', name: 'Remote US Startup', company: 'AI Startup', ctc: 3000000, variablePay: 0, stockAnnual: 500000, joiningBonus: 200000, relocation: 0, stateCode: 'KA' }
                ])}
                className="px-3 py-1.5 rounded-full border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#181818] text-[#4d4d4d] dark:text-[#a1a1a1] text-[12px] font-medium hover:text-[#171717] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#222222] transition-colors cursor-pointer"
              >
                Load: Unicorn vs Remote vs Current
              </button>
              <button
                onClick={handleAddOffer}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-[13px] font-medium hover:bg-[#333333] dark:hover:bg-[#e0e0e0] transition-colors self-start sm:self-auto shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Offer
              </button>
            </div>
          )}
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {evaluated.map(({ offer, monthlyTakeHome, annualTakeHome, totalTax, firstYearTotal }, index) => {
            const isWinner = offer.id === topMonthlyOfferId && evaluated.length > 1;

            // Hike calculations relative to the first offer (Current Role)
            const isComparative = index > 0 && baseOffer && baseOffer.offer.ctc > 0;
            const nominalHike = isComparative ? ((offer.ctc - baseOffer.offer.ctc) / baseOffer.offer.ctc) * 100 : 0;
            const realHike = isComparative && baseOffer.monthlyTakeHome > 0
              ? ((monthlyTakeHome - baseOffer.monthlyTakeHome) / baseOffer.monthlyTakeHome) * 100
              : 0;
            const extraCashMonthly = isComparative ? monthlyTakeHome - baseOffer.monthlyTakeHome : 0;

            return (
              <div
                key={offer.id}
                className={`rounded-2xl p-6 border transition-all relative ${
                  isWinner
                    ? 'bg-[#fafafa] dark:bg-[#181818] border-[#10b981] shadow-stacked-lg ring-1 ring-[#10b981]'
                    : 'bg-white dark:bg-[#121212] border-[#ebebeb] dark:border-[#262626] shadow-stacked-sm'
                }`}
              >
                {isWinner && (
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-[#10b981] text-white text-[11px] font-mono font-semibold flex items-center gap-1 shadow-xs">
                    <Award className="w-3.5 h-3.5" />
                    Highest Monthly In-Hand
                  </div>
                )}

                {/* Offer Title & Actions */}
                <div className="flex items-center justify-between pb-3 border-b border-[#ebebeb] dark:border-[#262626]">
                  <div className="w-full">
                    <input
                      type="text"
                      value={offer.name}
                      onChange={(e) => handleUpdate(offer.id, 'name', e.target.value)}
                      className="font-bold text-[16px] text-[#171717] dark:text-white bg-transparent border-b border-dashed border-transparent hover:border-[#a1a1a1] focus:border-[#171717] dark:focus:border-white focus:outline-hidden w-full"
                    />
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <input
                        type="text"
                        value={offer.company}
                        onChange={(e) => handleUpdate(offer.id, 'company', e.target.value)}
                        className="text-[12px] text-[#888888] dark:text-[#737373] font-mono bg-transparent border-b border-dashed border-transparent hover:border-[#a1a1a1] focus:border-[#171717] dark:focus:border-white focus:outline-hidden flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setScanningOfferId(offer.id)}
                        className="text-[11px] font-mono text-[#0070f3] dark:text-[#38bdf8] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Scan offer letter for this column"
                      >
                        <Scan className="w-3 h-3" />
                        <span>Scan PDF</span>
                      </button>
                    </div>
                  </div>
                  {offers.length > 2 && (
                    <button
                      onClick={() => handleRemove(offer.id)}
                      className="p-1 text-[#888888] hover:text-[#ee0000] transition-colors ml-2 cursor-pointer"
                      title="Remove offer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Main Take Home Highlight */}
                <div className="py-4 border-b border-[#ebebeb] dark:border-[#262626] space-y-1">
                  <span className="text-[11px] font-mono uppercase text-[#888888] dark:text-[#737373] block">Net In-Hand / Month</span>
                  <div className="text-3xl font-bold font-mono text-[#10b981]">
                    {formatINR(monthlyTakeHome)}
                  </div>
                  <span className="text-[12px] font-mono text-[#4d4d4d] dark:text-[#a1a1a1] block">
                    Annual Net: <strong className="text-[#171717] dark:text-white">{formatINR(annualTakeHome)}</strong>
                  </span>
                </div>

                {/* Task 3: Real In-Hand Hike Reality Badge (when comparing against current role) */}
                {isComparative && (
                  <div className="py-3 border-b border-[#ebebeb] dark:border-[#262626] space-y-2 bg-[#fafafa]/50 dark:bg-[#181818]/50 -mx-6 px-6">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888] dark:text-[#737373] block">
                      Hike vs. {baseOffer.offer.name}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-white dark:bg-[#121212] border border-[#ebebeb] dark:border-[#262626] text-left">
                        <span className="text-[10px] text-[#888888] dark:text-[#737373] block font-mono">
                          📄 On Paper
                        </span>
                        <span className="text-[13px] font-bold font-mono text-[#171717] dark:text-white">
                          {nominalHike >= 0 ? '+' : ''}{nominalHike.toFixed(1)}%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-[#121212] border border-[#10b981]/30 text-left">
                        <span className="text-[10px] text-[#10b981] block font-mono font-semibold">
                          💰 Real In-Hand
                        </span>
                        <span className="text-[13px] font-bold font-mono text-[#10b981]">
                          {realHike >= 0 ? '+' : ''}{realHike.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#10b981] block">
                      {extraCashMonthly >= 0 ? `+${formatINR(extraCashMonthly)}/mo extra cash` : `${formatINR(extraCashMonthly)}/mo cash`}
                    </span>
                  </div>
                )}

                {/* Input Fields */}
                <div className="py-4 space-y-3 text-[13px] border-b border-[#ebebeb] dark:border-[#262626]">
                  <div>
                    <label className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block mb-1">Fixed CTC (Annual)</label>
                    <input
                      type="number"
                      step={50000}
                      value={offer.ctc || ''}
                      onChange={(e) => handleUpdate(offer.id, 'ctc', Number(e.target.value) || 0)}
                      className="w-full h-9 px-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] font-mono text-[#171717] dark:text-white bg-white dark:bg-[#181818] focus:outline-hidden focus:border-[#171717] dark:focus:border-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block mb-1">Variable Bonus</label>
                      <input
                        type="number"
                        value={offer.variablePay || ''}
                        onChange={(e) => handleUpdate(offer.id, 'variablePay', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] font-mono text-[#171717] dark:text-white text-[12px] bg-white dark:bg-[#181818] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block mb-1">Annual Stock (RSU)</label>
                      <input
                        type="number"
                        value={offer.stockAnnual || ''}
                        onChange={(e) => handleUpdate(offer.id, 'stockAnnual', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] font-mono text-[#171717] dark:text-white text-[12px] bg-white dark:bg-[#181818] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block mb-1">Joining Bonus</label>
                      <input
                        type="number"
                        value={offer.joiningBonus || ''}
                        onChange={(e) => handleUpdate(offer.id, 'joiningBonus', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] font-mono text-[#171717] dark:text-white text-[12px] bg-white dark:bg-[#181818] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-[#888888] dark:text-[#737373] uppercase block mb-1">Relocation / Perks</label>
                      <input
                        type="number"
                        value={offer.relocation || ''}
                        onChange={(e) => handleUpdate(offer.id, 'relocation', Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] font-mono text-[#171717] dark:text-white text-[12px] bg-white dark:bg-[#181818] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* 1st Year Total & Tax Summary */}
                <div className="pt-4 space-y-2 text-[12px]">
                  <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                    <span>Total 1st Year Value</span>
                    <span className="font-mono font-bold text-[#171717] dark:text-white">{formatINR(firstYearTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#4d4d4d] dark:text-[#a1a1a1]">
                    <span>Annual Income Tax</span>
                    <span className="font-mono text-[#ee0000]">{formatINR(totalTax)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Document OCR & PDF Import Modal */}
      <DocumentImportModal
        isOpen={!!scanningOfferId}
        onClose={() => setScanningOfferId(null)}
        onApply={handleApplyToOffer}
      />
    </div>
  );
};
