export interface StatePtInfo {
  code: string;
  name: string;
  calculateAnnualPt: (monthlyGross: number, isFemale?: boolean) => number;
  monthlyNote: string;
}

export const STATE_PT_RULES: Record<string, StatePtInfo> = {
  KA: {
    code: 'KA',
    name: 'Karnataka (Bengaluru)',
    calculateAnnualPt: (monthlyGross: number) => {
      if (monthlyGross <= 15000) return 0;
      return 2400; // ₹200 per month
    },
    monthlyNote: '₹200/month (Exempt if gross ≤ ₹15,000)'
  },
  MH: {
    code: 'MH',
    name: 'Maharashtra (Mumbai, Pune)',
    calculateAnnualPt: (monthlyGross: number, isFemale = false) => {
      if (isFemale && monthlyGross <= 25000) return 0;
      if (monthlyGross <= 7500) return 0;
      if (monthlyGross <= 10000) return 175 * 12;
      return 2500; // ₹200 for 11 months + ₹300 in Feb
    },
    monthlyNote: '₹200/mo (₹300 in Feb, ₹2,500/yr total)'
  },
  TS_AP: {
    code: 'TS_AP',
    name: 'Telangana / Andhra Pradesh (Hyderabad, Vizag)',
    calculateAnnualPt: (monthlyGross: number) => {
      if (monthlyGross <= 15000) return 0;
      if (monthlyGross <= 20000) return 150 * 12;
      return 2400; // ₹200 per month
    },
    monthlyNote: '₹200/month (if gross > ₹20,000)'
  },
  TN: {
    code: 'TN',
    name: 'Tamil Nadu (Chennai, Coimbatore)',
    calculateAnnualPt: (monthlyGross: number) => {
      if (monthlyGross < 21000) return 0;
      return 2500; // Slab approx ₹208/mo
    },
    monthlyNote: '₹208/month (~₹2,500/yr for gross > ₹21,000)'
  },
  WB: {
    code: 'WB',
    name: 'West Bengal (Kolkata)',
    calculateAnnualPt: (monthlyGross: number) => {
      if (monthlyGross <= 10000) return 0;
      if (monthlyGross <= 15000) return 110 * 12;
      if (monthlyGross <= 25000) return 130 * 12;
      if (monthlyGross <= 40000) return 150 * 12;
      return 2500;
    },
    monthlyNote: 'Graded up to ₹200/month (max ₹2,500/yr)'
  },
  GJ: {
    code: 'GJ',
    name: 'Gujarat (Ahmedabad, GIFT City)',
    calculateAnnualPt: (monthlyGross: number) => {
      if (monthlyGross <= 12000) return 0;
      return 2400; // ₹200/mo
    },
    monthlyNote: '₹200/month (Exempt if gross ≤ ₹12,000)'
  },
  DL_HR: {
    code: 'DL_HR',
    name: 'Delhi NCR / Haryana (0 PT)',
    calculateAnnualPt: () => 0,
    monthlyNote: '₹0 (No Professional Tax in Delhi, Haryana, UP, Rajasthan)'
  },
  OTHER: {
    code: 'OTHER',
    name: 'Other States / UTs',
    calculateAnnualPt: (monthlyGross: number) => {
      if (monthlyGross <= 15000) return 0;
      return 2400;
    },
    monthlyNote: '₹200/month standard'
  },
  // Aliases for backward compatibility
  TS: {
    code: 'TS',
    name: 'Telangana (Hyderabad)',
    calculateAnnualPt: (monthlyGross: number) => {
      if (monthlyGross <= 15000) return 0;
      if (monthlyGross <= 20000) return 150 * 12;
      return 2400;
    },
    monthlyNote: '₹200/month (if gross > ₹20,000)'
  },
  AP: {
    code: 'AP',
    name: 'Andhra Pradesh (Visakhapatnam)',
    calculateAnnualPt: (monthlyGross: number) => {
      if (monthlyGross <= 15000) return 0;
      if (monthlyGross <= 20000) return 150 * 12;
      return 2400;
    },
    monthlyNote: '₹200/month (if gross > ₹20,000)'
  },
  DL: {
    code: 'DL',
    name: 'Delhi NCR (0 PT)',
    calculateAnnualPt: () => 0,
    monthlyNote: '₹0 (No Professional Tax in Delhi)'
  },
  HR: {
    code: 'HR',
    name: 'Haryana (0 PT)',
    calculateAnnualPt: () => 0,
    monthlyNote: '₹0 (No Professional Tax in Haryana)'
  },
  UP: {
    code: 'UP',
    name: 'Uttar Pradesh (0 PT)',
    calculateAnnualPt: () => 0,
    monthlyNote: '₹0 (No Professional Tax in UP)'
  }
};

export const PRIMARY_STATE_OPTIONS = [
  { code: 'KA', name: 'Karnataka' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'TS_AP', name: 'Telangana / Andhra Pradesh' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'DL_HR', name: 'Delhi NCR / Haryana (0 PT)' },
  { code: 'OTHER', name: 'Other' }
];
