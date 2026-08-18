export interface ExperienceSalaryBracket {
  minExp: number;
  maxExp: number;
  label: string;
  roleTitle: string;
  p25Ctc: number;
  medianCtc: number;
  p75Ctc: number;
  p90Ctc: number;
  p99Ctc: number;
  // Binned peer counts for Indian corporate & tech roles (in sample cohort of 10,000 peers)
  distributionBins: {
    maxCtc: number; // Upper bound in Rupees
    count: number;  // Number of peers in this salary bucket
  }[];
}

export const SALARY_EXPERIENCE_DISTRIBUTION: ExperienceSalaryBracket[] = [
  {
    minExp: 0,
    maxExp: 1,
    label: '0 - 1 Years',
    roleTitle: 'Freshers & Entry-Level Professionals',
    p25Ctc: 360000,
    medianCtc: 550000,
    p75Ctc: 1000000,
    p90Ctc: 1800000,
    p99Ctc: 3500000,
    distributionBins: [
      { maxCtc: 300000, count: 1800 },
      { maxCtc: 450000, count: 2500 },
      { maxCtc: 650000, count: 2400 },
      { maxCtc: 900000, count: 1400 },
      { maxCtc: 1300000, count: 900 },
      { maxCtc: 1800000, count: 550 },
      { maxCtc: 2500000, count: 300 },
      { maxCtc: 3500000, count: 110 },
      { maxCtc: 5000000, count: 40 }
    ]
  },
  {
    minExp: 2,
    maxExp: 3,
    label: '2 - 3 Years',
    roleTitle: 'Junior Engineers & Associate Specialists',
    p25Ctc: 550000,
    medianCtc: 850000,
    p75Ctc: 1500000,
    p90Ctc: 2400000,
    p99Ctc: 4500000,
    distributionBins: [
      { maxCtc: 400000, count: 1200 },
      { maxCtc: 600000, count: 1900 },
      { maxCtc: 900000, count: 2400 },
      { maxCtc: 1400000, count: 2000 },
      { maxCtc: 2000000, count: 1300 },
      { maxCtc: 2800000, count: 700 },
      { maxCtc: 3800000, count: 340 },
      { maxCtc: 5000000, count: 120 },
      { maxCtc: 8000000, count: 40 }
    ]
  },
  {
    minExp: 4,
    maxExp: 6,
    label: '4 - 6 Years',
    roleTitle: 'Mid-Level Engineers, SDE-2 & Consultants',
    p25Ctc: 1000000,
    medianCtc: 1650000,
    p75Ctc: 2700000,
    p90Ctc: 4200000,
    p99Ctc: 7000000,
    distributionBins: [
      { maxCtc: 700000, count: 800 },
      { maxCtc: 1100000, count: 1800 },
      { maxCtc: 1600000, count: 2300 },
      { maxCtc: 2400000, count: 2200 },
      { maxCtc: 3400000, count: 1500 },
      { maxCtc: 4800000, count: 850 },
      { maxCtc: 6500000, count: 380 },
      { maxCtc: 8500000, count: 130 },
      { maxCtc: 12000000, count: 40 }
    ]
  },
  {
    minExp: 7,
    maxExp: 10,
    label: '7 - 10 Years',
    roleTitle: 'Senior Engineers, Tech Leads & Managers',
    p25Ctc: 1800000,
    medianCtc: 2800000,
    p75Ctc: 4600000,
    p90Ctc: 6800000,
    p99Ctc: 11000000,
    distributionBins: [
      { maxCtc: 1200000, count: 600 },
      { maxCtc: 1800000, count: 1500 },
      { maxCtc: 2600000, count: 2200 },
      { maxCtc: 3800000, count: 2400 },
      { maxCtc: 5200000, count: 1700 },
      { maxCtc: 7200000, count: 950 },
      { maxCtc: 9500000, count: 420 },
      { maxCtc: 13000000, count: 170 },
      { maxCtc: 20000000, count: 60 }
    ]
  },
  {
    minExp: 11,
    maxExp: 15,
    label: '11 - 15 Years',
    roleTitle: 'Staff Engineers, Senior Managers & Architects',
    p25Ctc: 2800000,
    medianCtc: 4400000,
    p75Ctc: 7200000,
    p90Ctc: 10500000,
    p99Ctc: 18000000,
    distributionBins: [
      { maxCtc: 1800000, count: 500 },
      { maxCtc: 2700000, count: 1300 },
      { maxCtc: 4000000, count: 2300 },
      { maxCtc: 5800000, count: 2400 },
      { maxCtc: 8200000, count: 1800 },
      { maxCtc: 11500000, count: 1050 },
      { maxCtc: 15500000, count: 430 },
      { maxCtc: 22000000, count: 160 },
      { maxCtc: 35000000, count: 60 }
    ]
  },
  {
    minExp: 16,
    maxExp: 40,
    label: '16+ Years',
    roleTitle: 'Principal Engineers, Directors, VP & CXO',
    p25Ctc: 4200000,
    medianCtc: 6800000,
    p75Ctc: 11000000,
    p90Ctc: 17500000,
    p99Ctc: 30000000,
    distributionBins: [
      { maxCtc: 2500000, count: 400 },
      { maxCtc: 4000000, count: 1200 },
      { maxCtc: 6000000, count: 2100 },
      { maxCtc: 9000000, count: 2500 },
      { maxCtc: 13500000, count: 1900 },
      { maxCtc: 19000000, count: 1100 },
      { maxCtc: 26000000, count: 500 },
      { maxCtc: 38000000, count: 210 },
      { maxCtc: 60000000, count: 90 }
    ]
  }
];

export interface PercentileResult {
  percentileRank: number; // e.g. 88 means 88% earn less
  topPercent: number; // e.g. 12 means top 12%
  bracket: ExperienceSalaryBracket;
  experienceYears: number;
  ctc: number;
  medianCtc: number;
  p25Ctc: number;
  p75Ctc: number;
  p90Ctc: number;
  tierDescription: string;
}

export function calculateSalaryPercentile(ctc: number, expYears: number): PercentileResult {
  const years = Math.max(0, Math.min(40, expYears));
  
  // Find matching bracket
  const bracket = SALARY_EXPERIENCE_DISTRIBUTION.find(
    b => years >= b.minExp && years <= b.maxExp
  ) || SALARY_EXPERIENCE_DISTRIBUTION[SALARY_EXPERIENCE_DISTRIBUTION.length - 1];

  const totalPeers = bracket.distributionBins.reduce((sum, b) => sum + b.count, 0);
  
  let peersEarningLess = 0;
  let prevMaxCtc = 0;

  for (const bin of bracket.distributionBins) {
    if (ctc >= bin.maxCtc) {
      peersEarningLess += bin.count;
      prevMaxCtc = bin.maxCtc;
    } else {
      // Linear interpolation within the bin
      const rangeSpan = bin.maxCtc - prevMaxCtc;
      const progressInBin = Math.max(0, (ctc - prevMaxCtc) / (rangeSpan || 1));
      peersEarningLess += bin.count * progressInBin;
      break;
    }
  }

  // Calculate raw percentile rank
  let percentile = (peersEarningLess / totalPeers) * 100;
  
  // Clamp between 1st and 99th percentile for realistic presentation
  percentile = Math.max(1, Math.min(99, Math.round(percentile * 10) / 10));
  
  const topPercent = Math.max(1, 100 - Math.floor(percentile));

  let tierDescription = 'Emerging Talent';
  if (percentile >= 95) {
    tierDescription = 'Top Tier Industry Leader (Top 5%)';
  } else if (percentile >= 85) {
    tierDescription = 'High Earning Upper Echelon (Top 15%)';
  } else if (percentile >= 65) {
    tierDescription = 'Above Market Standard';
  } else if (percentile >= 40) {
    tierDescription = 'Competitive Market Benchmark';
  } else {
    tierDescription = 'Growth Phase (Below Median)';
  }

  return {
    percentileRank: percentile,
    topPercent,
    bracket,
    experienceYears: years,
    ctc,
    medianCtc: bracket.medianCtc,
    p25Ctc: bracket.p25Ctc,
    p75Ctc: bracket.p75Ctc,
    p90Ctc: bracket.p90Ctc,
    tierDescription
  };
}
