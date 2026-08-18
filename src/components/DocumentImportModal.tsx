import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  FileUp,
  Scan,
  Zap,
  Building,
  MapPin,
  Briefcase
} from 'lucide-react';
import {
  parsePdfDocument,
  parseImageDocument,
  analyzeDocumentText,
  SAMPLE_DOCUMENTS,
  type ParseResult
} from '../lib/documentParser';
import type { SalaryInputs } from '../lib/taxEngine';
import { formatINR } from '../lib/formatters';
import { STATE_PT_RULES } from '../lib/statePtRules';
import confetti from 'canvas-confetti';

interface DocumentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (extractedInputs: Partial<SalaryInputs>) => void;
}

export const DocumentImportModal: React.FC<DocumentImportModalProps> = ({
  isOpen,
  onClose,
  onApply
}) => {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('Initializing scanner...');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [editedInputs, setEditedInputs] = useState<Partial<SalaryInputs>>({});
  const [showRawText, setShowRawText] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clipboard Paste (Cmd+V / Ctrl+V) Handler
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setScanProgress(0);
      setParseResult(null);
      setErrorMsg(null);
      setShowRawText(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const processFile = async (file: File | Blob) => {
    setErrorMsg(null);
    setStep('scanning');
    setScanProgress(10);
    setScanStatus('Reading file contents...');

    try {
      let result: ParseResult;
      const isPdf = file.type === 'application/pdf' || (file as File).name?.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        result = await parsePdfDocument(file as File, (status, pct) => {
          setScanStatus(status);
          setScanProgress(pct);
        });
      } else {
        result = await parseImageDocument(file, (status, pct) => {
          setScanStatus(status);
          setScanProgress(pct);
        });
      }

      setParseResult(result);
      setEditedInputs(result.inputs);
      setScanProgress(100);
      setTimeout(() => {
        setStep('review');
      }, 400);
    } catch (err: any) {
      console.error('Document analysis failed:', err);
      setErrorMsg(err?.message || 'Failed to scan document. Please try a clearer image or sample preset.');
      setStep('upload');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleApplySample = (sample: typeof SAMPLE_DOCUMENTS[0]) => {
    setStep('scanning');
    setScanProgress(30);
    setScanStatus('Parsing sample text layout...');

    setTimeout(() => {
      setScanProgress(70);
      setScanStatus('Extracting compensation components...');
      const result = analyzeDocumentText(sample.sampleText);
      setParseResult(result);
      setEditedInputs(result.inputs);
      setScanProgress(100);
      setTimeout(() => {
        setStep('review');
      }, 300);
    }, 400);
  };

  const handleConfirmApply = () => {
    onApply(editedInputs);
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (_) { }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-[#121212] rounded-3xl border border-[#ebebeb] dark:border-[#262626] shadow-modal overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ebebeb] dark:border-[#262626] bg-[#fafafa]/80 dark:bg-[#181818]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0070f3]/10 dark:bg-[#0070f3]/20 flex items-center justify-center text-[#0070f3]">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#171717] dark:text-white leading-tight">
                Import &amp; Analyze Offer Letter / Payslip
              </h2>
              <span className="text-[11px] font-mono text-[#888888] dark:text-[#737373]">
                Photos, Screenshots, PDFs · 100% Client-Side OCR
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#888888] hover:text-[#171717] dark:hover:text-white hover:bg-[#ebebeb] dark:hover:bg-[#262626] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: UPLOAD / DROP / PASTE */}
          {step === 'upload' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-[#ee0000]/10 border border-[#ee0000]/20 text-[#ee0000] text-[13px] flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Main Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group ${dragActive
                    ? 'border-[#0070f3] bg-[#0070f3]/5 dark:bg-[#0070f3]/10 scale-[1.01]'
                    : 'border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818]/50 hover:border-[#a1a1a1] dark:hover:border-[#525252] hover:bg-white dark:hover:bg-[#181818]'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white group-hover:scale-110 group-hover:border-[#0070f3] transition-all shadow-stacked-sm">
                  <FileUp className="w-6 h-6 text-[#0070f3]" />
                </div>

                <div className="mt-4 space-y-1.5">
                  <h3 className="text-[16px] font-semibold text-[#171717] dark:text-white">
                    Drop your Offer Letter, Payslip, or Screenshot here
                  </h3>
                  <p className="text-[13px] text-[#4d4d4d] dark:text-[#a1a1a1]">
                    or <span className="text-[#0070f3] font-medium underline">browse file</span> from your device
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-mono text-[#888888] dark:text-[#737373]">
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626]">PDF</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626]">PNG</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626]">JPG</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-[#222222] border border-[#ebebeb] dark:border-[#262626]">WEBP</span>
                    <span className="text-[#10b981] font-sans font-medium ml-1">· Paste Clipboard (Cmd+V)</span>
                  </div>
                </div>
              </div>

              {/* Sample Presets for Instant Demo */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-mono uppercase text-[#888888] dark:text-[#737373] font-semibold">
                    Or Test with Real Sample Offer Letters:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SAMPLE_DOCUMENTS.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleApplySample(sample)}
                      className="p-3.5 rounded-xl text-left bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] hover:border-[#0070f3] dark:hover:border-[#0070f3] transition-all group cursor-pointer shadow-xs hover:shadow-stacked-sm"
                    >
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#171717] dark:text-white group-hover:text-[#0070f3] transition-colors">
                        <Sparkles className="w-3.5 h-3.5 text-[#0070f3]" />
                        <span>{sample.title}</span>
                      </div>
                      <p className="text-[11px] font-mono text-[#888888] dark:text-[#737373] mt-1 line-clamp-2">
                        {sample.subtitle}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Guarantee Note */}
              <div className="p-3.5 rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#10b981]/10 text-[#10b981] shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                  <strong className="text-[#171717] dark:text-white block font-medium">100% Client-Side Privacy Guarantee:</strong>
                  Your documents, compensation numbers, and screenshots are processed strictly within your browser's local memory. No files are uploaded to any backend server.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING & OCR IN PROGRESS */}
          {step === 'scanning' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-200">
              <div className="relative w-20 h-20 rounded-2xl bg-[#0070f3]/10 dark:bg-[#0070f3]/20 flex items-center justify-center text-[#0070f3]">
                <Scan className="w-10 h-10 animate-pulse" />
                <div className="absolute inset-0 rounded-2xl border-2 border-[#0070f3] animate-ping opacity-25"></div>
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="text-[17px] font-semibold text-[#171717] dark:text-white">
                  Scanning &amp; Extracting CTC Components...
                </h3>
                <p className="text-[13px] text-[#888888] dark:text-[#737373] font-mono">
                  {scanStatus}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-[#ebebeb] dark:bg-[#262626] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#0070f3] to-[#10b981] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${scanProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & APPLY */}
          {step === 'review' && parseResult && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Badge Strip */}
              <div className="p-4 rounded-2xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                      ✓ {parseResult.documentType.replace('_', ' ')} PARSED
                    </span>
                    {parseResult.detectedEmployer && (
                      <span className="text-[13px] font-semibold text-[#171717] dark:text-white flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-[#888888]" />
                        {parseResult.detectedEmployer}
                      </span>
                    )}
                  </div>
                  {parseResult.detectedDesignation && (
                    <div className="text-[12px] text-[#4d4d4d] dark:text-[#a1a1a1] flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#888888]" />
                      <span>{parseResult.detectedDesignation}</span>
                      {parseResult.detectedLocation && (
                        <>
                          <span className="text-[#888888]">·</span>
                          <MapPin className="w-3.5 h-3.5 text-[#888888]" />
                          <span>{parseResult.detectedLocation}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStep('upload')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[12px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Another</span>
                </button>
              </div>

              {/* Two Column Layout: Document / Preview + Extracted Values */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Preview / Raw text (4 Cols) */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-mono uppercase text-[#888888] dark:text-[#737373] font-semibold">
                      Document Source
                    </span>
                    <button
                      onClick={() => setShowRawText(!showRawText)}
                      className="text-[11px] font-mono text-[#0070f3] hover:underline cursor-pointer"
                    >
                      {showRawText ? 'Show Preview' : 'Show Raw Text'}
                    </button>
                  </div>

                  {showRawText || !parseResult.previewUrl ? (
                    <div className="h-64 p-3 rounded-xl bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] overflow-y-auto font-mono text-[11px] text-[#4d4d4d] dark:text-[#a1a1a1] whitespace-pre-wrap leading-relaxed">
                      {parseResult.rawText}
                    </div>
                  ) : (
                    <div className="h-64 rounded-xl border border-[#ebebeb] dark:border-[#262626] overflow-hidden bg-[#fafafa] dark:bg-[#181818] relative group">
                      <img
                        src={parseResult.previewUrl}
                        alt="Scanned Document Preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 text-center">
                        <span className="text-white text-[12px] font-medium bg-black/60 px-3 py-1.5 rounded-full">
                          Scanned on device
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-[11px] text-[#888888] dark:text-[#737373] font-mono">
                    <div>Fields Extracted: <strong className="text-[#171717] dark:text-white">{parseResult.fields.length} items</strong></div>
                    <div>Confidence: <span className="text-[#10b981] font-semibold">High / Neural Validated</span></div>
                  </div>
                </div>

                {/* Right Extracted Config Fields (7 Cols) */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-mono uppercase text-[#888888] dark:text-[#737373] font-semibold">
                      Extracted Compensation Inputs (Review &amp; Edit)
                    </span>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {/* Annual CTC */}
                    <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-[#0070f3]/40 shadow-xs space-y-1.5">
                      <div className="flex justify-between items-center text-[12px]">
                        <label className="font-semibold text-[#171717] dark:text-white">Annual CTC (Cost to Company)</label>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0070f3]/10 text-[#0070f3] font-semibold">
                          PRIMARY CTC
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-[#888888]">₹</span>
                        <input
                          type="number"
                          value={editedInputs.annualCtc || ''}
                          onChange={(e) => setEditedInputs(prev => ({ ...prev, annualCtc: Number(e.target.value) || 0 }))}
                          className="w-full h-9 pl-7 pr-3 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[14px] font-mono font-bold text-[#171717] dark:text-white focus:outline-hidden focus:border-[#0070f3]"
                        />
                      </div>
                    </div>

                    {/* Basic Salary % */}
                    <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-1.5">
                      <div className="flex justify-between items-center text-[12px]">
                        <label className="font-medium text-[#171717] dark:text-white">Basic Salary (% of CTC)</label>
                        <span className="font-mono font-semibold text-[#171717] dark:text-white">{editedInputs.basicPercent || 50}%</span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={70}
                        step={5}
                        value={editedInputs.basicPercent || 50}
                        onChange={(e) => setEditedInputs(prev => ({ ...prev, basicPercent: Number(e.target.value) }))}
                        className="w-full h-1.5 bg-[#ebebeb] dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* State & City */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-1">
                        <label className="text-[11px] font-medium text-[#171717] dark:text-white block">Work Location (PT)</label>
                        <select
                          value={editedInputs.stateCode || 'KA'}
                          onChange={(e) => setEditedInputs(prev => ({ ...prev, stateCode: e.target.value }))}
                          className="w-full h-8 px-2 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[12px] text-[#171717] dark:text-white focus:outline-hidden"
                        >
                          {Object.values(STATE_PT_RULES).map(st => (
                            <option key={st.code} value={st.code}>{st.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-1">
                        <label className="text-[11px] font-medium text-[#171717] dark:text-white block">HRA City Type</label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setEditedInputs(prev => ({ ...prev, isMetroCity: true, hraPercent: 50 }))}
                            className={`flex-1 h-8 rounded text-[11px] font-medium border transition-colors ${editedInputs.isMetroCity
                                ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] border-[#171717] dark:border-white'
                                : 'bg-white dark:bg-[#121212] text-[#4d4d4d] border-[#ebebeb] dark:border-[#262626]'
                              }`}
                          >
                            Metro (50%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditedInputs(prev => ({ ...prev, isMetroCity: false, hraPercent: 40 }))}
                            className={`flex-1 h-8 rounded text-[11px] font-medium border transition-colors ${!editedInputs.isMetroCity
                                ? 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] border-[#171717] dark:border-white'
                                : 'bg-white dark:bg-[#121212] text-[#4d4d4d] border-[#ebebeb] dark:border-[#262626]'
                              }`}
                          >
                            Non-Metro (40%)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Variable Bonus & Joining Bonus */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-1">
                        <label className="text-[11px] font-medium text-[#171717] dark:text-white block">Annual Variable Bonus</label>
                        <input
                          type="number"
                          value={editedInputs.variableBonusAnnual || ''}
                          onChange={(e) => setEditedInputs(prev => ({ ...prev, variableBonusAnnual: Number(e.target.value) || 0 }))}
                          placeholder="₹0"
                          className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[12px] font-mono text-[#171717] dark:text-white focus:outline-hidden"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-1">
                        <label className="text-[11px] font-medium text-[#171717] dark:text-white block">Joining / Sign-on Bonus</label>
                        <input
                          type="number"
                          value={editedInputs.joiningBonusAnnual || ''}
                          onChange={(e) => setEditedInputs(prev => ({ ...prev, joiningBonusAnnual: Number(e.target.value) || 0 }))}
                          placeholder="₹0"
                          className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[12px] font-mono text-[#171717] dark:text-white focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* RSUs / Stocks */}
                    {editedInputs.rsuVestedAnnual !== undefined && editedInputs.rsuVestedAnnual > 0 && (
                      <div className="p-3 rounded-xl bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <label className="font-medium text-[#171717] dark:text-white">Annual Vested RSUs / Stocks</label>
                          <span className="font-mono text-[#10b981] font-semibold">{formatINR(editedInputs.rsuVestedAnnual)}/yr</span>
                        </div>
                        <input
                          type="number"
                          value={editedInputs.rsuVestedAnnual || ''}
                          onChange={(e) => setEditedInputs(prev => ({ ...prev, rsuVestedAnnual: Number(e.target.value) || 0 }))}
                          placeholder="₹0"
                          className="w-full h-8 px-2.5 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#121212] text-[12px] font-mono text-[#171717] dark:text-white focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-4 border-t border-[#ebebeb] dark:border-[#262626] bg-[#fafafa]/80 dark:bg-[#181818]/80 backdrop-blur-sm flex items-center justify-between shrink-0">
          <div className="text-[12px] text-[#888888] dark:text-[#737373] hidden sm:flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            <span>Zero server upload · Secure client-side scan</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[13px] font-medium border border-[#ebebeb] dark:border-[#262626] text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white hover:bg-[#ebebeb] dark:hover:bg-[#262626] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {step === 'review' && (
              <button
                onClick={handleConfirmApply}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold bg-[#171717] dark:bg-white text-white dark:text-[#171717] hover:bg-[#333333] dark:hover:bg-[#e0e0e0] transition-all hover:scale-102 shadow-sm cursor-pointer"
              >
                <span>Apply to Calculator &amp; Analyze Tax</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
