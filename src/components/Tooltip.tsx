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
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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
        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[#888888] dark:text-[#777777] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer focus:outline-hidden touch-manipulation"
        aria-label={title || 'Information'}
      >
        {children || <Info className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <>
          {/* Mobile Backdrop */}
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
              fixed inset-x-6 bottom-6 z-50 p-5 rounded-2xl shadow-xl 
              bg-[#171717] dark:bg-[#222222] text-white dark:text-[#ededed] text-xs leading-relaxed 
              sm:fixed-none sm:absolute ${desktopPositionClasses[position]} sm:inset-x-auto sm:bottom-auto sm:w-72 sm:p-4 sm:rounded-xl sm:shadow-lg
              animate-in fade-in zoom-in-95 duration-150 pointer-events-auto select-text
            `}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              {title && (
                <span className="font-semibold text-white text-xs">
                  {title}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-1 -mr-1 -mt-1 text-[#888888] hover:text-white"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[#b0b0b0] dark:text-[#a0a0a0] text-xs leading-normal">{content}</div>
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
    text: "Under the New Tax Regime, taxable income up to ₹7,00,000 (gross ₹7,75,000 after standard deduction) pays zero tax. Marginal relief caps tax on income marginally above ₹7L."
  },
  standardDeduction: {
    title: "Standard Deduction (₹75,000)",
    text: "A flat statutory deduction directly reduced from gross salary. Budget 2024 raised this to ₹75,000 in the New Regime (remains ₹50,000 in Old Regime)."
  },
  rule1526: {
    title: "15/26 Gratuity Rule",
    text: "Statutory formula: (15 × Last basic × completed years) ÷ 26. Companies allocate ~4.81% of basic salary inside CTC towards gratuity provisioning."
  },
  sec80c: {
    title: "Section 80C Deductions",
    text: "Allows up to ₹1,50,000 deduction per financial year for investments in EPF, PPF, ELSS mutual funds, and life insurance premiums."
  },
  sec80d: {
    title: "Section 80D Health Insurance",
    text: "Tax deductions for health insurance premiums: up to ₹25,000 for self/family, plus up to ₹50,000 for senior citizen parents."
  },
  sec80ccd2: {
    title: "Section 80CCD(2) Employer NPS",
    text: "Employer contributions to NPS up to 14% of basic salary are 100% tax-free in both New and Old Tax Regimes."
  },
  sec1013a: {
    title: "Section 10(13A) HRA Exemption",
    text: "Exempts rent based on minimum of actual HRA, rent minus 10% basic, or 50%/40% of basic salary."
  },
  epfCap: {
    title: "Statutory EPF Capping (₹1,800/mo)",
    text: "Mandatory statutory EPF contribution is 12% of ₹15,000 ceiling (₹1,800/month). Opting for the cap increases your monthly take-home cash."
  },
  pt: {
    title: "Professional Tax (PT)",
    text: "State government deduction from salaried employees, capped by the Constitution of India at ₹2,500 per year."
  }
};
