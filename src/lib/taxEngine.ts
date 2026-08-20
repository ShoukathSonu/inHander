import { STATE_PT_RULES } from './statePtRules.ts';

export interface SalaryInputs {
  annualCtc: number;
  basicPercent: number; // e.g. 50 (means 50% of CTC is Basic)
  customBasicAmount?: number;
  hraPercent: number; // e.g. 50 for Metro, 40 for Non-Metro
  isMetroCity: boolean;
  stateCode: string;
  isFemale?: boolean;
  
  // EPF Configuration
  epfCapped: boolean; // true = capped at ₹1,800/mo (₹15,000 basic ceiling)
  employerPfInCtc: boolean; // true = employer 12% is part of CTC
  vpfMonthly: number; // Voluntary PF per month
  
  // Gratuity & Benefits
  includeGratuity: boolean; // 15/26 (~4.81% of basic) inside CTC
  otherEmployerBenefits: number; // Annual insurance / perks in CTC

  // Bonuses & Stocks
  variableBonusAnnual: number;
  joiningBonusAnnual: number;
  rsuVestedAnnual: number;

  // Rent & HRA (for Old Regime)
  annualRentPaid: number;
  
  // Old Regime Deductions (Chapter VI-A) & NPS
  sec80C_Investments: number; // PPF, ELSS, LIC, etc. (EPF auto-added)
  sec80D_SelfFamily: number; // Health Insurance self/family (max 25k)
  sec80D_Parents: number; // Health Insurance parents (max 25k or 50k senior)
  sec80D_ParentsSenior: boolean;
  sec80CCD1B_NPS: number; // Additional NPS (max 50k)
  sec80CCD2_EmployerNps: number; // Corporate NPS amount
  employerNpsPercent: number; // 0, 10, or 14% of Basic (Sec 80CCD(2))
  sec24_HomeLoanInterest: number; // max 2,00,000
  sec80E_EducationLoanInterest: number;
  sec80TTA_SavingsInterest: number; // max 10,000
  otherTaxExemptions: number; // Food coupons, LTA, books
}

export interface TaxRegimeBreakdown {
  regime: 'NEW' | 'OLD';
  grossAnnualSalary: number;
  standardDeduction: number;
  hraExemption: number;
  professionalTaxDeduction: number;
  otherExemptions: number;
  chapter6ADeductions: number;
  netTaxableIncome: number;
  
  // Tax calculation details
  slabTax: number;
  sec87aRebate: number;
  marginalRelief: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number; // 4%
  totalAnnualTax: number;
  monthlyTax: number;
  
  // In-hand pay
  monthlyGross: number;
  monthlyEmployeePf: number;
  monthlyVpf: number;
  monthlyPt: number;
  monthlyTakeHome: number;
  annualTakeHome: number;
  effectiveTaxRate: number; // %
}

export interface CompensationSplit {
  guaranteedBaseCtc: number;
  monthlyGuaranteedInHand: number;
  yearlyBonusGross: number;
  yearlyBonusNet: number;
  annualEsopValue: number;
}

export interface FullSalaryAnalysis {
  inputs: SalaryInputs;
  basicAnnual: number;
  hraAnnual: number;
  specialAllowanceAnnual: number;
  employerPfAnnual: number;
  gratuityAnnual: number;
  grossAnnualSalary: number;
  monthlyGross: number;
  
  employeePfAnnual: number;
  vpfAnnual: number;
  ptAnnual: number;

  newRegime: TaxRegimeBreakdown;
  oldRegime: TaxRegimeBreakdown;
  
  betterRegime: 'NEW' | 'OLD' | 'EQUAL';
  annualTaxSavings: number;
  monthlyTakeHomeDifference: number;
  recommendationNote: string;

  // New High-Retention Metrics
  employerNpsAmount: number;
  npsTaxSavingsAnnual: number;
  compensationSplit: CompensationSplit;
}

export const DEFAULT_SALARY_INPUTS: SalaryInputs = {
  annualCtc: 1200000, // 12 LPA default
  basicPercent: 50,
  hraPercent: 50,
  isMetroCity: true,
  stateCode: 'KA', // Karnataka / Bengaluru default
  isFemale: false,
  
  epfCapped: false, // 12% uncapped standard for tech
  employerPfInCtc: true,
  vpfMonthly: 0,
  
  includeGratuity: true,
  otherEmployerBenefits: 0,
  
  variableBonusAnnual: 0,
  joiningBonusAnnual: 0,
  rsuVestedAnnual: 0,
  
  annualRentPaid: 240000, // ₹20k/mo rent
  
  sec80C_Investments: 50000,
  sec80D_SelfFamily: 25000,
  sec80D_Parents: 25000,
  sec80D_ParentsSenior: false,
  sec80CCD1B_NPS: 0,
  sec80CCD2_EmployerNps: 0,
  employerNpsPercent: 0,
  sec24_HomeLoanInterest: 0,
  sec80E_EducationLoanInterest: 0,
  sec80TTA_SavingsInterest: 0,
  otherTaxExemptions: 0
};

/**
 * Calculates Section 10(13A) HRA Exemption for Old Tax Regime
 */
export function calculateHraExemption(
  basicAnnual: number,
  hraReceivedAnnual: number,
  annualRentPaid: number,
  isMetro: boolean
): number {
  if (annualRentPaid <= 0 || hraReceivedAnnual <= 0) return 0;
  
  const excessRentOver10Percent = Math.max(0, annualRentPaid - (0.10 * basicAnnual));
  const metroCap = isMetro ? (0.50 * basicAnnual) : (0.40 * basicAnnual);
  
  return Math.min(hraReceivedAnnual, excessRentOver10Percent, metroCap);
}

/**
 * Calculates New Tax Regime Income Tax (Budget 2024 / FY 2024-25, FY 2025-26, FY 2026-27)
 */
export function calculateNewRegimeTax(taxableIncome: number): {
  slabTax: number;
  sec87aRebate: number;
  marginalRelief: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
} {
  if (taxableIncome <= 0) {
    return { slabTax: 0, sec87aRebate: 0, marginalRelief: 0, taxAfterRebate: 0, surcharge: 0, cess: 0, totalTax: 0 };
  }

  let slabTax = 0;

  if (taxableIncome <= 300000) {
    slabTax = 0;
  } else if (taxableIncome <= 700000) {
    slabTax = (taxableIncome - 300000) * 0.05;
  } else if (taxableIncome <= 1000000) {
    slabTax = (400000 * 0.05) + ((taxableIncome - 700000) * 0.10); // 20k + 10%
  } else if (taxableIncome <= 1200000) {
    slabTax = (400000 * 0.05) + (300000 * 0.10) + ((taxableIncome - 1000000) * 0.15); // 50k + 15%
  } else if (taxableIncome <= 1500000) {
    slabTax = (400000 * 0.05) + (300000 * 0.10) + (200000 * 0.15) + ((taxableIncome - 1200000) * 0.20); // 80k + 20%
  } else {
    slabTax = (400000 * 0.05) + (300000 * 0.10) + (200000 * 0.15) + (300000 * 0.20) + ((taxableIncome - 1500000) * 0.30); // 1.4L + 30%
  }

  let sec87aRebate = 0;
  let marginalRelief = 0;
  let taxAfterRebate = slabTax;

  if (taxableIncome <= 700000) {
    sec87aRebate = slabTax;
    taxAfterRebate = 0;
  } else {
    // Marginal relief check: Tax cannot exceed (taxableIncome - 700000)
    const excessIncomeOver7L = taxableIncome - 700000;
    if (slabTax > excessIncomeOver7L) {
      marginalRelief = slabTax - excessIncomeOver7L;
      taxAfterRebate = excessIncomeOver7L;
    }
  }

  // Surcharge (New Regime: 50L-1Cr: 10%, 1Cr-2Cr: 15%, >2Cr: 25%)
  let surcharge = 0;
  if (taxableIncome > 20000000) {
    surcharge = taxAfterRebate * 0.25;
  } else if (taxableIncome > 10000000) {
    surcharge = taxAfterRebate * 0.15;
  } else if (taxableIncome > 5000000) {
    surcharge = taxAfterRebate * 0.10;
  }

  // 4% Health and Education Cess
  const cess = (taxAfterRebate + surcharge) * 0.04;
  const totalTax = Math.round(taxAfterRebate + surcharge + cess);

  return {
    slabTax: Math.round(slabTax),
    sec87aRebate: Math.round(sec87aRebate),
    marginalRelief: Math.round(marginalRelief),
    taxAfterRebate: Math.round(taxAfterRebate),
    surcharge: Math.round(surcharge),
    cess: Math.round(cess),
    totalTax
  };
}

/**
 * Calculates Old Tax Regime Income Tax
 */
export function calculateOldRegimeTax(taxableIncome: number): {
  slabTax: number;
  sec87aRebate: number;
  marginalRelief: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
} {
  if (taxableIncome <= 0) {
    return { slabTax: 0, sec87aRebate: 0, marginalRelief: 0, taxAfterRebate: 0, surcharge: 0, cess: 0, totalTax: 0 };
  }

  let slabTax = 0;

  if (taxableIncome <= 250000) {
    slabTax = 0;
  } else if (taxableIncome <= 500000) {
    slabTax = (taxableIncome - 250000) * 0.05;
  } else if (taxableIncome <= 1000000) {
    slabTax = (250000 * 0.05) + ((taxableIncome - 500000) * 0.20); // 12.5k + 20%
  } else {
    slabTax = (250000 * 0.05) + (500000 * 0.20) + ((taxableIncome - 1000000) * 0.30); // 1.125L + 30%
  }

  let sec87aRebate = 0;
  let marginalRelief = 0;
  let taxAfterRebate = slabTax;

  if (taxableIncome <= 500000) {
    sec87aRebate = slabTax;
    taxAfterRebate = 0;
  }

  // Surcharge (Old Regime)
  let surcharge = 0;
  if (taxableIncome > 50000000) {
    surcharge = taxAfterRebate * 0.37;
  } else if (taxableIncome > 20000000) {
    surcharge = taxAfterRebate * 0.25;
  } else if (taxableIncome > 10000000) {
    surcharge = taxAfterRebate * 0.15;
  } else if (taxableIncome > 5000000) {
    surcharge = taxAfterRebate * 0.10;
  }

  // 4% Cess
  const cess = (taxAfterRebate + surcharge) * 0.04;
  const totalTax = Math.round(taxAfterRebate + surcharge + cess);

  return {
    slabTax: Math.round(slabTax),
    sec87aRebate: Math.round(sec87aRebate),
    marginalRelief: 0,
    taxAfterRebate: Math.round(taxAfterRebate),
    surcharge: Math.round(surcharge),
    cess: Math.round(cess),
    totalTax
  };
}

/**
 * Master Comprehensive Calculator
 */
export function calculateSalary(inputs: SalaryInputs): FullSalaryAnalysis {
  const {
    annualCtc,
    basicPercent,
    customBasicAmount,
    hraPercent,
    isMetroCity,
    stateCode,
    isFemale = false,
    epfCapped,
    employerPfInCtc,
    vpfMonthly,
    includeGratuity,
    otherEmployerBenefits,
    variableBonusAnnual,
    joiningBonusAnnual,
    rsuVestedAnnual,
    annualRentPaid,
    sec80C_Investments,
    sec80D_SelfFamily,
    sec80D_Parents,
    sec80D_ParentsSenior,
    sec80CCD1B_NPS,
    sec80CCD2_EmployerNps,
    employerNpsPercent = 0,
    sec24_HomeLoanInterest,
    sec80E_EducationLoanInterest,
    sec80TTA_SavingsInterest,
    otherTaxExemptions
  } = inputs;

  // 1. Basic Salary
  const basicAnnual = customBasicAmount !== undefined && customBasicAmount > 0 
    ? customBasicAmount 
    : Math.round(annualCtc * (basicPercent / 100));

  // Section 80CCD(2) Employer NPS calculation: either percentage or custom amount
  const effectiveEmployerNps = employerNpsPercent > 0
    ? Math.round(basicAnnual * (employerNpsPercent / 100))
    : (sec80CCD2_EmployerNps || 0);

  // 2. EPF Calculations
  let monthlyEmployeePf = 0;
  let monthlyEmployerPf = 0;

  if (epfCapped) {
    // ₹15,000 statutory limit => ₹1,800/mo
    monthlyEmployeePf = 1800;
    monthlyEmployerPf = 1800;
  } else {
    monthlyEmployeePf = Math.round((basicAnnual / 12) * 0.12);
    monthlyEmployerPf = Math.round((basicAnnual / 12) * 0.12);
  }

  const employeePfAnnual = monthlyEmployeePf * 12;
  const employerPfAnnual = monthlyEmployerPf * 12;
  const vpfAnnual = (vpfMonthly || 0) * 12;

  // 3. Gratuity Calculation (15/26 formula: ~4.81% of basic salary)
  const gratuityAnnual = includeGratuity 
    ? Math.round((15 / 26) * (basicAnnual / 12))
    : 0;

  // 4. Gross Annual Salary
  // If employer PF & Gratuity are inside CTC, deduct them to arrive at employee gross
  const employerDeductionsFromCtc = 
    (employerPfInCtc ? employerPfAnnual : 0) + 
    gratuityAnnual + 
    (otherEmployerBenefits || 0);

  const grossAnnualSalary = Math.max(0, annualCtc - employerDeductionsFromCtc);
  const monthlyGross = Math.round(grossAnnualSalary / 12);

  // 5. HRA & Special Allowance Breakdown
  const hraAnnual = Math.round(basicAnnual * (hraPercent / 100));
  const otherAdditions = (variableBonusAnnual || 0) + (joiningBonusAnnual || 0) + (rsuVestedAnnual || 0);
  const specialAllowanceAnnual = Math.max(0, grossAnnualSalary - basicAnnual - hraAnnual);

  // 6. Professional Tax
  const ptRule = STATE_PT_RULES[stateCode] || STATE_PT_RULES.KA;
  const ptAnnual = ptRule.calculateAnnualPt(monthlyGross, isFemale);
  const monthlyPt = Math.round(ptAnnual / 12);

  // 7. NEW TAX REGIME BREAKDOWN
  const newStdDeduction = 75000; // Budget 2024 revised from 50k
  // Under New Regime, 80CCD(2) employer NPS is deductible
  const newNetTaxableIncome = Math.max(0, grossAnnualSalary + otherAdditions - newStdDeduction - effectiveEmployerNps);
  const newTaxResult = calculateNewRegimeTax(newNetTaxableIncome);
  const newMonthlyTax = Math.round(newTaxResult.totalTax / 12);
  const newMonthlyTakeHome = Math.max(0, monthlyGross - monthlyEmployeePf - (vpfMonthly || 0) - monthlyPt - newMonthlyTax);
  const newAnnualTakeHome = (newMonthlyTakeHome * 12) + (otherAdditions > 0 ? Math.max(0, otherAdditions - (newTaxResult.totalTax - calculateNewRegimeTax(Math.max(0, grossAnnualSalary - newStdDeduction - effectiveEmployerNps)).totalTax)) : 0);

  const newRegime: TaxRegimeBreakdown = {
    regime: 'NEW',
    grossAnnualSalary: grossAnnualSalary + otherAdditions,
    standardDeduction: newStdDeduction,
    hraExemption: 0,
    professionalTaxDeduction: 0,
    otherExemptions: effectiveEmployerNps,
    chapter6ADeductions: 0,
    netTaxableIncome: newNetTaxableIncome,
    slabTax: newTaxResult.slabTax,
    sec87aRebate: newTaxResult.sec87aRebate,
    marginalRelief: newTaxResult.marginalRelief,
    taxAfterRebate: newTaxResult.taxAfterRebate,
    surcharge: newTaxResult.surcharge,
    cess: newTaxResult.cess,
    totalAnnualTax: newTaxResult.totalTax,
    monthlyTax: newMonthlyTax,
    monthlyGross,
    monthlyEmployeePf,
    monthlyVpf: vpfMonthly || 0,
    monthlyPt,
    monthlyTakeHome: newMonthlyTakeHome,
    annualTakeHome: newAnnualTakeHome,
    effectiveTaxRate: (grossAnnualSalary + otherAdditions) > 0 ? (newTaxResult.totalTax / (grossAnnualSalary + otherAdditions)) * 100 : 0
  };

  // 8. OLD TAX REGIME BREAKDOWN
  const oldStdDeduction = 50000;
  const hraExemption = calculateHraExemption(basicAnnual, hraAnnual, annualRentPaid, isMetroCity);
  
  // Section 80C calculation: Employee PF + VPF + User 80C investments, capped at 1.5 Lakhs
  const total80CDeclared = (sec80C_Investments || 0) + employeePfAnnual + vpfAnnual;
  const eligible80C = Math.min(150000, total80CDeclared);

  // Section 80D: Self/Family (max 25k) + Parents (max 25k or 50k if senior)
  const selfFamily80D = Math.min(25000, sec80D_SelfFamily || 0);
  const parentsMax80D = sec80D_ParentsSenior ? 50000 : 25000;
  const parents80D = Math.min(parentsMax80D, sec80D_Parents || 0);
  const total80D = selfFamily80D + parents80D;

  // NPS 80CCD(1B): max 50k
  const eligible80CCD1B = Math.min(50000, sec80CCD1B_NPS || 0);

  // Home Loan 24(b): max 2 Lakhs
  const eligibleSec24 = Math.min(200000, sec24_HomeLoanInterest || 0);

  // Savings Interest 80TTA: max 10k
  const eligible80TTA = Math.min(10000, sec80TTA_SavingsInterest || 0);

  // Total Chapter VI-A Deductions
  const chapter6ADeductions = 
    eligible80C + 
    total80D + 
    eligible80CCD1B + 
    effectiveEmployerNps + 
    eligibleSec24 + 
    (sec80E_EducationLoanInterest || 0) + 
    eligible80TTA;

  // Gross Total Income (Old Regime)
  const oldExemptions = oldStdDeduction + ptAnnual + hraExemption + (otherTaxExemptions || 0);
  const oldNetTaxableIncome = Math.max(0, (grossAnnualSalary + otherAdditions) - oldExemptions - chapter6ADeductions);

  const oldTaxResult = calculateOldRegimeTax(oldNetTaxableIncome);
  const oldMonthlyTax = Math.round(oldTaxResult.totalTax / 12);
  const oldMonthlyTakeHome = Math.max(0, monthlyGross - monthlyEmployeePf - (vpfMonthly || 0) - monthlyPt - oldMonthlyTax);
  const oldAnnualTakeHome = (oldMonthlyTakeHome * 12) + (otherAdditions > 0 ? Math.max(0, otherAdditions - (oldTaxResult.totalTax - calculateOldRegimeTax(Math.max(0, grossAnnualSalary - oldExemptions - chapter6ADeductions)).totalTax)) : 0);

  const oldRegime: TaxRegimeBreakdown = {
    regime: 'OLD',
    grossAnnualSalary: grossAnnualSalary + otherAdditions,
    standardDeduction: oldStdDeduction,
    hraExemption,
    professionalTaxDeduction: ptAnnual,
    otherExemptions: (otherTaxExemptions || 0) + effectiveEmployerNps,
    chapter6ADeductions,
    netTaxableIncome: oldNetTaxableIncome,
    slabTax: oldTaxResult.slabTax,
    sec87aRebate: oldTaxResult.sec87aRebate,
    marginalRelief: 0,
    taxAfterRebate: oldTaxResult.taxAfterRebate,
    surcharge: oldTaxResult.surcharge,
    cess: oldTaxResult.cess,
    totalAnnualTax: oldTaxResult.totalTax,
    monthlyTax: oldMonthlyTax,
    monthlyGross,
    monthlyEmployeePf,
    monthlyVpf: vpfMonthly || 0,
    monthlyPt,
    monthlyTakeHome: oldMonthlyTakeHome,
    annualTakeHome: oldAnnualTakeHome,
    effectiveTaxRate: (grossAnnualSalary + otherAdditions) > 0 ? (oldTaxResult.totalTax / (grossAnnualSalary + otherAdditions)) * 100 : 0
  };

  // 9. Section 80CCD(2) Tax Savings Calculation
  // Calculate tax without NPS to find exact rupee savings
  let npsTaxSavingsAnnual = 0;
  if (effectiveEmployerNps > 0) {
    const taxWithoutNpsNew = calculateNewRegimeTax(Math.max(0, grossAnnualSalary + otherAdditions - newStdDeduction)).totalTax;
    const taxWithoutNpsOld = calculateOldRegimeTax(Math.max(0, (grossAnnualSalary + otherAdditions) - oldExemptions - (chapter6ADeductions - effectiveEmployerNps))).totalTax;
    
    const betterTaxWithNps = Math.min(newRegime.totalAnnualTax, oldRegime.totalAnnualTax);
    const betterTaxWithoutNps = Math.min(taxWithoutNpsNew, taxWithoutNpsOld);
    npsTaxSavingsAnnual = Math.max(0, betterTaxWithoutNps - betterTaxWithNps);
  }

  // 10. Task 1: "Real Cash vs. Paper Money" Compensation Split (Direct calculation without recursion)
  const guaranteedBaseCtc = Math.max(0, annualCtc - (variableBonusAnnual || 0) - (rsuVestedAnnual || 0));
  let monthlyGuaranteedInHand = (newRegime.totalAnnualTax <= oldRegime.totalAnnualTax ? newRegime : oldRegime).monthlyTakeHome;

  if (guaranteedBaseCtc !== annualCtc) {
    const baseBasicAnnual = customBasicAmount !== undefined && customBasicAmount > 0 
      ? customBasicAmount 
      : Math.round(guaranteedBaseCtc * (basicPercent / 100));
    
    let baseMonthlyEmployeePf = 0;
    let baseMonthlyEmployerPf = 0;
    if (epfCapped) {
      baseMonthlyEmployeePf = 1800;
      baseMonthlyEmployerPf = 1800;
    } else {
      baseMonthlyEmployeePf = Math.round((baseBasicAnnual / 12) * 0.12);
      baseMonthlyEmployerPf = Math.round((baseBasicAnnual / 12) * 0.12);
    }
    const baseEmployerPfAnnual = baseMonthlyEmployerPf * 12;
    const baseGratuityAnnual = includeGratuity ? Math.round(baseBasicAnnual * 0.0481) : 0;
    const baseEmployerDeductions = (employerPfInCtc ? baseEmployerPfAnnual : 0) + baseGratuityAnnual + (otherEmployerBenefits || 0);
    const baseGrossAnnual = Math.max(0, guaranteedBaseCtc - baseEmployerDeductions);
    const baseMonthlyGross = Math.round(baseGrossAnnual / 12);
    const basePtAnnual = ptRule.calculateAnnualPt(baseMonthlyGross, isFemale);
    const baseMonthlyPt = Math.round(basePtAnnual / 12);
    const baseNps = employerNpsPercent > 0 ? Math.round(baseBasicAnnual * (employerNpsPercent / 100)) : (sec80CCD2_EmployerNps || 0);
    
    // Base New Regime
    const baseNewTaxable = Math.max(0, baseGrossAnnual - newStdDeduction - baseNps);
    const baseNewTaxResult = calculateNewRegimeTax(baseNewTaxable);
    const baseNewMonthlyTax = Math.round(baseNewTaxResult.totalTax / 12);
    const baseNewTakeHome = Math.max(0, baseMonthlyGross - baseMonthlyEmployeePf - (vpfMonthly || 0) - baseMonthlyPt - baseNewMonthlyTax);

    // Base Old Regime
    const baseHraAnnual = Math.round(baseBasicAnnual * (hraPercent / 100));
    const baseHraExemption = calculateHraExemption(baseBasicAnnual, baseHraAnnual, annualRentPaid, isMetroCity);
    const base80C = Math.min(150000, (sec80C_Investments || 0) + (baseMonthlyEmployeePf * 12) + vpfAnnual);
    const baseChap6A = base80C + total80D + eligible80CCD1B + baseNps + eligibleSec24 + (sec80E_EducationLoanInterest || 0) + eligible80TTA;
    const baseOldExemptions = oldStdDeduction + basePtAnnual + baseHraExemption + (otherTaxExemptions || 0);
    const baseOldTaxable = Math.max(0, baseGrossAnnual - baseOldExemptions - baseChap6A);
    const baseOldTaxResult = calculateOldRegimeTax(baseOldTaxable);
    const baseOldMonthlyTax = Math.round(baseOldTaxResult.totalTax / 12);
    const baseOldTakeHome = Math.max(0, baseMonthlyGross - baseMonthlyEmployeePf - (vpfMonthly || 0) - baseMonthlyPt - baseOldMonthlyTax);

    monthlyGuaranteedInHand = baseNewTaxResult.totalTax <= baseOldTaxResult.totalTax ? baseNewTakeHome : baseOldTakeHome;
  }

  const yearlyBonusGross = variableBonusAnnual || 0;
  const activeBestRegime = newRegime.totalAnnualTax <= oldRegime.totalAnnualTax ? newRegime : oldRegime;
  
  // Tax on bonus
  const baseGrossWithoutBonus = grossAnnualSalary; // base without extra additions
  const taxWithoutBonus = calculateNewRegimeTax(Math.max(0, baseGrossWithoutBonus - newStdDeduction - effectiveEmployerNps)).totalTax;
  const taxDifferenceFromBonus = Math.max(0, activeBestRegime.totalAnnualTax - taxWithoutBonus);
  const yearlyBonusNet = Math.max(0, yearlyBonusGross - taxDifferenceFromBonus);
  const annualEsopValue = rsuVestedAnnual || 0;

  const compensationSplit: CompensationSplit = {
    guaranteedBaseCtc,
    monthlyGuaranteedInHand,
    yearlyBonusGross,
    yearlyBonusNet,
    annualEsopValue
  };

  // 11. Comparison & Recommendation
  const taxDiff = oldRegime.totalAnnualTax - newRegime.totalAnnualTax;
  let betterRegime: 'NEW' | 'OLD' | 'EQUAL' = 'EQUAL';
  let annualTaxSavings = 0;
  let recommendationNote = '';

  if (taxDiff > 100) {
    betterRegime = 'NEW';
    annualTaxSavings = taxDiff;
    recommendationNote = `New Regime saves you ₹${annualTaxSavings.toLocaleString('en-IN')}/year (₹${Math.round(annualTaxSavings / 12).toLocaleString('en-IN')}/mo extra in hand). With ₹75k standard deduction & lower tax slabs, New Regime is optimal.`;
  } else if (taxDiff < -100) {
    betterRegime = 'OLD';
    annualTaxSavings = Math.abs(taxDiff);
    recommendationNote = `Old Regime saves you ₹${annualTaxSavings.toLocaleString('en-IN')}/year due to your high deductions (HRA exemption ₹${hraExemption.toLocaleString('en-IN')} & Section 80 deductions ₹${chapter6ADeductions.toLocaleString('en-IN')}).`;
  } else {
    betterRegime = 'EQUAL';
    annualTaxSavings = 0;
    recommendationNote = `Both tax regimes result in identical tax payable. You can pick New Regime for zero paperwork/proof submissions.`;
  }

  return {
    inputs,
    basicAnnual,
    hraAnnual,
    specialAllowanceAnnual,
    employerPfAnnual,
    gratuityAnnual,
    grossAnnualSalary,
    monthlyGross,
    employeePfAnnual,
    vpfAnnual,
    ptAnnual,
    newRegime,
    oldRegime,
    betterRegime,
    annualTaxSavings,
    monthlyTakeHomeDifference: Math.abs(newRegime.monthlyTakeHome - oldRegime.monthlyTakeHome),
    recommendationNote,
    employerNpsAmount: effectiveEmployerNps,
    npsTaxSavingsAnnual,
    compensationSplit
  };
}
