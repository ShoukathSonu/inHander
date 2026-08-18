import { type SalaryInputs, DEFAULT_SALARY_INPUTS } from './taxEngine';

export interface ExtractedField {
  label: string;
  key: keyof SalaryInputs | 'detectedLocation' | 'detectedEmployer';
  value: any;
  formattedValue: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceSnippet?: string;
}

export interface ParseResult {
  inputs: Partial<SalaryInputs>;
  fields: ExtractedField[];
  rawText: string;
  documentType: 'OFFER_LETTER' | 'PAYSLIP' | 'FORM_16' | 'TAX_SHEET' | 'UNKNOWN';
  detectedEmployer?: string;
  detectedDesignation?: string;
  detectedLocation?: string;
  previewUrl?: string;
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
      // If value is small like 12.5 or 15, it's often LPA in disguise if < 100
      if (val > 0 && val <= 100 && (str.toLowerCase().includes('l') || str.toLowerCase().includes('lac') || str.toLowerCase().includes('lakh') || str.toLowerCase().includes('ctc') || str.toLowerCase().includes('lpa'))) {
        return Math.round(val * 100000);
      }
      return Math.round(val);
    }
  }

  return null;
}

// Analyze raw extracted text from OCR / PDF using regex & pattern heuristics
export function analyzeDocumentText(rawText: string, previewUrl?: string): ParseResult {
  const text = rawText || '';
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const fields: ExtractedField[] = [];
  const inputs: Partial<SalaryInputs> = {};

  let documentType: ParseResult['documentType'] = 'UNKNOWN';
  if (/offer\s*letter|employment\s*offer|appointment\s*letter|compensation\s*annexure/i.test(text)) {
    documentType = 'OFFER_LETTER';
  } else if (/payslip|salary\s*slip|pay\s*advice|earnings\s*and\s*deductions/i.test(text)) {
    documentType = 'PAYSLIP';
  } else if (/form\s*16|certificate\s*under\s*section\s*203/i.test(text)) {
    documentType = 'FORM_16';
  } else if (/tax\s*computation|incometax\s*statement/i.test(text)) {
    documentType = 'TAX_SHEET';
  }

  // 1. Detect Company / Employer Name
  let detectedEmployer: string | undefined;
  const employerRegex = /(?:at|with|joining|company|employer|organisation|organization)[:\s]+([A-Za-z0-9\s.,&-]+(?:Pvt\.?\s*Ltd\.?|Limited|LLC|Inc\.?|Technologies|Solutions|Software|Services|Corp|Corporation))/i;
  const employerMatch = text.match(employerRegex);
  if (employerMatch && employerMatch[1]) {
    detectedEmployer = employerMatch[1].trim().replace(/\s+/g, ' ');
  }

  // 2. Detect Job Role / Designation
  let detectedDesignation: string | undefined;
  const roleRegex = /(?:position|designation|role|title|appointed\s*as)[:\s]+([A-Za-z0-9\s.,&/-]+(?:Engineer|Developer|Architect|Manager|Lead|Analyst|Consultant|Scientist|Specialist|Associate|Designer|Director|VP))/i;
  const roleMatch = text.match(roleRegex);
  if (roleMatch && roleMatch[1]) {
    detectedDesignation = roleMatch[1].trim().replace(/\s+/g, ' ');
  }

  // 3. Detect Work Location (State & Metro City)
  let detectedLocation: string | undefined;
  if (/bengaluru|bangalore|karnataka/i.test(text)) {
    detectedLocation = 'Bengaluru, Karnataka';
    inputs.stateCode = 'KA';
    inputs.isMetroCity = false; // Bengaluru is Non-Metro for statutory HRA
  } else if (/mumbai|navi\s*mumbai|pune|maharashtra/i.test(text)) {
    const isMumbai = /mumbai/i.test(text);
    detectedLocation = isMumbai ? 'Mumbai, Maharashtra' : 'Pune, Maharashtra';
    inputs.stateCode = 'MH';
    inputs.isMetroCity = isMumbai; // Mumbai is Metro
  } else if (/delhi|gurgaon|gurugram|noida|faridabad|ncr/i.test(text)) {
    const isDelhi = /delhi/i.test(text);
    detectedLocation = isDelhi ? 'New Delhi (NCR)' : 'Gurugram / Noida (NCR)';
    inputs.stateCode = isDelhi ? 'DL' : /gurgaon|gurugram/i.test(text) ? 'HR' : 'UP';
    inputs.isMetroCity = isDelhi;
  } else if (/hyderabad|secunderabad|telangana/i.test(text)) {
    detectedLocation = 'Hyderabad, Telangana';
    inputs.stateCode = 'TS';
    inputs.isMetroCity = false;
  } else if (/chennai|tamil\s*nadu/i.test(text)) {
    detectedLocation = 'Chennai, Tamil Nadu';
    inputs.stateCode = 'TN';
    inputs.isMetroCity = true;
  } else if (/kolkata|calcutta|west\s*bengal/i.test(text)) {
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

  // 4. Detect Annual CTC / Total Cost to Company
  let ctcFound: number | null = null;
  const ctcPatterns = [
    /(?:cost\s*to\s*company|total\s*ctc|annual\s*ctc|total\s*compensation|total\s*fixed\s*pay|total\s*gross\s*package|fixed\s*ctc|annual\s*package|total\s*remuneration|ctc\s*\(inr\)|annual\s*target\s*cash)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?|cr|per annum|\/annum|\/yr)?)/i,
    /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:lpa|lakhs?|per\s*annum|\/annum|\/yr)\s*(?:ctc|compensation|package)?/i,
    /(?:package\s*of|compensation\s*of)\s*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?|cr))/i,
    /\b([\d.]+)\s*lpa\b/i
  ];

  for (const pattern of ctcPatterns) {
    const match = text.match(pattern);
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

  // If CTC was not explicitly found in headers, check highest annual gross figure in table lines
  if (!ctcFound) {
    for (const line of lines) {
      if (/ctc|gross|total|fixed/i.test(line)) {
        const numMatch = line.match(/(?:inr|rs\.?|₹)?\s*([\d,]{5,12})/i);
        if (numMatch) {
          const val = normalizeIndianNumber(numMatch[1]);
          if (val && val >= 100000 && val <= 100000000) {
            ctcFound = val;
            fields.push({
              label: 'Annual CTC (Estimated from Table)',
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

  if (ctcFound) {
    inputs.annualCtc = ctcFound;
  }

  // 5. Detect Basic Salary & Percentage
  const basicMatch = text.match(/(?:basic\s*salary|basic\s*pay|basic)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)/i);
  if (basicMatch && basicMatch[1]) {
    const rawBasic = normalizeIndianNumber(basicMatch[1]);
    if (rawBasic && rawBasic > 0) {
      // Check if monthly or annual
      let annualBasic = rawBasic;
      if (ctcFound && rawBasic < ctcFound * 0.15) {
        // Highly likely monthly basic
        annualBasic = rawBasic * 12;
      }
      if (ctcFound && ctcFound > 0) {
        const percent = Math.round((annualBasic / ctcFound) * 100);
        if (percent >= 20 && percent <= 80) {
          inputs.basicPercent = percent;
          fields.push({
            label: 'Basic Salary Percentage',
            key: 'basicPercent',
            value: percent,
            formattedValue: `${percent}% (₹${annualBasic.toLocaleString('en-IN')}/yr)`,
            confidence: 'HIGH',
            sourceSnippet: basicMatch[0]
          });
        }
      }
    }
  }

  // 6. Detect Variable Bonus / Annual Performance Bonus
  const bonusMatch = text.match(/(?:variable\s*pay|performance\s*bonus|target\s*bonus|annual\s*variable|performance\s*incentive|annual\s*bonus)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?)?)/i);
  if (bonusMatch && bonusMatch[1]) {
    const val = normalizeIndianNumber(bonusMatch[1]);
    if (val && val > 0 && val < (inputs.annualCtc || 10000000)) {
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

  // 7. Detect Joining / Sign-On Bonus
  const joiningMatch = text.match(/(?:joining\s*bonus|sign-?on\s*bonus|relocation\s*bonus|retention\s*bonus)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?)?)/i);
  if (joiningMatch && joiningMatch[1]) {
    const val = normalizeIndianNumber(joiningMatch[1]);
    if (val && val > 0 && val < (inputs.annualCtc || 10000000)) {
      inputs.joiningBonusAnnual = val;
      fields.push({
        label: 'Joining / Sign-on Bonus',
        key: 'joiningBonusAnnual',
        value: val,
        formattedValue: `₹${val.toLocaleString('en-IN')}`,
        confidence: 'HIGH',
        sourceSnippet: joiningMatch[0]
      });
    }
  }

  // 8. Detect RSU / Stock Grants
  const rsuMatch = text.match(/(?:rsu|esop|stock\s*grant|equity\s*grant|restricted\s*stock\s*units?)[\s:=-]+(?:inr|rs\.?|₹|\$|usd)?\s*([\d,]+(?:\.\d+)?\s*(?:lpa|lacs?|lakhs?|cr)?)/i);
  if (rsuMatch && rsuMatch[1]) {
    const val = normalizeIndianNumber(rsuMatch[1]);
    if (val && val > 0) {
      // If 4-year grant size is quoted, 1-year vest is ~25%
      let annualRsu = val;
      if (/4\s*years?|over\s*4\s*years/i.test(text)) {
        annualRsu = Math.round(val / 4);
      }
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

  // 9. Detect EPF Rules & Gratuity
  if (/pf\s*capped|1800\s*pm|15000\s*ceiling|statutory\s*pf/i.test(text)) {
    inputs.epfCapped = true;
    fields.push({
      label: 'EPF Mode',
      key: 'epfCapped',
      value: true,
      formattedValue: 'Capped at ₹1,800/month',
      confidence: 'HIGH',
      sourceSnippet: 'Detected statutory PF capping'
    });
  }

  if (/gratuity/i.test(text)) {
    inputs.includeGratuity = true;
  }

  // 10. Detect Tax Deductions (80C, 80D, Rent) from Form 16 / Tax sheets
  const sec80CMatch = text.match(/(?:80c|chapter\s*vi-?a|ppf|elss)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+)/i);
  if (sec80CMatch && sec80CMatch[1]) {
    const val = normalizeIndianNumber(sec80CMatch[1]);
    if (val && val > 0) {
      const capped80c = Math.min(150000, val);
      inputs.sec80C_Investments = capped80c;
      fields.push({
        label: 'Section 80C Deduction',
        key: 'sec80C_Investments',
        value: capped80c,
        formattedValue: `₹${capped80c.toLocaleString('en-IN')}`,
        confidence: 'MEDIUM',
        sourceSnippet: sec80CMatch[0]
      });
    }
  }

  const sec80DMatch = text.match(/(?:80d|medical\s*insurance|health\s*insurance)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+)/i);
  if (sec80DMatch && sec80DMatch[1]) {
    const val = normalizeIndianNumber(sec80DMatch[1]);
    if (val && val > 0) {
      const capped80d = Math.min(25000, val);
      inputs.sec80D_SelfFamily = capped80d;
      fields.push({
        label: 'Section 80D Health Insurance',
        key: 'sec80D_SelfFamily',
        value: capped80d,
        formattedValue: `₹${capped80d.toLocaleString('en-IN')}`,
        confidence: 'MEDIUM',
        sourceSnippet: sec80DMatch[0]
      });
    }
  }

  const rentMatch = text.match(/(?:rent\s*paid|hra\s*exemption|house\s*rent)[\s:=-]+(?:inr|rs\.?|₹)?\s*([\d,]+)/i);
  if (rentMatch && rentMatch[1]) {
    const val = normalizeIndianNumber(rentMatch[1]);
    if (val && val > 0) {
      inputs.annualRentPaid = val;
      fields.push({
        label: 'Annual Rent Paid',
        key: 'annualRentPaid',
        value: val,
        formattedValue: `₹${val.toLocaleString('en-IN')}`,
        confidence: 'MEDIUM',
        sourceSnippet: rentMatch[0]
      });
    }
  }

  return {
    inputs,
    fields,
    rawText,
    documentType,
    detectedEmployer,
    detectedDesignation,
    detectedLocation,
    previewUrl
  };
}

// Client-side PDF Parser using pdfjs-dist
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

// Client-side Image OCR Parser using tesseract.js
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

// Sample presets for 1-click testing
export const SAMPLE_DOCUMENTS = [
  {
    title: 'Bengaluru Tech SDE-2 Offer',
    subtitle: '₹24 LPA CTC · ₹2.5L Bonus · ₹6L RSUs · KA PT',
    sampleText: `
COMPENSATION & BENEFITS ANNEXURE
Position: Senior Software Engineer (SDE-2)
Location: Bengaluru, Karnataka
Organisation: CloudScale Technologies India Pvt. Ltd.

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
    title: 'Mumbai Lead Offer (Metro)',
    subtitle: '₹35 LPA CTC · ₹4L Variable · Mumbai Metro HRA',
    sampleText: `
LETTER OF EMPLOYMENT & SALARY STRUCTURE
Designation: Engineering Lead
Location: Mumbai, Maharashtra
Employer: FinTech Global Services Private Limited

ANNUAL COMPENSATION BREAKUP:
- Basic Pay: INR 17,50,000 / annum
- House Rent Allowance: INR 8,75,000 / annum (Metro 50%)
- Flexible Benefit Allowance: INR 5,75,000 / annum
- Employer Provident Fund Contribution: INR 2,10,000 / annum
- Gratuity: INR 84,135 / annum
- Total Fixed Cost to Company (CTC): INR 35,00,000 per annum (₹35 LPA)

VARIABLE COMPENSATION:
- Annual Performance Incentive: Target INR 4,00,000
- Health Insurance (Section 80D): Covered for Family up to INR 25,000
- Rent Paid for HRA: INR 3,60,000 / year (₹30,000/month)
`
  },
  {
    title: 'Fresher / Junior Dev Offer',
    subtitle: '₹6.5 LPA CTC · 100% Tax Free Under New Regime',
    sampleText: `
OFFER OF APPOINTMENT
Role: Associate Software Engineer
Location: Pune, Maharashtra
Company: CyberCore Solutions Ltd.

SALARY BREAKUP:
- Basic Salary: INR 3,25,000 per annum
- HRA: INR 1,30,000 per annum
- Special Allowance: INR 1,17,000 per annum
- Employer PF: INR 39,000 per annum
- Statutory Gratuity: INR 15,625 per annum
- Total Annual CTC: INR 6,50,000 per annum (6.5 LPA)
- Joining Bonus: INR 50,000 one-time
`
  }
];
