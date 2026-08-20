import { type SalaryInputs, DEFAULT_SALARY_INPUTS } from './taxEngine.ts';

export type DocumentType = 'PAYSLIP' | 'OFFER_LETTER' | 'APPRAISAL_LETTER' | 'FORM_16' | 'TAX_SHEET' | 'UNKNOWN';

export interface ProrationInfo {
  isProrated: boolean;
  totalDays: number;
  paidDays: number;
  lwpDays: number;
  prorationFactor: number;
  explanation: string;
}

export interface OneTimeOrVariableItem {
  label: string;
  amount: number;
  category: 'BONUS' | 'ARREARS' | 'LEAVE_ENCASHMENT' | 'OVERTIME' | 'RELOCATION' | 'INCENTIVE' | 'OTHER';
}

export interface CompensationBreakdown {
  documentType: DocumentType;
  classificationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  classificationReasons: string[];

  // Core Figures
  annualCtc: number;             // Stated or Projected Total Annual CTC
  annualGrossSalary: number;     // Normalized (Fixed Monthly * 12) + One-Time/Variable Components
  monthlyGross: number;          // Stated or total monthly gross (including one-time items)
  fixedMonthlyGross: number;     // Monthly gross excluding one-time/variable items
  normalizedFixedMonthlyGross: number; // Full-month normalized recurring fixed monthly gross
  actualMonthlyGross?: number;   // Raw stated gross from document
  monthlyNetPay?: number;        // Take home pay from payslip

  // Proration details (for payslips with LWP or partial month)
  proration?: ProrationInfo;

  // Detailed Earnings Breakdown
  earnings: {
    basic: { monthly: number; annual: number; percentageOfCtc: number };
    hra?: { monthly: number; annual: number };
    specialAllowance?: { monthly: number; annual: number };
    conveyance?: { monthly: number; annual: number };
    medicalAllowance?: { monthly: number; annual: number };
    otherFixedAllowances?: { label: string; monthly: number; annual: number }[];
    oneTimeAndVariableEarnings?: OneTimeOrVariableItem[];
    totalOneTimeVariableAmount: number;
    variablePayAnnual?: number;
    joiningBonus?: number;
    relocationBonus?: number;
    esopRsuAnnual?: number;
  };

  // Deductions Breakdown
  deductions: {
    employeePfMonthly?: number;
    employeePfAnnual?: number;
    professionalTaxMonthly?: number;
    professionalTaxAnnual?: number;
    tdsMonthly?: number;
    tdsAnnualProjected?: number;
    otherDeductionsMonthly?: number;
    totalDeductionsMonthly?: number;
  };

  // Employer Contributions (CTC Additions)
  employerBenefits: {
    employerPfAnnual: number;
    gratuityAnnual: number;
    insuranceAnnual?: number;
    otherBenefitsAnnual?: number;
  };

  // Metadata
  metadata?: {
    employerName?: string;
    designation?: string;
    location?: string;
    stateCode?: string;
    isMetroCity?: boolean;
    payPeriod?: string;
    warnings?: string[];
  };
  employerName?: string;
  designation?: string;
  location?: string;
  stateCode?: string;
  isMetroCity?: boolean;
  payPeriod?: string;
  warnings?: string[];
}

export interface ExtractedField {
  label: string;
  key: keyof SalaryInputs | 'detectedLocation' | 'detectedEmployer' | 'documentType' | 'monthlyNetPay' | 'monthlyTds' | 'prorationSummary' | 'variableComponentsSummary';
  value: any;
  formattedValue: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceSnippet?: string;
}

export interface ParseResult {
  inputs: Partial<SalaryInputs>;
  breakdown: CompensationBreakdown;
  fields: ExtractedField[];
  rawText: string;
  documentType: DocumentType;
  detectedEmployer?: string;
  detectedDesignation?: string;
  detectedLocation?: string;
  previewUrl?: string;
  detectedMonthlyNet?: number;
  detectedMonthlyGross?: number;
}

// ---------------------------------------------------------------------------
// 1. Noise Exclusion & Pre-processing
// ---------------------------------------------------------------------------

/**
 * Pre-processes and masks non-financial numbers and identifiers to prevent
 * accidental extraction of PIN codes, UAN numbers, PF numbers, Bank account
 * numbers, Employee IDs, Phone numbers, PAN/Aadhaar IDs, and dates as salaries.
 */
export function maskNoiseIdentifiers(text: string): string {
  let cleaned = text;

  // 1. Mask 6-digit postal / PIN codes (e.g. Pin: 560001, Bangalore - 560103, Pincode 110001)
  cleaned = cleaned.replace(/(?:pin(?:\s*code)?|pincode|postal\s*code|zip(?:\s*code)?)[\s:=#-]+(\d{6})\b/gi, (match) => {
    return match.replace(/\d{6}/, '[MASKED_PINCODE]');
  });
  // Also mask standalone 6-digit PIN codes attached to known city / address lines
  cleaned = cleaned.replace(/([A-Za-z]+(?:\s+[A-Za-z]+)*\s*[-–,]\s*)(\d{6})\b/g, '$1[MASKED_PINCODE]');

  // 2. Mask 12-digit UAN numbers (Universal Account Number)
  cleaned = cleaned.replace(/(?:uan|universal\s*account\s*no(?:\.|umber)?)[\s:=#-]+(\d{12})\b/gi, (match) => {
    return match.replace(/\d{12}/, '[MASKED_UAN]');
  });
  // Mask any standalone 12-digit numbers that look like UAN / Aadhaar (unless explicitly preceded by ₹/INR)
  cleaned = cleaned.replace(/(?<!(?:inr|rs\.?|₹)\s*)\b\d{12}\b/gi, '[MASKED_UAN_OR_AADHAAR]');

  // 3. Mask PF numbers & Member IDs (e.g., KN/BNG/0012345/000/0001234, DL/CPM/12345/123)
  cleaned = cleaned.replace(/(?:pf\s*(?:no|number|a\/?c|member\s*id)?)[\s:=#-]+([A-Z]{2}\/[A-Z0-9/]+)/gi, '[MASKED_PF_ID]');

  // 4. Mask Bank Account numbers (9 to 18 digits)
  cleaned = cleaned.replace(/(?:bank\s*(?:a\/?c|account)?(?:\s*no(?:\.|umber)?)?|a\/?c\s*no)[\s:=#-]+(\d{9,18})\b/gi, (match) => {
    return match.replace(/\d{9,18}/, '[MASKED_BANK_AC]');
  });

  // 5. Mask Employee IDs / Staff numbers (e.g., Emp ID: 10542, Emp Code: E98214)
  cleaned = cleaned.replace(/(?:emp(?:loyee)?\s*(?:id|no|code|number)|staff\s*(?:id|no)|personnel\s*no)[\s:=#-]+([A-Za-z0-9-]+)\b/gi, '[MASKED_EMP_ID]');

  // 6. Mask 10-digit Phone / Mobile numbers
  cleaned = cleaned.replace(/(?:phone|mobile|tel|contact)[\s:=#-]+(?:\+91[\s-]?)?([6-9]\d{9})\b/gi, '[MASKED_PHONE]');
  cleaned = cleaned.replace(/(?<!(?:inr|rs\.?|₹)\s*)\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g, '[MASKED_PHONE]');

  // 7. Mask PAN numbers (5 letters, 4 digits, 1 letter)
  cleaned = cleaned.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[MASKED_PAN]');

  // 8. Mask Standard Dates (DD/MM/YYYY, YYYY-MM-DD, DD-Mon-YYYY)
  cleaned = cleaned.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, '[MASKED_DATE]');
  cleaned = cleaned.replace(/\b\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{2,4}\b/gi, '[MASKED_DATE]');

  return cleaned;
}

// Convert numbers like 15 LPA, 15,00,000, 1.5 Cr, 1500000 to standard numeric INR value
export function normalizeIndianNumber(str: string): number | null {
  if (!str) return null;
  const clean = str.trim().replace(/,/g, '').replace(/₹/g, '').replace(/rs\.?/gi, '').trim();

  // Check for LPA / Lakhs pattern
  const lpaMatch = clean.match(/^([\d.]+)\s*(?:lpa|lacs?|lakhs?)/i);
  if (lpaMatch) {
    const val = parseFloat(lpaMatch[1]);
    if (!isNaN(val)) return Math.round(val * 100000);
  }

  // Check for Cr / Crores pattern
  const crMatch = clean.match(/^([\d.]+)\s*(?:cr|crores?)/i);
  if (crMatch) {
    const val = parseFloat(crMatch[1]);
    if (!isNaN(val)) return Math.round(val * 10000000);
  }

  // Direct number
  const directMatch = clean.match(/([\d]+(?:\.\d+)?)/);
  if (directMatch) {
    const val = parseFloat(directMatch[1]);
    if (!isNaN(val)) {
      // If value is small like 12.5 or 15 with explicit LPA indication
      if (val > 0 && val <= 100 && (str.toLowerCase().includes('l') || str.toLowerCase().includes('lac') || str.toLowerCase().includes('lakh') || str.toLowerCase().includes('ctc') || str.toLowerCase().includes('lpa'))) {
        return Math.round(val * 100000);
      }
      return Math.round(val);
    }
  }

  return null;
}

/**
 * Checks if a string or match snippet has proximity to financial currency
 * indicators or clear financial labels.
 */
export function hasFinancialProximity(contextSnippet: string): boolean {
  if (!contextSnippet) return false;
  return /(?:₹|inr|rs\.?|lpa|lacs?|lakhs?|cr|crores?|\/pm|\/month|\/annum|per\s*annum|p\.a\.|gross|basic|hra|ctc|salary|earnings|deductions|allowance|net\s*pay|take\s*home|bonus|package|stipend|arrears?)/i.test(contextSnippet);
}

// ---------------------------------------------------------------------------
// 2. Document Classification & Type Detection
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  type: DocumentType;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  payPeriod?: string;
}

export function detectDocumentType(rawText: string): ClassificationResult {
  const text = rawText || '';
  const reasons: string[] = [];

  let payslipScore = 0;
  let offerScore = 0;
  let appraisalScore = 0;
  let form16Score = 0;
  let taxSheetScore = 0;

  // 1. Payslip Indicators
  if (/payslip|salary\s*slip|pay\s*advice|pay\s*slip/i.test(text)) {
    payslipScore += 4;
    reasons.push('Explicit Payslip / Salary Slip header detected');
  }
  if (/earnings\s*(?:and|&)\s*deductions|total\s*earnings\s+total\s*deductions/i.test(text)) {
    payslipScore += 3;
    reasons.push('Earnings & Deductions table layout detected');
  }
  if (/net\s*pay|take\s*home\s*pay|net\s*salary/i.test(text)) {
    payslipScore += 2;
    reasons.push('Net Take-Home Pay figure detected');
  }
  if (/\b(?:lwp|loss\s*of\s*pay|leave\s*without\s*pay|paid\s*days|days\s*worked|present\s*days)\b/i.test(text)) {
    payslipScore += 3;
    reasons.push('Attendance / Days Worked / LWP metadata detected');
  }
  // Month-Year Pay Period check
  let payPeriod: string | undefined;
  const payPeriodMatch = text.match(/(?:for\s*the\s*month\s*of|pay\s*period|salary\s*for|month)[\s:=]+([A-Za-z]+\s*\d{4}|\d{1,2}[/-]\d{4}|[A-Za-z]{3}[- ]\d{2,4})/i);
  if (payPeriodMatch) {
    payslipScore += 2;
    payPeriod = payPeriodMatch[1].trim();
    reasons.push(`Pay Period detected: ${payPeriod}`);
  }

  // 2. Offer Letter Indicators
  if (/offer\s*of\s*employment|letter\s*of\s*offer|offer\s*letter|appointment\s*letter/i.test(text)) {
    offerScore += 4;
    reasons.push('Offer of Employment / Appointment Letter title detected');
  }
  if (/date\s*of\s*joining|doj\b|joining\s*date/i.test(text)) {
    offerScore += 3;
    reasons.push('Date of Joining (DOJ) reference detected');
  }
  if (/compensation\s*annexure|annexure\s*[-–a-z0-9]|terms\s*of\s*employment|we\s*are\s*pleased\s*to\s*offer/i.test(text)) {
    offerScore += 3;
    reasons.push('Compensation Annexure / Terms of Employment structure detected');
  }
  if (/\b(?:annual\s*ctc|cost\s*to\s*company|total\s*fixed\s*pay|target\s*cash)\b/i.test(text) && !/net\s*pay/i.test(text)) {
    offerScore += 2;
  }

  // 3. Appraisal / Revision Letter Indicators
  if (/revised\s*compensation|salary\s*revision|annual\s*appraisal|performance\s*appraisal|annual\s*increment|increment\s*letter/i.test(text)) {
    appraisalScore += 5;
    reasons.push('Salary Revision / Performance Appraisal header detected');
  }
  if (/with\s*effect\s*from|w\.?e\.?f\.?|effective\s*date/i.test(text)) {
    appraisalScore += 2;
    reasons.push('Effective Date (w.e.f.) reference detected');
  }

  // 4. Form 16 / Tax Sheet Indicators
  if (/form\s*16|certificate\s*under\s*section\s*203|assessment\s*year/i.test(text)) {
    form16Score += 5;
    reasons.push('Form 16 Tax Certificate detected');
  }
  if (/tax\s*computation|incometax\s*statement|computation\s*of\s*total\s*income/i.test(text)) {
    taxSheetScore += 5;
    reasons.push('Income Tax Computation Sheet detected');
  }

  // Determine winning category
  const scores = [
    { type: 'PAYSLIP' as DocumentType, score: payslipScore },
    { type: 'OFFER_LETTER' as DocumentType, score: offerScore },
    { type: 'APPRAISAL_LETTER' as DocumentType, score: appraisalScore },
    { type: 'FORM_16' as DocumentType, score: form16Score },
    { type: 'TAX_SHEET' as DocumentType, score: taxSheetScore }
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (best.score >= 4) {
    return {
      type: best.type,
      confidence: best.score >= 6 ? 'HIGH' : 'MEDIUM',
      reasons,
      payPeriod
    };
  }

  return {
    type: 'UNKNOWN',
    confidence: 'LOW',
    reasons: ['Insufficient structural keywords for definitive classification'],
    payPeriod
  };
}

// ---------------------------------------------------------------------------
// 3. Proration & Attendance Extraction (Normalizer Engine)
// ---------------------------------------------------------------------------

export function extractProrationDetails(text: string): ProrationInfo {
  let totalDays = 30;
  let paidDays = 30;
  let lwpDays = 0;
  let isProrated = false;
  let explanation = 'Full month salary (no LWP or proration detected)';

  // Extract Total / Calendar Days in Month
  const totalDaysMatch = text.match(/(?:calendar\s*days|total\s*days|month\s*days|days\s*in\s*month)[\s:=]+(\d+(?:\.\d+)?)/i);
  if (totalDaysMatch) {
    const val = parseFloat(totalDaysMatch[1]);
    if (val >= 28 && val <= 31) totalDays = val;
  }

  // Extract Paid Days / Days Worked
  const paidDaysMatch = text.match(/(?:paid\s*days|days\s*worked|present\s*days|payable\s*days|worked\s*days|days\s*payable)(?:\s*\([^)]*\))?[\s:=-]+(\d+(?:\.\d+)?)/i);
  if (paidDaysMatch) {
    const val = parseFloat(paidDaysMatch[1]);
    if (val > 0 && val <= 31) paidDays = val;
  }

  // Extract LWP / Loss of Pay / Unpaid Days
  const lwpMatch = text.match(/(?:leave\s*without\s*pay|loss\s*of\s*pay|lwp|lop|unpaid\s*days|absent\s*days)(?:\s*\([^)]*\))?[\s:=-]+(\d+(?:\.\d+)?)/i);
  if (lwpMatch) {
    const val = parseFloat(lwpMatch[1]);
    if (val > 0 && val <= 31) lwpDays = val;
  }

  // Calculate proration
  if (lwpDays > 0 && paidDays === 30 && !paidDaysMatch) {
    paidDays = Math.max(1, totalDays - lwpDays);
  }

  if (paidDays < totalDays || lwpDays > 0) {
    isProrated = true;
    const factor = totalDays / Math.max(1, paidDays);
    const roundedFactor = Math.round(factor * 1000) / 1000;
    explanation = `${lwpDays > 0 ? `${lwpDays} days LWP` : 'Partial month'} detected (${paidDays}/${totalDays} paid days). Recurring earnings normalized by ${roundedFactor}x to full-month equivalent before annualizing.`;

    return {
      isProrated: true,
      totalDays,
      paidDays,
      lwpDays,
      prorationFactor: factor,
      explanation
    };
  }

  return {
    isProrated: false,
    totalDays,
    paidDays: totalDays,
    lwpDays: 0,
    prorationFactor: 1.0,
    explanation
  };
}

// ---------------------------------------------------------------------------
// 4. Component Identification & Separation (Fixed vs Variable / One-Time)
// ---------------------------------------------------------------------------

/**
 * Extracts and separates one-time/variable payslip earnings (e.g. Annual Bonus,
 * Arrears, Leave Encashment, Overtime, Relocation) from recurring monthly components.
 */
export function extractOneTimeAndVariableEarnings(text: string, lines: string[]): OneTimeOrVariableItem[] {
  const items: OneTimeOrVariableItem[] = [];
  const foundLabels = new Set<string>();

  // Patterns for one-time/variable earnings
  const variablePatterns: { regex: RegExp; category: OneTimeOrVariableItem['category']; defaultLabel: string }[] = [
    {
      regex: /(?:annual\s*bonus|yearly\s*bonus|ytd\s*bonus|annual\s*performance\s*bonus|annual\s*variable(?:\s*pay)?)(?:\s*\([^)]*\))?[\s:=-]+(?:target\s*|approx\s*|upto\s*)?(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i,
      category: 'BONUS',
      defaultLabel: 'Annual Bonus'
    },
    {
      regex: /(?:salary\s*arrears?|basic\s*arrears?|hra\s*arrears?|da\s*arrears?|incentive\s*arrears?|\barrears?\b)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i,
      category: 'ARREARS',
      defaultLabel: 'Arrears'
    },
    {
      regex: /(?:leave\s*encashment|el\s*encashment|leave\s*encash)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i,
      category: 'LEAVE_ENCASHMENT',
      defaultLabel: 'Leave Encashment'
    },
    {
      regex: /(?:overtime(?:\s*allowance|\s*pay)?|\bot\s*pay\b|\bot\s*allowance\b)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i,
      category: 'OVERTIME',
      defaultLabel: 'Overtime'
    },
    {
      regex: /(?:relocation\s*bonus|relocation\s*allowance|relocation\s*reimbursement)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i,
      category: 'RELOCATION',
      defaultLabel: 'Relocation Allowance'
    },
    {
      regex: /(?:quarterly\s*incentive|quarterly\s*bonus|quarterly\s*variable)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i,
      category: 'INCENTIVE',
      defaultLabel: 'Quarterly Incentive'
    },
    {
      regex: /(?:joining\s*bonus|sign-?on\s*bonus|retention\s*bonus|referral\s*bonus|spot\s*bonus|ex-?gratia)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i,
      category: 'BONUS',
      defaultLabel: 'One-Time Bonus'
    }
  ];

  for (const { regex, category, defaultLabel } of variablePatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const amount = normalizeIndianNumber(match[1]);
      if (amount && amount > 0 && !foundLabels.has(defaultLabel)) {
        foundLabels.add(defaultLabel);
        items.push({
          label: defaultLabel,
          amount,
          category
        });
      }
    }
  }

  // Also check line-by-line for any item containing "annual", "yearly", "one-time", "arrear", "encashment"
  for (const line of lines) {
    if (/annual|yearly|one-?time|lump-?sum|\bytd\b|encashment|arrears?/i.test(line) && !/total|gross|net\s*pay|ctc|deduction|tax|pf|tds/i.test(line)) {
      const numMatch = line.match(/(?:inr|rs\.?|₹)?\s*([\d,]{3,9})/i);
      if (numMatch) {
        const val = normalizeIndianNumber(numMatch[1]);
        const cleanLabel = line.split(/[\s:=-]+/)[0] || 'One-Time Component';
        if (val && val > 0 && !foundLabels.has(cleanLabel) && !items.some(it => it.amount === val)) {
          foundLabels.add(cleanLabel);
          items.push({
            label: cleanLabel,
            amount: val,
            category: /arrear/i.test(line) ? 'ARREARS' : /encash/i.test(line) ? 'LEAVE_ENCASHMENT' : 'BONUS'
          });
        }
      }
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// 5. Primary Extraction Pipeline & Math Engine
// ---------------------------------------------------------------------------

export function analyzeDocumentText(rawText: string, previewUrl?: string): ParseResult {
  const text = rawText || '';
  const cleanedText = maskNoiseIdentifiers(text);
  const lines = cleanedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const fields: ExtractedField[] = [];
  const inputs: Partial<SalaryInputs> = { ...DEFAULT_SALARY_INPUTS };
  const warnings: string[] = [];

  // Step 1: Classify Document
  const classification = detectDocumentType(text);
  const documentType = classification.type;

  fields.push({
    label: 'Document Classification',
    key: 'documentType',
    value: documentType,
    formattedValue: documentType.replace('_', ' '),
    confidence: classification.confidence,
    sourceSnippet: classification.reasons.join(' · ')
  });

  // Step 2: Clean Employer Name Detection
  let detectedEmployer: string | undefined;
  
  // 1. Look for explicit company label prefixes (e.g. "Company: Rakuten India Pvt Ltd")
  const explicitCompanyRegex = /(?:company(?:\s*name)?|employer(?:\s*name)?|organisation|organization|firm)[:\s]+([A-Za-z0-9\s.,&-]{3,50}?(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|Limited|LLC|Inc\.?|Technologies|Solutions|Corporation|Corp))/i;
  const explicitMatch = cleanedText.match(explicitCompanyRegex);
  if (explicitMatch && explicitMatch[1]) {
    const candidate = explicitMatch[1].trim().replace(/\s+/g, ' ');
    if (candidate.length <= 50 && !/(?:earnings|deductions|basic|net\s*pay|month\s*of|rupees|slip)/i.test(candidate)) {
      detectedEmployer = candidate;
    }
  }

  // 2. If not found, look for standard corporate suffixes directly in the first 250 characters
  if (!detectedEmployer) {
    const headerSnippet = cleanedText.slice(0, 250);
    const companySuffixRegex = /\b([A-Z][A-Za-z0-9&.\s-]{2,45}?(?:Private\s+Limited|Pvt\.?\s*Ltd\.?|Limited|LLC|Inc\.?|Technologies|Solutions|Services|Corporation))\b/i;
    const suffixMatch = headerSnippet.match(companySuffixRegex);
    if (suffixMatch && suffixMatch[1]) {
      const candidate = suffixMatch[1].trim().replace(/\s+/g, ' ');
      // Verify candidate is clean and reasonable
      if (candidate.length >= 3 && candidate.length <= 50 && !/(?:earnings|deductions|payslip|employee|joining|salary|slip|month)/i.test(candidate)) {
        detectedEmployer = candidate;
      }
    }
  }

  // 3. Fallback: check individual split lines (< 60 chars)
  if (!detectedEmployer) {
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length <= 60 && /(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|Limited|LLC|Inc\.?|Technologies|Solutions|Services)/i.test(line)) {
        const cleanedLine = line.replace(/[^\w\s.,&-]/g, '').trim();
        if (!/(?:earnings|deductions|payslip|employee|joining|salary|slip|month)/i.test(cleanedLine)) {
          detectedEmployer = cleanedLine;
          break;
        }
      }
    }
  }

  // Clean and truncate detected employer to max 45 chars
  if (detectedEmployer) {
    detectedEmployer = detectedEmployer.replace(/^(?:at|with|for|to)\s+/i, '').trim();
    if (detectedEmployer.length > 45 || /(?:earnings|deductions|payslip|net\s*pay)/i.test(detectedEmployer)) {
      detectedEmployer = undefined;
    }
  }

  // Step 3: Designation / Role Detection
  let detectedDesignation: string | undefined;
  const roleRegex = /(?:position|designation|role|title|appointed\s*as)[:\s]+([A-Za-z0-9\s.,&/-]{2,40}?(?:Engineer(?:\s+[I|V|X]+)?|Developer|Architect|Manager|Lead|Analyst|Consultant|Scientist|Specialist|Associate|Designer|Director|VP|Executive))/i;
  const roleMatch = cleanedText.match(roleRegex);
  if (roleMatch && roleMatch[1]) {
    const candidate = roleMatch[1].trim().replace(/\s+/g, ' ');
    const cleanCandidate = candidate.split(/(?:Bank|PAN|DOB|Date|Emp|PF|UAN|Gross|Basic)/i)[0].trim();
    if (cleanCandidate.length >= 3 && cleanCandidate.length <= 40) {
      detectedDesignation = cleanCandidate;
    }
  }

  // Step 4: Work Location (State & City for PT/HRA)
  let detectedLocation: string | undefined;
  if (/bengaluru|bangalore|karnataka/i.test(cleanedText)) {
    detectedLocation = 'Bengaluru, Karnataka';
    inputs.stateCode = 'KA';
    inputs.isMetroCity = false;
  } else if (/mumbai|navi\s*mumbai|pune|maharashtra/i.test(cleanedText)) {
    const isMumbai = /mumbai/i.test(cleanedText);
    detectedLocation = isMumbai ? 'Mumbai, Maharashtra' : 'Pune, Maharashtra';
    inputs.stateCode = 'MH';
    inputs.isMetroCity = isMumbai;
  } else if (/delhi|gurgaon|gurugram|noida|faridabad|ncr/i.test(cleanedText)) {
    const isDelhi = /delhi/i.test(cleanedText);
    detectedLocation = isDelhi ? 'New Delhi (NCR)' : 'Gurugram / Noida (NCR)';
    inputs.stateCode = isDelhi ? 'DL' : /gurgaon|gurugram/i.test(cleanedText) ? 'HR' : 'UP';
    inputs.isMetroCity = isDelhi;
  } else if (/hyderabad|secunderabad|telangana/i.test(cleanedText)) {
    detectedLocation = 'Hyderabad, Telangana';
    inputs.stateCode = 'TS';
    inputs.isMetroCity = false;
  } else if (/chennai|tamil\s*nadu/i.test(cleanedText)) {
    detectedLocation = 'Chennai, Tamil Nadu';
    inputs.stateCode = 'TN';
    inputs.isMetroCity = true;
  } else if (/kolkata|calcutta|west\s*bengal/i.test(cleanedText)) {
    detectedLocation = 'Kolkata, West Bengal';
    inputs.stateCode = 'WB';
    inputs.isMetroCity = true;
  }

  if (detectedLocation) {
    fields.push({
      label: 'Work Location & PT Rule',
      key: 'detectedLocation',
      value: detectedLocation,
      formattedValue: detectedLocation,
      confidence: 'HIGH',
      sourceSnippet: `Detected from location references: ${detectedLocation}`
    });
  }

  // Step 5: Execute Specialized Parsing Engine by Document Type

  let finalAnnualCtc = 0;
  let finalAnnualGross = 0;
  let finalMonthlyGross = 0;
  let fixedMonthlyGross = 0;
  let normalizedFixedMonthlyGross = 0;
  let actualMonthlyGross: number | undefined;
  let monthlyNetPay: number | undefined;
  let prorationInfo: ProrationInfo | undefined;
  let oneTimeAndVariableItems: OneTimeOrVariableItem[] = [];
  let totalOneTimeVariableAmount = 0;

  // Breakdown sub-objects
  let basicMonthly = 0;
  let basicAnnual = 0;
  let hraMonthly = 0;
  let hraAnnual = 0;
  let specialMonthly = 0;
  let specialAnnual = 0;
  let conveyanceMonthly = 0;
  let conveyanceAnnual = 0;
  let medicalMonthly = 0;
  let medicalAnnual = 0;
  let variablePayAnnual = 0;
  let joiningBonus = 0;
  let relocationBonus = 0;
  let esopRsuAnnual = 0;

  let employeePfMonthly = 0;
  let employeePfAnnual = 0;
  let ptMonthly = 0;
  let ptAnnual = 0;
  let tdsMonthly = 0;
  let tdsAnnualProjected = 0;
  let totalDeductionsMonthly = 0;

  let employerPfAnnual = 0;
  let gratuityAnnual = 0;

  if (documentType === 'PAYSLIP') {
    // -----------------------------------------------------------------------
    // PAYSLIP NORMALIZATION & NON-RECURRING ISOLATION ENGINE
    // -----------------------------------------------------------------------
    prorationInfo = extractProrationDetails(cleanedText);

    if (prorationInfo.isProrated) {
      fields.push({
        label: 'Proration & LWP Adjustment',
        key: 'prorationSummary',
        value: prorationInfo.prorationFactor,
        formattedValue: prorationInfo.explanation,
        confidence: 'HIGH',
        sourceSnippet: `Paid: ${prorationInfo.paidDays}/${prorationInfo.totalDays}, LWP: ${prorationInfo.lwpDays}`
      });
    }

    // 1. Identify One-Time / Variable Components (Bonus, Arrears, Overtime, Leave Encashment, etc.)
    oneTimeAndVariableItems = extractOneTimeAndVariableEarnings(cleanedText, lines);
    totalOneTimeVariableAmount = oneTimeAndVariableItems.reduce((sum, item) => sum + item.amount, 0);

    if (totalOneTimeVariableAmount > 0) {
      const summaryLabels = oneTimeAndVariableItems.map(i => `${i.label} (₹${i.amount.toLocaleString('en-IN')})`).join(', ');
      fields.push({
        label: 'One-Time & Variable Components (Isolated)',
        key: 'variableComponentsSummary',
        value: totalOneTimeVariableAmount,
        formattedValue: `₹${totalOneTimeVariableAmount.toLocaleString('en-IN')} total [${summaryLabels}]`,
        confidence: 'HIGH',
        sourceSnippet: `Isolated ${oneTimeAndVariableItems.length} non-recurring component(s). Added once without 12x multiplication.`
      });
    }

    // 2. Extract Monthly Gross Earnings from Payslip
    let extractedGross: number | null = null;
    const grossPatterns = [
      /(?:gross\s*(?:earnings|salary|pay|remuneration|amount)?|total\s*earnings)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i,
      /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:gross\s*pay|gross\s*salary|total\s*earnings)/i
    ];

    for (const pat of grossPatterns) {
      const match = cleanedText.match(pat);
      if (match && match[1]) {
        const val = normalizeIndianNumber(match[1]);
        if (val && val >= 5000 && val <= 10000000) {
          extractedGross = val;
          break;
        }
      }
    }

    // 3. Extract Monthly Basic Salary
    const basicMatch = cleanedText.match(/(?:basic\s*(?:salary|pay)?|basic)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    let extractedBasic: number | null = null;
    if (basicMatch && basicMatch[1]) {
      const val = normalizeIndianNumber(basicMatch[1]);
      if (val && val >= 3000 && val <= 5000000) {
        extractedBasic = val;
      }
    }

    // 4. Extract Monthly HRA
    const hraMatch = cleanedText.match(/(?:house\s*rent\s*allowance|hra)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    let extractedHra: number | null = null;
    if (hraMatch && hraMatch[1]) {
      const val = normalizeIndianNumber(hraMatch[1]);
      if (val && val > 0 && val <= 5000000) {
        extractedHra = val;
      }
    }

    // 5. Extract Special Allowance
    const specialMatch = cleanedText.match(/(?:special\s*allowance|spl\s*allowance|personal\s*allowance|flexi\s*allowance)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    let extractedSpecial: number | null = null;
    if (specialMatch && specialMatch[1]) {
      const val = normalizeIndianNumber(specialMatch[1]);
      if (val && val > 0 && val <= 5000000) {
        extractedSpecial = val;
      }
    }

    // 6. Extract Transport / Conveyance Allowance
    const conveyanceMatch = cleanedText.match(/(?:transport\s*allowance|conveyance\s*allowance|conveyance|travel\s*allowance)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (conveyanceMatch && conveyanceMatch[1]) {
      const val = normalizeIndianNumber(conveyanceMatch[1]);
      if (val && val > 0 && val <= 5000000) {
        conveyanceMonthly = val;
        conveyanceAnnual = val * 12;
      }
    }

    // 7. Extract Medical Allowance
    const medicalMatch = cleanedText.match(/(?:medical\s*allowance|health\s*allowance)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (medicalMatch && medicalMatch[1]) {
      const val = normalizeIndianNumber(medicalMatch[1]);
      if (val && val > 0 && val <= 5000000) {
        medicalMonthly = val;
        medicalAnnual = val * 12;
      }
    }

    // If gross was not explicitly matched, sum up known earnings
    const sumFixedEarnings = (extractedBasic || 0) + (extractedHra || 0) + (extractedSpecial || 0) + conveyanceMonthly + medicalMonthly;
    if (!extractedGross && sumFixedEarnings > 0) {
      extractedGross = sumFixedEarnings + totalOneTimeVariableAmount;
    }

    // Fallback if still no gross found: look for highest positive earnings line
    if (!extractedGross) {
      for (const line of lines) {
        if (/earnings|allowance|pay/i.test(line) && !/deduction|pf|tax|loan/i.test(line)) {
          const numMatch = line.match(/(?:inr|rs\.?|₹)?\s*([\d,]{4,9})/i);
          if (numMatch) {
            const val = normalizeIndianNumber(numMatch[1]);
            if (val && val >= 10000 && val <= 5000000) {
              extractedGross = val;
              break;
            }
          }
        }
      }
    }

    actualMonthlyGross = extractedGross || 50000;
    finalMonthlyGross = actualMonthlyGross;

    // 8. Separate Fixed Monthly Gross from One-Time / Variable
    if (totalOneTimeVariableAmount > 0) {
      if (sumFixedEarnings > 0) {
        fixedMonthlyGross = sumFixedEarnings;
      } else {
        fixedMonthlyGross = Math.max(0, actualMonthlyGross - totalOneTimeVariableAmount);
      }
    } else {
      fixedMonthlyGross = actualMonthlyGross;
    }

    // 9. Apply Proration Factor strictly to Fixed Monthly Recurring Components
    normalizedFixedMonthlyGross = Math.round(fixedMonthlyGross * prorationInfo.prorationFactor);

    if (extractedBasic) {
      basicMonthly = Math.round(extractedBasic * prorationInfo.prorationFactor);
    } else {
      basicMonthly = Math.round(normalizedFixedMonthlyGross * 0.50);
    }
    basicAnnual = basicMonthly * 12;

    if (extractedHra) {
      hraMonthly = Math.round(extractedHra * prorationInfo.prorationFactor);
      hraAnnual = hraMonthly * 12;
    }
    if (extractedSpecial) {
      specialMonthly = Math.round(extractedSpecial * prorationInfo.prorationFactor);
      specialAnnual = specialMonthly * 12;
    }

    // 10. Annual Gross Calculation:
    // Annual Gross = (Sum of Fixed Monthly Components × 12) + (Sum of Variable/One-Time Components)
    finalAnnualGross = (normalizedFixedMonthlyGross * 12) + totalOneTimeVariableAmount;

    // 11. Extract Deductions (Employee PF, PT, TDS, Total Deductions)
    const pfMatch = cleanedText.match(/(?:provident\s*fund|epf|pf\s*(?:deduction|contribution|employee)?|e-pf)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (pfMatch && pfMatch[1]) {
      const val = normalizeIndianNumber(pfMatch[1]);
      if (val && val > 0 && val < finalMonthlyGross) {
        employeePfMonthly = val;
        employeePfAnnual = val * 12;
      }
    }

    const ptMatch = cleanedText.match(/(?:professional\s*tax|profession\s*tax|prof\s*tax|pt)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (ptMatch && ptMatch[1]) {
      const val = normalizeIndianNumber(ptMatch[1]);
      if (val && val > 0 && val <= 2500) {
        ptMonthly = val;
        ptAnnual = val * 12;
      }
    }

    const tdsMatch = cleanedText.match(/(?:income\s*tax|tax\s*deducted(?:\s*at\s*source)?|tds|it\s*deduction|i\.?\s*tax)(?:\s*\([^)]*\))?[\s:=-]+(?:target\s*|approx\s*|upto\s*)?(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (tdsMatch && tdsMatch[1]) {
      const val = normalizeIndianNumber(tdsMatch[1]);
      if (val && val > 0 && val < finalMonthlyGross) {
        tdsMonthly = val;
        tdsAnnualProjected = val * 12;
        fields.push({
          label: 'Monthly TDS (Tax Deducted at Source)',
          key: 'monthlyTds',
          value: val,
          formattedValue: `₹${val.toLocaleString('en-IN')}/mo (Projected ₹${tdsAnnualProjected.toLocaleString('en-IN')}/yr)`,
          confidence: 'HIGH',
          sourceSnippet: tdsMatch[0]
        });
      }
    }

    const netMatch = cleanedText.match(/(?:net\s*(?:take\s*home\s*pay|take\s*home|pay|salary|amount)|take\s*home\s*pay|take\s*home|amount\s*credited)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (netMatch && netMatch[1]) {
      const val = normalizeIndianNumber(netMatch[1]);
      if (val && val > 0 && val <= finalMonthlyGross) {
        monthlyNetPay = val;
        fields.push({
          label: 'Monthly Net Take-Home Pay',
          key: 'monthlyNetPay',
          value: val,
          formattedValue: `₹${val.toLocaleString('en-IN')}/mo`,
          confidence: 'HIGH',
          sourceSnippet: netMatch[0]
        });
      }
    }

    // 12. Calculate Employer Benefits & Project True Annual CTC
    const isEpfCapped = /pf\s*capped|1800\s*pm|15000\s*ceiling|statutory\s*pf/i.test(cleanedText) || employeePfMonthly === 1800;
    inputs.epfCapped = isEpfCapped;

    if (isEpfCapped) {
      employerPfAnnual = 21600;
    } else {
      employerPfAnnual = Math.round(basicAnnual * 0.12);
    }

    // Statutory Gratuity Provision (15/26 rule = ~4.81% of Basic)
    gratuityAnnual = Math.round(basicAnnual * (15 / (26 * 12)));
    inputs.includeGratuity = true;

    // Projected Annual CTC = Base Annual Gross + Employer PF + Gratuity
    finalAnnualCtc = finalAnnualGross + employerPfAnnual + gratuityAnnual;

    // Calculate Basic Percentage of CTC
    const basicPct = Math.min(70, Math.max(30, Math.round((basicAnnual / finalAnnualCtc) * 100)));
    inputs.annualCtc = finalAnnualCtc;
    inputs.basicPercent = basicPct;
    if (totalOneTimeVariableAmount > 0) {
      inputs.variableBonusAnnual = totalOneTimeVariableAmount;
    }

    fields.push({
      label: 'Annual Cost to Company (Projected CTC)',
      key: 'annualCtc',
      value: finalAnnualCtc,
      formattedValue: `₹${finalAnnualCtc.toLocaleString('en-IN')}/yr (Gross ₹${finalAnnualGross.toLocaleString('en-IN')})`,
      confidence: 'HIGH',
      sourceSnippet: `Projected from Fixed Monthly (₹${normalizedFixedMonthlyGross.toLocaleString('en-IN')} × 12) + One-time (₹${totalOneTimeVariableAmount.toLocaleString('en-IN')}) + Employer PF + Gratuity`
    });

  } else {
    // -----------------------------------------------------------------------
    // OFFER LETTER / APPRAISAL LETTER / ANNUAL PACKAGE ENGINE
    // -----------------------------------------------------------------------

    // A. Detect Annual CTC directly (Do NOT multiply by 12)
    let ctcFound: number | null = null;
    const ctcPatterns = [
      /(?:cost\s*to\s*company|total\s*ctc|annual\s*ctc|total\s*compensation|total\s*fixed\s*pay|total\s*gross\s*package|fixed\s*ctc|annual\s*package|total\s*remuneration|ctc|annual\s*target\s*cash|revised\s*ctc)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?|cr|per\s*annum|\/annum|\/yr)?)/i,
      /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:lpa|lakhs?|per\s*annum|\/annum|\/yr)\s*(?:ctc|compensation|package)?/i,
      /(?:package\s*of|compensation\s*of)\s*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?|cr))/i,
      /\b([\d.]+)\s*lpa\b/i
    ];

    for (const pat of ctcPatterns) {
      const match = cleanedText.match(pat);
      if (match && match[1]) {
        const val = normalizeIndianNumber(match[1]);
        if (val && val >= 100000 && val <= 100000000) {
          ctcFound = val;
          fields.push({
            label: 'Annual Cost to Company (CTC)',
            key: 'annualCtc',
            value: val,
            formattedValue: `₹${val.toLocaleString('en-IN')}`,
            confidence: 'HIGH',
            sourceSnippet: match[0]
          });
          break;
        }
      }
    }

    // Fallback: Check highest annual figure adjacent to financial labels
    if (!ctcFound) {
      for (const line of lines) {
        if (/ctc|gross|total|fixed|remuneration/i.test(line) && hasFinancialProximity(line)) {
          const numMatch = line.match(/(?:inr|rs\.?|₹)?\s*([\d,]{6,10})/i);
          if (numMatch) {
            const val = normalizeIndianNumber(numMatch[1]);
            if (val && val >= 200000 && val <= 100000000) {
              ctcFound = val;
              fields.push({
                label: 'Annual CTC (Extracted from Table)',
                key: 'annualCtc',
                value: val,
                formattedValue: `₹${val.toLocaleString('en-IN')}`,
                confidence: 'MEDIUM',
                sourceSnippet: line
              });
              break;
            }
          }
        }
      }
    }

    finalAnnualCtc = ctcFound || 1200000;
    inputs.annualCtc = finalAnnualCtc;

    // B. Detect Basic Salary & Percentage
    const basicMatch = cleanedText.match(/(?:basic\s*salary|basic\s*pay|basic)(?:\s*\([^)]*\))?[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
    if (basicMatch && basicMatch[1]) {
      const rawBasic = normalizeIndianNumber(basicMatch[1]);
      if (rawBasic && rawBasic > 0) {
        let annualB = rawBasic;
        if (rawBasic < finalAnnualCtc * 0.15) {
          // Stated as monthly in the offer breakdown table
          annualB = rawBasic * 12;
        }
        basicAnnual = annualB;
        basicMonthly = Math.round(annualB / 12);
        const percent = Math.min(70, Math.max(30, Math.round((annualB / finalAnnualCtc) * 100)));
        inputs.basicPercent = percent;
        fields.push({
          label: 'Basic Salary Percentage',
          key: 'basicPercent',
          value: percent,
          formattedValue: `${percent}% (₹${annualB.toLocaleString('en-IN')}/yr)`,
          confidence: 'HIGH',
          sourceSnippet: basicMatch[0]
        });
      }
    } else {
      inputs.basicPercent = 50;
      basicAnnual = Math.round(finalAnnualCtc * 0.50);
      basicMonthly = Math.round(basicAnnual / 12);
    }

    // C. Detect One-Time & Variable Incentives
    // Variable Performance Bonus
    const bonusMatch = cleanedText.match(/(?:(?:annual\s*)?(?:performance\s*)?variable\s*(?:pay|bonus|incentive)|performance\s*bonus|target\s*bonus|annual\s*variable|performance\s*incentive|annual\s*bonus)(?:\s*\([^)]*\))?[\s:=-]+(?:target\s*|approx\s*|upto\s*|max\s*)?(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?)?)/i);
    if (bonusMatch && bonusMatch[1]) {
      const val = normalizeIndianNumber(bonusMatch[1]);
      if (val && val > 0 && val < finalAnnualCtc) {
        variablePayAnnual = val;
        inputs.variableBonusAnnual = val;
        fields.push({
          label: 'Annual Variable / Performance Bonus',
          key: 'variableBonusAnnual',
          value: val,
          formattedValue: `₹${val.toLocaleString('en-IN')}`,
          confidence: 'HIGH',
          sourceSnippet: bonusMatch[0]
        });
      }
    }

    // Joining / Sign-on Bonus (One-time)
    const joiningMatch = cleanedText.match(/(?:joining\s*bonus|sign-?on\s*bonus|relocation\s*bonus|retention\s*bonus)(?:\s*\([^)]*\))?[\s:=-]+(?:target\s*|approx\s*|upto\s*|max\s*)?(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?)?)/i);
    if (joiningMatch && joiningMatch[1]) {
      const val = normalizeIndianNumber(joiningMatch[1]);
      if (val && val > 0 && val < finalAnnualCtc) {
        joiningBonus = val;
        inputs.joiningBonusAnnual = val;
        fields.push({
          label: 'Joining / Sign-on Bonus (One-Time)',
          key: 'joiningBonusAnnual',
          value: val,
          formattedValue: `₹${val.toLocaleString('en-IN')}`,
          confidence: 'HIGH',
          sourceSnippet: joiningMatch[0]
        });
      }
    }

    // RSUs / Stock Grants
    const rsuMatch = cleanedText.match(/(?:(?:equity\s*(?:\/\s*rsu)?)|\brsu\b|esop|stock\s*grant|equity\s*grant|restricted\s*stock\s*units?)(?:\s*grant)?(?:\s*value)?(?:\s*\([^)]*\))?[\s:=-]+(?:target\s*|approx\s*|upto\s*)?(?:inr|rs\.?|₹|\$|usd)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?|cr)?)/i);
    if (rsuMatch && rsuMatch[1]) {
      const val = normalizeIndianNumber(rsuMatch[1]);
      if (val && val > 0) {
        let annualRsu = val;
        if (/4\s*years?|over\s*4\s*years/i.test(cleanedText)) {
          annualRsu = Math.round(val / 4);
        }
        esopRsuAnnual = annualRsu;
        inputs.rsuVestedAnnual = annualRsu;
        fields.push({
          label: 'Annual Vested RSUs / Stocks',
          key: 'rsuVestedAnnual',
          value: annualRsu,
          formattedValue: `₹${annualRsu.toLocaleString('en-IN')}/yr`,
          confidence: 'MEDIUM',
          sourceSnippet: rsuMatch[0]
        });
      }
    }

    // Statutory Gratuity & PF flags
    if (/pf\s*capped|1800\s*pm|15000\s*ceiling|statutory\s*pf/i.test(cleanedText)) {
      inputs.epfCapped = true;
      employerPfAnnual = 21600;
    } else {
      employerPfAnnual = Math.round(basicAnnual * 0.12);
    }
    gratuityAnnual = Math.round(basicAnnual * (15 / (26 * 12)));

    finalAnnualGross = Math.max(0, finalAnnualCtc - employerPfAnnual - gratuityAnnual - variablePayAnnual);
    finalMonthlyGross = Math.round(finalAnnualGross / 12);
    fixedMonthlyGross = finalMonthlyGross;
    normalizedFixedMonthlyGross = finalMonthlyGross;
  }

  // Deductions from Form 16 / Tax sheets (80C, 80D, Rent)
  const sec80CMatch = cleanedText.match(/(?:80c|chapter\s*vi-?a|ppf|elss)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+)/i);
  if (sec80CMatch && sec80CMatch[1]) {
    const val = normalizeIndianNumber(sec80CMatch[1]);
    if (val && val > 0) {
      const capped80c = Math.min(150000, val);
      inputs.sec80C_Investments = capped80c;
    }
  }

  const sec80DMatch = cleanedText.match(/(?:80d|medical\s*insurance|health\s*insurance)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+)/i);
  if (sec80DMatch && sec80DMatch[1]) {
    const val = normalizeIndianNumber(sec80DMatch[1]);
    if (val && val > 0) {
      const capped80d = Math.min(25000, val);
      inputs.sec80D_SelfFamily = capped80d;
    }
  }

  // Construct structured compensation breakdown object
  const breakdown: CompensationBreakdown = {
    documentType,
    classificationConfidence: classification.confidence,
    classificationReasons: classification.reasons,
    annualCtc: finalAnnualCtc,
    annualGrossSalary: finalAnnualGross,
    monthlyGross: finalMonthlyGross,
    fixedMonthlyGross,
    normalizedFixedMonthlyGross,
    actualMonthlyGross,
    monthlyNetPay,
    proration: prorationInfo,
    earnings: {
      basic: {
        monthly: basicMonthly,
        annual: basicAnnual,
        percentageOfCtc: inputs.basicPercent || 50
      },
      hra: hraMonthly ? { monthly: hraMonthly, annual: hraAnnual } : undefined,
      specialAllowance: specialMonthly ? { monthly: specialMonthly, annual: specialAnnual } : undefined,
      conveyance: conveyanceMonthly ? { monthly: conveyanceMonthly, annual: conveyanceAnnual } : undefined,
      medicalAllowance: medicalMonthly ? { monthly: medicalMonthly, annual: medicalAnnual } : undefined,
      oneTimeAndVariableEarnings: oneTimeAndVariableItems.length > 0 ? oneTimeAndVariableItems : undefined,
      totalOneTimeVariableAmount,
      variablePayAnnual: variablePayAnnual || (totalOneTimeVariableAmount > 0 ? totalOneTimeVariableAmount : undefined),
      joiningBonus: joiningBonus || undefined,
      relocationBonus: relocationBonus || undefined,
      esopRsuAnnual: esopRsuAnnual || undefined
    },
    deductions: {
      employeePfMonthly: employeePfMonthly || undefined,
      employeePfAnnual: employeePfAnnual || undefined,
      professionalTaxMonthly: ptMonthly || undefined,
      professionalTaxAnnual: ptAnnual || undefined,
      tdsMonthly: tdsMonthly || undefined,
      tdsAnnualProjected: tdsAnnualProjected || undefined,
      totalDeductionsMonthly: totalDeductionsMonthly || (employeePfMonthly + ptMonthly + tdsMonthly) || undefined
    },
    employerBenefits: {
      employerPfAnnual,
      gratuityAnnual
    },
    metadata: {
      employerName: detectedEmployer,
      designation: detectedDesignation,
      location: detectedLocation,
      stateCode: inputs.stateCode,
      isMetroCity: inputs.isMetroCity,
      payPeriod: classification.payPeriod,
      warnings
    }
  };

  return {
    inputs,
    breakdown,
    fields,
    rawText,
    documentType,
    detectedEmployer,
    detectedDesignation,
    detectedLocation,
    previewUrl,
    detectedMonthlyNet: monthlyNetPay,
    detectedMonthlyGross: finalMonthlyGross
  };
}

// ---------------------------------------------------------------------------
// 6. Client-Side PDF Parser using pdfjs-dist
// ---------------------------------------------------------------------------

export async function parsePdfDocument(
  file: File,
  onProgress?: (msg: string, pct: number) => void
): Promise<ParseResult> {
  onProgress?.('Loading PDF engine...', 15);
  const pdfjs = await import('pdfjs-dist');

  // Set up worker safely
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }

  onProgress?.('Reading PDF pages...', 35);
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';
  let previewUrl: string | undefined;

  // Render Page 1 to thumbnail canvas
  try {
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      // @ts-ignore
      await page1.render({ canvasContext: ctx, viewport }).promise;
      previewUrl = canvas.toDataURL('image/jpeg', 0.85);
    }
  } catch (err) {
    console.warn('PDF thumbnail generation skipped:', err);
  }

  // Extract text from up to 5 pages
  const maxPages = Math.min(pdf.numPages, 5);
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    onProgress?.(`Extracting text from page ${pageNum}/${maxPages}...`, 40 + Math.round((pageNum / maxPages) * 45));
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => (item.str ? item.str : ''))
      .join(' ');
    fullText += `\n--- Page ${pageNum} ---\n` + pageText;
  }

  // If text extraction yielded very little text (e.g. scanned PDF), fallback to OCR on Page 1
  if (fullText.replace(/\s/g, '').length < 60 && previewUrl) {
    onProgress?.('Scanned PDF detected. Running OCR scanner...', 70);
    return parseImageDocument(previewUrl, onProgress);
  }

  onProgress?.('Analyzing compensation structure...', 95);
  return analyzeDocumentText(fullText, previewUrl);
}

// ---------------------------------------------------------------------------
// 7. Client-Side Image OCR Parser using tesseract.js
// ---------------------------------------------------------------------------

export async function parseImageDocument(
  imageSource: File | Blob | string,
  onProgress?: (msg: string, pct: number) => void
): Promise<ParseResult> {
  onProgress?.('Initializing OCR Neural Engine...', 15);
  const { createWorker } = await import('tesseract.js');

  let previewUrl: string | undefined;
  if (typeof imageSource === 'string') {
    previewUrl = imageSource;
  } else {
    previewUrl = URL.createObjectURL(imageSource);
  }

  const worker = await createWorker('eng');

  onProgress?.('Scanning image and reading text...', 40);
  const result = await worker.recognize(imageSource);
  await worker.terminate();

  onProgress?.('Analyzing compensation structure...', 90);
  return analyzeDocumentText(result.data.text, previewUrl);
}

// ---------------------------------------------------------------------------
// 8. Sample Presets for 1-Click Testing
// ---------------------------------------------------------------------------

export const SAMPLE_DOCUMENTS = [
  {
    title: 'Bengaluru Tech SDE-2 Offer',
    subtitle: '₹24 LPA CTC · ₹2.5L Bonus · ₹6L RSUs · KA PT',
    sampleText: `
COMPENSATION & BENEFITS ANNEXURE
Offer of Employment
Position: Senior Software Engineer (SDE-2)
Location: Bengaluru, Karnataka
Organisation: CloudScale Technologies India Pvt. Ltd.
Date of Joining: 01/04/2025

1. Basic Salary: INR 12,00,000 per annum (50% of CTC)
2. House Rent Allowance (HRA): INR 6,00,000 per annum
3. Special Allowance: INR 3,12,000 per annum
4. Employer Provident Fund (EPF): INR 1,44,000 per annum (12% of basic)
5. Statutory Gratuity Provision: INR 57,692 per annum (15/26 rule)
6. Total Cost to Company (Annual CTC): INR 24,00,000 per annum (₹24 LPA)

ADDITIONAL INCENTIVES:
- Annual Performance Variable Bonus: Target INR 2,50,000
- Sign-on / Joining Bonus: INR 2,00,000 payable in 1st month
- Equity / RSU Grant Value: INR 24,00,000 vested over 4 years (INR 6,00,000 / year)
`
  },
  {
    title: 'Monthly Payslip (With 5 Days LWP & TDS)',
    subtitle: '₹1.2L Normal Gross · 5 Days LWP · ₹8,000 TDS · Pincode & UAN Filtered',
    sampleText: `
INFOTECH GLOBAL SOLUTIONS PVT LTD
Survey No 45, Outer Ring Road, Bellandur, Bengaluru, Karnataka - 560103
Pin Code: 560103, Tel: +91 9876543210

SALARY SLIP FOR THE MONTH OF AUGUST 2025
Employee ID: EMP-98214
Employee Name: Rahul Sharma
Designation: Senior Software Engineer
UAN: 101234567890
PF No: KN/BNG/0012345/000/0001234
Bank A/c No: 918020038472918
PAN: ABCDE1234F

ATTENDANCE DETAILS:
Calendar Days: 30
Paid Days: 25
Leave Without Pay (LWP): 5

EARNINGS                       AMOUNT (INR)     DEDUCTIONS                     AMOUNT (INR)
Basic Pay                      41,667           Employee PF                    5,000
House Rent Allowance (HRA)     20,833           Professional Tax (PT)          200
Special Allowance              37,500           Income Tax (TDS)               8,000
Gross Earnings (INR):          1,00,000         Total Deductions (INR):        13,200

NET TAKE HOME PAY: INR 86,800
(Rupees Eighty-Six Thousand Eight Hundred Only)
`
  },
  {
    title: 'Payslip with Annual Bonus & Arrears',
    subtitle: '₹1.5L Gross · ₹50k Annual Bonus (1x) · ₹15k Arrears (1x) · Isolated',
    sampleText: `
TECH DYNAMICS INDIA PVT LTD
PAYSLIP FOR THE MONTH OF MARCH 2026
Employee Name: Ananya Sen | Designation: Technical Lead
Location: Bengaluru, Karnataka | PAN: ABCDE1234F | UAN: 100987654321

EARNINGS                    AMOUNT (INR)    DEDUCTIONS                  AMOUNT (INR)
-------------------------------------------------------------------------------------
Basic Pay                    50,000.00      Provident Fund (EPF)         6,000.00
House Rent Allowance (HRA)   25,000.00      Professional Tax (PT)          200.00
Special Allowance            10,000.00      Income Tax (TDS)            12,000.00
Annual Bonus                 50,000.00
Salary Arrears               15,000.00
-------------------------------------------------------------------------------------
TOTAL GROSS EARNINGS:       1,50,000.00     TOTAL DEDUCTIONS:           18,200.00
-------------------------------------------------------------------------------------
NET TAKE HOME PAY:          1,31,800.00
`
  }
];
