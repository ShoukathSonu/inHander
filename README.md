# inHander — In-Hand Salary Calculator for Indian Professionals

> **Know your real take-home pay.** A free, privacy-first salary calculator built for Indian professionals — featuring AI-powered payslip/offer-letter parsing, new-regime tax engine, and side-by-side offer comparison.

[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?style=flat-square&logo=astro)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com)

---

## What is inHander?

inHander is a free, browser-based salary calculator designed specifically for Indian professionals. It helps you understand your actual in-hand salary after all deductions — taxes, PF, professional tax, gratuity — without relying on oversimplified rules or generic online tools.

Everything runs **client-side**. No data is stored, no files are uploaded, no accounts needed.

---

## Features

### Salary Calculator
- **New Tax Regime (FY 2025-26)** engine with accurate slabs, standard deduction, and surcharge
- Breakdown of **in-hand pay**, EPF, gratuity, professional tax, and TDS
- City-aware **Professional Tax** (Karnataka, Maharashtra, Delhi, Telangana, Tamil Nadu, West Bengal)
- **HRA exemption** logic for metro vs non-metro cities
- Supports **EPF capped (Rs. 1,800/mo)** and **actual (12% of basic)** modes
- **Section 80C / 80D** deductions for old regime comparison
- Variable bonus, joining bonus, RSU/ESOP vesting support

### AI Document Parser (Payslip & Offer Letter Upload)
- Upload **PDF payslips or offer letters** — parsed entirely in the browser
- Smart **document classifier**: Payslip / Offer Letter / Appraisal Letter / Form 16 / Tax Sheet
- **Noise masking**: auto-filters PAN, UAN, PF numbers, bank account numbers, PIN codes, and phone numbers before extraction
- **Proration & LWP normalization**: detects Loss-of-Pay days and normalizes salary to full-month equivalent before annualizing
- **One-time component isolation**: Annual Bonus, Arrears, Leave Encashment, Overtime are added once (not multiplied by 12)
- Accurate **CTC projection**: `(Fixed Monthly Gross x 12) + One-Time Items + Employer PF + Gratuity`
- OCR support for **image-based payslips** via Tesseract.js

### Additional Tools

| Tool | Description |
|------|-------------|
| **Offer Comparator** | Compare two offers side-by-side — in-hand, effective tax rate, take-home delta |
| **Hike Simulator** | Simulate salary hike scenarios and project future in-hand pay |
| **Exit & Gratuity Calculator** | Calculate gratuity payout based on years of service |
| **Freelance / 44ADA Calculator** | Compute tax under presumptive taxation for freelancers |
| **Financial Blueprint** | Visualize your salary components as a breakdown chart |
| **Percentile Meter** | Benchmark your salary against industry percentiles |
| **Salary Slip Generator** | Generate a formatted salary slip from your inputs |
| **Tax Slabs Guide** | Visual comparison of Old vs New tax regime slabs |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro 7](https://astro.build) with React islands |
| UI | [React 19](https://react.dev) + [Tailwind CSS v4](https://tailwindcss.com) |
| PDF Parsing | [pdf.js (pdfjs-dist)](https://mozilla.github.io/pdf.js/) |
| OCR | [Tesseract.js](https://tesseract.projectnaptha.com/) |
| Deployment | [Cloudflare Pages](https://pages.cloudflare.com) via Wrangler |
| Icons | [Lucide React](https://lucide.dev) |
| Animations | [Motion](https://motion.dev) |
| Font | [Geist Variable](https://vercel.com/font) |

---

## Project Structure

```
inHander/
├── src/
│   ├── components/
│   │   ├── SalaryCalculator.tsx       # Main calculator UI & state
│   │   ├── DocumentImportModal.tsx    # Payslip / Offer Letter parser UI
│   │   ├── OfferComparator.tsx        # Side-by-side offer comparison
│   │   ├── HikeSimulator.tsx          # Salary hike projection tool
│   │   ├── ExitGratuityCalculator.tsx # Gratuity payout calculator
│   │   ├── FreelanceCalculator.tsx    # 44ADA presumptive tax tool
│   │   ├── FinancialBlueprint.tsx     # Salary breakdown visualization
│   │   ├── SalarySlipModal.tsx        # Salary slip generator
│   │   ├── PercentileMeter.tsx        # Industry salary percentile
│   │   └── BreakdownChart.tsx         # Earnings/deductions chart
│   ├── lib/
│   │   ├── taxEngine.ts               # Core tax calculation engine
│   │   └── documentParser.ts          # AI document parsing pipeline
│   ├── pages/
│   │   ├── index.astro                # Home / Calculator
│   │   ├── compare-offers.astro       # Offer comparison page
│   │   ├── hike-calculator.astro      # Hike simulator page
│   │   ├── 44ada-freelance.astro      # Freelance tax page
│   │   ├── guide.astro                # User guide
│   │   ├── tax-slabs.astro            # Tax slab reference
│   │   └── salary/[lpa].astro         # SEO pages per salary level
│   └── styles/
│       └── global.css
├── test/
│   └── documentParser.test.ts         # Unit tests for the parser
├── public/                            # Static assets
├── astro.config.mjs
├── wrangler.jsonc                     # Cloudflare deployment config
└── package.json
```

---

## Privacy

- **No data is stored.** All calculations happen client-side in your browser.
- **No analytics** on your salary inputs.
- Document parsing (PDF/OCR) is performed **locally** — files are never uploaded to any server.

---

<p align="center">Made with love for Indian professionals</p>
