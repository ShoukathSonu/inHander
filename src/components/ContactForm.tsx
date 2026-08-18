import React, { useState } from 'react';
import { Mail, Send, Check, Copy, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'Tax Calculation Inquiry',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    // Generate mailto link
    const subject = encodeURIComponent(`[inHander Contact] ${formData.topic} - ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nTopic: ${formData.topic}\n\nMessage:\n${formData.message}\n\nSent from inHander.com Contact Form`
    );
    
    // Trigger confetti
    try {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
    } catch {
      // ignore
    }

    setSubmitted(true);
    // Open default email client
    window.location.href = `mailto:support@inhander.com?subject=${subject}&body=${body}`;
  };

  const handleCopyMessage = () => {
    const text = `From: ${formData.name} <${formData.email}>\nTopic: ${formData.topic}\n\n${formData.message}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 sm:p-8 border border-[#ebebeb] dark:border-[#262626] shadow-stacked">
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-[#ebebeb] dark:border-[#262626]">
            <MessageSquare className="w-4 h-4 text-[#0070f3]" />
            <h3 className="text-[16px] font-semibold text-[#171717] dark:text-white">Send Us a Direct Message</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Your Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 px-3.5 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Email Address</label>
              <input
                type="email"
                required
                placeholder="rahul@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full h-10 px-3.5 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Inquiry Topic</label>
            <select
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full h-10 px-3.5 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white transition-colors"
            >
              <option value="Tax Calculation Inquiry">Tax Calculation or Slab Question</option>
              <option value="Bug Report or Discrepancy">Bug Report or Formula Discrepancy</option>
              <option value="Feature Request">Feature Request or New Tool Suggestion</option>
              <option value="Document Import Feedback">Offer Letter / PDF OCR Scan Feedback</option>
              <option value="General Question">General Question or Media Partnership</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-mono text-[#888888] dark:text-[#737373] uppercase block">Message</label>
            <textarea
              required
              rows={4}
              placeholder="Describe your inquiry, calculation question, or suggestion in detail..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="w-full p-3.5 rounded-xl border border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#181818] text-[13px] text-[#171717] dark:text-white focus:outline-hidden focus:border-[#171717] dark:focus:border-white transition-colors resize-y"
            ></textarea>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-[11px] text-[#888888] dark:text-[#737373]">
              🔒 100% Private. Your details are never added to marketing lists.
            </p>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-11 rounded-full bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-semibold text-[13px] hover:bg-[#333333] dark:hover:bg-[#f0f0f0] transition-all hover:scale-102 shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8 space-y-4 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-[#10b981]/10 text-[#10b981] mx-auto flex items-center justify-center border border-[#10b981]/20">
            <Check className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-[#171717] dark:text-white">Message Prepared!</h3>
            <p className="text-[13px] text-[#4d4d4d] dark:text-[#a1a1a1] max-w-md mx-auto">
              Your default email app should have opened with the message ready to send. If not, you can copy the text below and email us at <strong className="text-[#0070f3]">support@inhander.com</strong>.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#fafafa] dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] text-[13px] font-medium text-[#171717] dark:text-white hover:bg-[#f0f0f0] dark:hover:bg-[#222222] transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Message Text'}</span>
            </button>
            <button
              onClick={() => setSubmitted(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-[#121212] border border-[#ebebeb] dark:border-[#262626] text-[13px] font-medium text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-white transition-colors"
            >
              Send Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
