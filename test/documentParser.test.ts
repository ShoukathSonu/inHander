import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDocumentText,
  detectDocumentType,
  extractProrationDetails,
  extractOneTimeAndVariableEarnings,
  maskNoiseIdentifiers,
  normalizeIndianNumber,
  SAMPLE_DOCUMENTS
} from '../src/lib/documentParser.ts';

test('1. Document Classification & Type Detection', async (t) => {
  await t.test('detects PAYSLIP accurately with attendance and earnings keywords', () => {
    const payslipText = `
      INFOTECH GLOBAL SOLUTIONS PVT LTD
      SALARY SLIP FOR THE MONTH OF AUGUST 2025
      Employee ID: EMP-98214
      Paid Days: 25, LWP: 5
      Gross Earnings: 1,00,000
      Total Deductions: 13,200
      Net Pay: 86,800
    `;
    const result = detectDocumentType(payslipText);
    assert.equal(result.type, 'PAYSLIP');
    assert.equal(result.confidence, 'HIGH');
    assert.ok(result.payPeriod?.includes('AUGUST 2025'));
  });

  await t.test('detects OFFER_LETTER accurately with DOJ and Annexure keywords', () => {
    const offerText = `
      CloudScale Technologies India Pvt. Ltd.
      Offer of Employment
      Position: Senior Software Engineer (SDE-2)
      Date of Joining: 01/04/2025
      Compensation Annexure
      Total Cost to Company (Annual CTC): INR 24,00,000 per annum
    `;
    const result = detectDocumentType(offerText);
    assert.equal(result.type, 'OFFER_LETTER');
    assert.equal(result.confidence, 'HIGH');
  });

  await t.test('detects APPRAISAL_LETTER with revision and w.e.f. keywords', () => {
    const appraisalText = `
      Performance Appraisal & Revised Compensation Letter
      We are pleased to inform you that with effect from (w.e.f.) April 1, 2025,
      your Annual CTC has been revised to INR 18,00,000 per annum.
    `;
    const result = detectDocumentType(appraisalText);
    assert.equal(result.type, 'APPRAISAL_LETTER');
    assert.equal(result.confidence, 'HIGH');
  });
});

test('2. Strict Extraction & Noise Filtering (PIN, UAN, Bank A/c, Emp ID)', async (t) => {
  await t.test('ignores 6-digit PIN code and 12-digit UAN number instead of taking them as CTC', () => {
    const textWithNoise = `
      SALARY SLIP FOR THE MONTH OF AUGUST 2025
      Office Address: Survey No 45, Outer Ring Road, Bellandur, Bengaluru - 560103
      Pin Code: 560103, Tel: +91 9876543210
      UAN: 101234567890
      Employee ID: 98124
      PF No: KN/BNG/0012345/000/0001234
      Bank A/c No: 918020038472918
      PAN: ABCDE1234F
      Gross Earnings: ₹1,50,000
      Net Pay: ₹1,28,000
    `;

    const parsed = analyzeDocumentText(textWithNoise);

    // CTC should NOT be 560103 or 101234567890 or 98124
    assert.notEqual(parsed.inputs.annualCtc, 560103);
    assert.notEqual(parsed.inputs.annualCtc, 101234567890);
    assert.notEqual(parsed.inputs.annualCtc, 98124);

    // Monthly gross ₹1,50,000 normalized & annualized with benefits should be > ₹18 LPA
    assert.ok((parsed.inputs.annualCtc || 0) >= 1800000);
    assert.equal(parsed.breakdown.monthlyGross, 150000);
    assert.equal(parsed.breakdown.monthlyNetPay, 128000);
  });

  await t.test('maskNoiseIdentifiers properly masks sensitive and confusing numbers', () => {
    const raw = 'PIN: 560066, UAN: 101234567890, Emp ID: 98214, Phone: 9876543210';
    const masked = maskNoiseIdentifiers(raw);
    assert.ok(!masked.includes('560066'));
    assert.ok(!masked.includes('101234567890'));
    assert.ok(!masked.includes('98214'));
    assert.ok(!masked.includes('9876543210'));
  });
});

test('3. Payslip Normalization Engine (5 Days LWP Proration)', async (t) => {
  await t.test('normalizes partial month (25/30 days) to full month before annualizing', () => {
    const payslipWithLwp = `
      SALARY SLIP FOR THE MONTH OF AUGUST 2025
      Employee ID: EMP-101
      Calendar Days: 30
      Paid Days: 25
      Leave Without Pay (LWP): 5
      Basic Pay: 41,667
      House Rent Allowance: 20,833
      Special Allowance: 37,500
      Gross Earnings: 1,00,000
      Employee PF: 5,000
      Income Tax (TDS): 8,000
      Total Deductions: 13,200
      Net Pay: 86,800
    `;

    const proration = extractProrationDetails(payslipWithLwp);
    assert.equal(proration.isProrated, true);
    assert.equal(proration.totalDays, 30);
    assert.equal(proration.paidDays, 25);
    assert.equal(proration.lwpDays, 5);
    assert.equal(proration.prorationFactor, 30 / 25); // 1.20x

    const parsed = analyzeDocumentText(payslipWithLwp);

    // Actual gross was ₹1,00,000 for 25 days -> Normalized is ₹1,20,000 for 30 days
    assert.equal(parsed.breakdown.actualMonthlyGross, 100000);
    assert.equal(parsed.breakdown.normalizedFixedMonthlyGross, 120000);

    // Base Annual Gross = ₹1,20,000 * 12 = ₹14,40,000
    assert.equal(parsed.breakdown.annualGrossSalary, 1440000);

    // Basic is normalized to ~₹50,000/mo (₹6,00,000/yr)
    assert.equal(parsed.breakdown.earnings.basic.monthly, 50000);
    assert.equal(parsed.breakdown.earnings.basic.annual, 600000);

    // Employer PF (12% of 6L) = ₹72,000
    assert.equal(parsed.breakdown.employerBenefits.employerPfAnnual, 72000);

    // Gratuity (4.81% of 6L) = ₹28,846
    assert.equal(parsed.breakdown.employerBenefits.gratuityAnnual, 28846);

    // Projected Annual CTC = 14,40,000 + 72,000 + 28,846 = 15,40,846
    assert.equal(parsed.breakdown.annualCtc, 1540846);
    assert.equal(parsed.inputs.annualCtc, 1540846);

    // TDS extraction
    assert.equal(parsed.breakdown.deductions.tdsMonthly, 8000);
    assert.equal(parsed.breakdown.deductions.tdsAnnualProjected, 96000);
    assert.equal(parsed.breakdown.monthlyNetPay, 86800);
  });
});

test('4. Non-Recurring & Variable Component Isolation', async (t) => {
  await t.test('payslip containing Annual Bonus of ₹50,000 adds bonus only ONCE (not 12x)', () => {
    const payslipWithBonus = `
      TECH DYNAMICS INDIA PVT LTD
      PAYSLIP FOR THE MONTH OF MARCH 2026
      Employee Name: Rahul Sharma
      Designation: Senior Software Engineer

      EARNINGS                    AMOUNT (INR)
      Basic Pay                    50,000.00
      House Rent Allowance (HRA)   25,000.00
      Special Allowance            10,000.00
      Annual Bonus                 50,000.00
      ----------------------------------------
      TOTAL GROSS EARNINGS:       1,35,000.00
      NET PAY:                    1,20,000.00
    `;

    const parsed = analyzeDocumentText(payslipWithBonus);

    // Fixed recurring monthly gross = Basic (50k) + HRA (25k) + Special (10k) = 85,000
    assert.equal(parsed.breakdown.fixedMonthlyGross, 85000);
    assert.equal(parsed.breakdown.normalizedFixedMonthlyGross, 85000);

    // Total One-Time Variable = ₹50,000
    assert.equal(parsed.breakdown.earnings.totalOneTimeVariableAmount, 50000);

    // Annual Gross = (Fixed Monthly × 12) + Annual Bonus = (85,000 × 12) + 50,000 = 10,20,000 + 50,000 = 10,70,000
    // MUST NOT BE 1,35,000 × 12 = 16,20,000
    assert.equal(parsed.breakdown.annualGrossSalary, 1070000);
    assert.notEqual(parsed.breakdown.annualGrossSalary, 135000 * 12);

    // Basic Annual = 50,000 * 12 = 6,00,000
    assert.equal(parsed.breakdown.earnings.basic.annual, 600000);
    // Employer PF (12% of 6L) = 72,000
    // Gratuity (4.81% of 6L) = 28,846
    // Projected CTC = 10,70,000 + 72,000 + 28,846 = 11,70,846
    assert.equal(parsed.breakdown.annualCtc, 1170846);
    assert.equal(parsed.inputs.annualCtc, 1170846);
  });

  await t.test('payslip containing Arrears of ₹15,000 isolates arrears and adds only ONCE', () => {
    const payslipWithArrears = `
      GLOBAL TECH SOLUTIONS PVT LTD
      SALARY SLIP FOR THE MONTH OF APRIL 2026
      
      EARNINGS                    AMOUNT (INR)
      Basic Salary                 60,000.00
      House Rent Allowance (HRA)   30,000.00
      Special Allowance            10,000.00
      Salary Arrears               15,000.00
      ----------------------------------------
      TOTAL GROSS EARNINGS:       1,15,000.00
      NET TAKE HOME:              1,02,000.00
    `;

    const parsed = analyzeDocumentText(payslipWithArrears);

    // Fixed monthly = 60,000 + 30,000 + 10,000 = 100,000
    assert.equal(parsed.breakdown.fixedMonthlyGross, 100000);
    assert.equal(parsed.breakdown.earnings.totalOneTimeVariableAmount, 15000);

    // Annual Gross = (100,000 × 12) + 15,000 = 12,00,000 + 15,000 = 12,15,000
    // MUST NOT BE 1,15,000 × 12 = 13,80,000
    assert.equal(parsed.breakdown.annualGrossSalary, 1215000);
    assert.notEqual(parsed.breakdown.annualGrossSalary, 115000 * 12);
  });
});

test('5. Offer Letter Direct CTC (No Double Multiplication)', async (t) => {
  await t.test('extracts stated Annual CTC directly without multiplying by 12 and separates bonuses', () => {
    const offerLetterText = `
      CloudScale Technologies India Pvt. Ltd.
      Offer of Employment
      Position: Senior Software Engineer (SDE-2)
      Location: Bengaluru, Karnataka
      Date of Joining: 01/04/2025

      1. Basic Salary: INR 12,00,000 per annum (50% of CTC)
      2. House Rent Allowance (HRA): INR 6,00,000 per annum
      3. Special Allowance: INR 3,12,000 per annum
      4. Employer Provident Fund (EPF): INR 1,44,000 per annum
      5. Statutory Gratuity Provision: INR 57,692 per annum
      6. Total Cost to Company (Annual CTC): INR 24,00,000 per annum (24 LPA)

      ADDITIONAL INCENTIVES:
      - Annual Performance Variable Bonus: Target INR 2,50,000
      - Sign-on / Joining Bonus: INR 2,00,000 payable in 1st month
      - Equity / RSU Grant Value: INR 24,00,000 vested over 4 years
    `;

    const parsed = analyzeDocumentText(offerLetterText);

    assert.equal(parsed.documentType, 'OFFER_LETTER');
    assert.equal(parsed.inputs.annualCtc, 2400000);
    assert.equal(parsed.breakdown.annualCtc, 2400000);

    // Basic is 50%
    assert.equal(parsed.inputs.basicPercent, 50);
    assert.equal(parsed.breakdown.earnings.basic.annual, 1200000);

    // Incentives separated
    assert.equal(parsed.inputs.variableBonusAnnual, 250000);
    assert.equal(parsed.inputs.joiningBonusAnnual, 200000);
    assert.equal(parsed.inputs.rsuVestedAnnual, 600000); // 24L / 4 years = 6L/yr
  });
});

test('6. Employer Name & Role Clean Extraction (No Bleed/Page Dump)', async (t) => {
  await t.test('extracts clean company name and designation without capturing entire payslip body', () => {
    const rawOcr = `Rakuten India Enterprise Private Limited Bagamane Pallavi Tower 20, 1st Cross , S.R Nagar, Raja Ram Mohan Roy Road Bangalore- MASKED_PINCODE. MASKED_EMP_ID Employee Name MARY PRIYANKA INJAMALA Date Of Birth MASKED_DATE Date of Joining MASKED_DATE Designation SOFTWARE ENGINEER II Bank Name HDFC BANK Bank AC No MASKED_BANK_AC PAN NO MASKED_PAN No of Days LOPLOPR 31.00 0.00 0.00 PF No. BGBNG145712800013489 Universal Account Number MASKED_UAN_OR_AADHAAR Payslip for the month of Jul 2026 Earnings Reference Amount Amount Arrear Amount Year to Date Deductions Amount Year to Date Basic 46,300.00 46,300.00 0.00 185,200.00 Profession Tax 200.00 800.00 House Rent Allowance 30,095.00 30,095.00 0.00 120,380.00 Provident Fund PF 5,556.00 22,224.00 Conveyance 10,649.00 10,649.00 0.00 42,596.00 Income Tax 7,339.00 23,240.00 LTA Allowance 11,575.00 11,575.00 0.00 46,300.00 Special Allowance 11,575.00 11,575.00 0.00 46,299.00 Local Commute Allowance 6,500.00 6,500.00 0.00 26,000.00 Gross Earnings 116,694.00 466,775.00 Gross Deductions 13,095.00 46,264.00 Net Pay 103,599.00 Net Pay In Words Rupees One Lakh Three Thousand Five Hundred And Ninety Nine Only Other Statutory Deductions Projected Year to Date Balance Income Tax 73,839.00 23,240.00 50,599.00 Professional Tax 0.00 800.00 0.00 Provident FundPF Details Amount Year to Date Employee Contribution to PF 5,556.00 22,224.00 Employee VPF Contribution 0.00 0.00 Employer Contribution to EPS 1,250.00 5,000.00 Employer Contribution to PF 4,306.00 17,224.00 Note This is a computer generated statement and does not require authentication.`;

    const parsed = analyzeDocumentText(rawOcr);

    // Employer name must be clean and short
    assert.equal(parsed.detectedEmployer, 'Rakuten India Enterprise Private Limited');
    assert.ok((parsed.detectedEmployer || '').length <= 50);

    // Designation must be clean and short
    assert.equal(parsed.detectedDesignation, 'SOFTWARE ENGINEER II');
    assert.ok((parsed.detectedDesignation || '').length <= 30);

    // Location
    assert.equal(parsed.detectedLocation, 'Bengaluru, Karnataka');

    // Net pay and gross
    assert.equal(parsed.breakdown.monthlyGross, 116694);
    assert.equal(parsed.breakdown.monthlyNetPay, 103599);
    assert.equal(parsed.breakdown.deductions.tdsMonthly, 7339);
    assert.equal(parsed.breakdown.deductions.employeePfMonthly, 5556);
    assert.equal(parsed.breakdown.deductions.professionalTaxMonthly, 200);
  });
});
