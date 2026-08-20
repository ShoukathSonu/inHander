import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

export interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  badgeText?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  title,
  position = 'top',
  className = '',
  badgeText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        isOpen &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const desktopPositionClasses = {
    top: 'sm:bottom-full sm:left-1/2 sm:-translate-x-1/2 sm:mb-2',
    bottom: 'sm:top-full sm:left-1/2 sm:-translate-x-1/2 sm:mt-2',
    left: 'sm:right-full sm:top-1/2 sm:-translate-y-1/2 sm:mr-2',
    right: 'sm:left-full sm:top-1/2 sm:-translate-y-1/2 sm:ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[#171717] dark:border-t-[#222222] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[#171717] dark:border-b-[#222222] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[#171717] dark:border-l-[#222222] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[#171717] dark:border-r-[#222222] border-y-transparent border-l-transparent'
  };

  return (
    <span className={`relative inline-flex items-center align-middle mx-1 shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[#888888] dark:text-[#737373] hover:text-[#0070f3] dark:hover:text-[#38bdf8] hover:bg-[#0070f3]/10 dark:hover:bg-[#0070f3]/20 transition-all cursor-pointer focus:outline-hidden touch-manipulation"
        aria-label={title || 'Information'}
        title={typeof content === 'string' ? content : undefined}
      >
        {children || <Info className="w-3.5 h-3.5" />}
      </button>

      {/* Popover Bubble (Responsive: Fixed center on mobile, positioned floating on desktop) */}
      {isOpen && (
        <>
          {/* Mobile Backdrop to easily dismiss on small screens */}
          <div 
            className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-100" 
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }} 
            aria-hidden="true"
          />

          <div
            ref={tooltipRef}
            role="tooltip"
            className={`
              fixed inset-x-4 bottom-6 z-50 p-4 rounded-2xl shadow-2xl border border-white/15 dark:border-white/10 
              bg-[#171717] dark:bg-[#1c1c1c] text-white dark:text-[#ededed] text-[13px] leading-relaxed 
              sm:fixed-none sm:absolute ${desktopPositionClasses[position]} sm:inset-x-auto sm:bottom-auto sm:w-72 sm:p-3 sm:rounded-xl sm:text-[12px] sm:shadow-modal
              backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-auto select-text
            `}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {badgeText && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#0070f3]/20 text-[#38bdf8] border border-[#0070f3]/30">
                    {badgeText}
                  </span>
                )}
                {title && (
                  <span className="font-bold text-white text-[13px] sm:text-[12px]">
                    {title}
                  </span>
                )}
              </div>

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-1 -mr-1 -mt-1 text-[#888888] hover:text-white rounded-lg"
                aria-label="Close tooltip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[#cccccc] dark:text-[#a1a1a1] text-[12px] sm:text-[11.5px] leading-normal">{content}</div>

            {/* Triangular Pointer Arrow (Visible only on desktop) */}
            <div
              className={`hidden sm:block absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
              aria-hidden="true"
            />
          </div>
        </>
      )}
    </span>
  );
};

// Preset Tax Terms for Quick Insertion
export const TaxGlossary = {
  sec87a: {
    title: "Section 87A Rebate & Marginal Relief",
    badge: "Budget 2024",
    text: "Under the New Tax Regime, if your taxable income is up to ₹7,00,000 (effectively ₹7,75,000 after ₹75k standard deduction), your tax is 100% rebated. Marginal relief caps tax on income marginally above ₹7L."
  },
  standardDeduction: {
    title: "Standard Deduction (₹75,000)",
    badge: "Statutory",
    text: "A flat statutory deduction directly reduced from gross salary. Budget 2024 raised this to ₹75,000 in the New Regime (remains ₹50,000 in Old Regime) with zero investment proofs needed."
  },
  rule1526: {
    title: "15/26 Gratuity Rule",
    badge: "Payment of Gratuity Act",
    text: "Statutory formula: (15 × Last Drawn Basic × Completed Years) ÷ 26 working days. Companies allocate ~4.81% of basic salary inside CTC towards gratuity provisioning."
  },
  sec80c: {
    title: "Section 80C Deductions",
    badge: "Old Regime Only",
    text: "Allows up to ₹1,50,000 deduction per financial year for investments in EPF, PPF, ELSS mutual funds, life insurance premiums, and home loan principal repayments."
  },
  sec80d: {
    title: "Section 80D Health Insurance",
    badge: "Old Regime Only",
    text: "Tax deductions for health insurance premiums: up to ₹25,000 for self/family, plus up to ₹50,000 for senior citizen parents (total ₹75,000 - ₹1,00,000)."
  },
  sec80ccd2: {
    title: "Section 80CCD(2) Employer NPS",
    badge: "Both Regimes",
    text: "Employer contributions to your National Pension System (NPS) account up to 14% of Basic Salary are 100% tax-free in both New and Old Tax Regimes."
  },
  sec1013a: {
    title: "Section 10(13A) HRA Exemption",
    badge: "Old Regime Only",
    text: "Exempts House Rent Allowance based on the minimum of: 1) Actual HRA received, 2) Rent paid minus 10% Basic, or 3) 50% Basic (Metros) / 40% Basic (Non-Metros)."
  },
  epfCap: {
    title: "Statutory EPF Capping (₹1,800/mo)",
    badge: "Cash-Flow Optimizer",
    text: "By statutory rule, mandatory EPF contribution is 12% of ₹15,000 (i.e. ₹1,800/month). Opting for the cap increases your immediate monthly bank credit."
  },
  pt: {
    title: "Professional Tax (PT)",
    badge: "State Statutory",
    text: "A state government levy deducted monthly from salaried employees, capped by Article 276 of the Indian Constitution at a maximum of ₹2,500 per year."
  }
};
