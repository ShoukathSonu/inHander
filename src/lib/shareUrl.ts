import type { SalaryInputs } from './taxEngine';
import { DEFAULT_SALARY_INPUTS } from './taxEngine';

export interface ExtraShareParams {
  exp?: number;
  regime?: 'NEW' | 'OLD';
}

/**
 * Encodes SalaryInputs and optional extras into URL query parameters
 */
export function encodeInputsToQuery(inputs: SalaryInputs, extraParams?: ExtraShareParams): string {
  const params = new URLSearchParams();
  params.set('ctc', inputs.annualCtc.toString());
  if (inputs.basicPercent !== DEFAULT_SALARY_INPUTS.basicPercent) params.set('bp', inputs.basicPercent.toString());
  if (inputs.stateCode !== DEFAULT_SALARY_INPUTS.stateCode) params.set('st', inputs.stateCode);
  if (!inputs.isMetroCity) params.set('metro', '0');
  if (inputs.epfCapped) params.set('pfc', '1');
  if (!inputs.employerPfInCtc) params.set('pfin', '0');
  if (!inputs.includeGratuity) params.set('grat', '0');
  if (inputs.annualRentPaid > 0) params.set('rent', inputs.annualRentPaid.toString());
  if (inputs.sec80C_Investments > 0) params.set('c80', inputs.sec80C_Investments.toString());
  if (inputs.sec80D_SelfFamily > 0) params.set('d80', inputs.sec80D_SelfFamily.toString());
  if (inputs.sec80CCD1B_NPS > 0) params.set('nps', inputs.sec80CCD1B_NPS.toString());
  if (inputs.employerNpsPercent > 0) params.set('nps2', inputs.employerNpsPercent.toString());
  if (inputs.sec24_HomeLoanInterest > 0) params.set('hl24', inputs.sec24_HomeLoanInterest.toString());
  if (inputs.variableBonusAnnual > 0) params.set('var', inputs.variableBonusAnnual.toString());
  if (inputs.rsuVestedAnnual > 0) params.set('stock', inputs.rsuVestedAnnual.toString());
  if (inputs.joiningBonusAnnual > 0) params.set('join', inputs.joiningBonusAnnual.toString());
  
  if (extraParams?.exp !== undefined) params.set('exp', extraParams.exp.toString());
  if (extraParams?.regime) params.set('regime', extraParams.regime.toLowerCase());

  return params.toString();
}

/**
 * Decodes URL query parameters into SalaryInputs & optional extras
 */
export function decodeQueryToInputs(searchString: string): SalaryInputs & { experienceYears?: number; preferredRegime?: 'NEW' | 'OLD' } {
  const params = new URLSearchParams(searchString);
  const inputs: SalaryInputs = { ...DEFAULT_SALARY_INPUTS };

  if (params.has('ctc')) {
    const ctc = parseFloat(params.get('ctc') || '');
    if (!isNaN(ctc) && ctc > 0) inputs.annualCtc = ctc;
  }
  if (params.has('bp')) {
    const bp = parseFloat(params.get('bp') || '');
    if (!isNaN(bp)) inputs.basicPercent = bp;
  }
  if (params.has('st')) inputs.stateCode = params.get('st') || 'KA';
  if (params.has('metro')) inputs.isMetroCity = params.get('metro') !== '0';
  if (params.has('pfc')) inputs.epfCapped = params.get('pfc') === '1';
  if (params.has('pfin')) inputs.employerPfInCtc = params.get('pfin') !== '0';
  if (params.has('grat')) inputs.includeGratuity = params.get('grat') !== '0';
  if (params.has('rent')) inputs.annualRentPaid = parseFloat(params.get('rent') || '0') || 0;
  if (params.has('c80')) inputs.sec80C_Investments = parseFloat(params.get('c80') || '0') || 0;
  if (params.has('d80')) inputs.sec80D_SelfFamily = parseFloat(params.get('d80') || '0') || 0;
  if (params.has('nps')) inputs.sec80CCD1B_NPS = parseFloat(params.get('nps') || '0') || 0;
  
  if (params.has('nps2')) {
    const nps2 = parseFloat(params.get('nps2') || '0');
    if (!isNaN(nps2)) inputs.employerNpsPercent = nps2;
  }
  
  if (params.has('hl24')) inputs.sec24_HomeLoanInterest = parseFloat(params.get('hl24') || '0') || 0;
  
  // Support both 'var' and legacy 'bonus'
  if (params.has('var')) {
    inputs.variableBonusAnnual = parseFloat(params.get('var') || '0') || 0;
  } else if (params.has('bonus')) {
    inputs.variableBonusAnnual = parseFloat(params.get('bonus') || '0') || 0;
  }

  // Support 'stock' / 'rsu'
  if (params.has('stock')) {
    inputs.rsuVestedAnnual = parseFloat(params.get('stock') || '0') || 0;
  } else if (params.has('rsu')) {
    inputs.rsuVestedAnnual = parseFloat(params.get('rsu') || '0') || 0;
  }

  if (params.has('join')) {
    inputs.joiningBonusAnnual = parseFloat(params.get('join') || '0') || 0;
  }

  let experienceYears: number | undefined;
  if (params.has('exp')) {
    const parsedExp = parseFloat(params.get('exp') || '');
    if (!isNaN(parsedExp) && parsedExp >= 0) experienceYears = parsedExp;
  }

  let preferredRegime: 'NEW' | 'OLD' | undefined;
  if (params.has('regime')) {
    const reg = (params.get('regime') || '').toUpperCase();
    if (reg === 'NEW' || reg === 'OLD') preferredRegime = reg as 'NEW' | 'OLD';
  }

  return { 
    ...inputs, 
    ...(experienceYears !== undefined ? { experienceYears } : {}),
    ...(preferredRegime !== undefined ? { preferredRegime } : {})
  };
}
