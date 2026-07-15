import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, Copy, Download, RefreshCw, CheckCircle2, ChevronRight, HelpCircle, MessageSquare } from 'lucide-react';
import { Loan, NegotiationRecord } from '../types';
import { jsPDF } from 'jspdf';

interface LetterGeneratorProps {
  loans: Loan[];
  selectedLoanId: string;
  onSelectLoanId: (id: string) => void;
  onGenerationSuccess: () => void;
}

export default function LetterGenerator({
  loans,
  selectedLoanId,
  onSelectLoanId,
  onGenerationSuccess
}: LetterGeneratorProps) {
  const [letterType, setLetterType] = useState<'Hardship Explanation' | 'Settlement Proposal' | 'Counter-Offer' | 'Payment Plan Request'>('Hardship Explanation');
  const [customContext, setCustomContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [letterResult, setLetterResult] = useState<NegotiationRecord | null>(null);
  const [error, setError] = useState('');
  
  // Local editable text for generated content
  const [editableSubject, setEditableSubject] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [copied, setCopied] = useState(false);

  const activeLoans = loans.filter(l => l.status !== 'Settled');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) return;

    setLoading(true);
    setError('');
    setLetterResult(null);
    setCopied(false);

    try {
      const res = await fetch('/api/negotiations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || ''
        },
        body: JSON.stringify({
          loanId: selectedLoanId,
          letterType,
          customContext: customContext.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate letter. Please ensure GEMINI_API_KEY is configured on server.');
      }

      const data: NegotiationRecord = await res.json();
      setLetterResult(data);
      setEditableSubject(data.subject);
      setEditableContent(data.content);
      onGenerationSuccess(); // let App refresh the history!
    } catch (err: any) {
      setError(err.message || 'An error occurred during letter draft generation.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const fullText = `Subject: ${editableSubject}\n\n${editableContent}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = () => {
    const fullText = `Subject: ${editableSubject}\n\n${editableContent}`;
    const element = document.createElement("a");
    const file = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${letterType.replace(/\s+/g, '_')}_Draft.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    // Document Header Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('DEBTRELIEF AI - STRATEGIC DRAFT', margin, 25);

    // Subtle line divider
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, 28, pageWidth - margin, 28);

    // Document Meta Information
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate-400
    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated on ${todayStr} | Confidential Settlement Correspondence`, margin, 34);

    // Document Subject line
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    
    const wrappedSubject = doc.splitTextToSize(`Subject: ${editableSubject}`, contentWidth);
    let currentY = 44;
    doc.text(wrappedSubject, margin, currentY);
    
    currentY += (wrappedSubject.length * 6) + 4;

    // Document Body text content
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // Slate-700
    
    const wrappedContent = doc.splitTextToSize(editableContent, contentWidth);
    const lineHeight = 6;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxY = pageHeight - margin;

    for (let i = 0; i < wrappedContent.length; i++) {
      if (currentY + lineHeight > maxY) {
        doc.addPage();
        currentY = margin;
      }
      doc.text(wrappedContent[i], margin, currentY);
      currentY += lineHeight;
    }

    doc.save(`${letterType.replace(/\s+/g, '_')}_Draft.pdf`);
  };

  const getLetterTypeDescription = (type: string) => {
    switch (type) {
      case 'Hardship Explanation':
        return 'Notifies the loss mitigation team that you cannot pay due to life events and requests temporary payment pause or restructuring.';
      case 'Settlement Proposal':
        return 'Offers a lump-sum payment (usually 35% - 50% of total balance) to wipe out the entire remaining debt once and for all.';
      case 'Counter-Offer':
        return 'Proposes custom settlement terms back in response to an initial offer letters received from collections or debt pools.';
      default:
        return 'Requests restructuring the unpaid balance into a formal payment plan with reduced interest or lowered monthly payments.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/20 rounded-full blur-2xl pointer-events-none" />
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-display tracking-tight relative z-10">
          <FileText className="h-5 w-5 text-blue-500" />
          Intelligent AI Negotiation Letter & Email Generator
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-4xl relative z-10">
          Draft professional letters using Google Gemini AI customized for your selected lenders, balance details, interest rates, and individual hardship circumstances.
        </p>

        <form onSubmit={handleGenerate} className="mt-6 space-y-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loan Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 font-display">
                1. Select Account / Lender
              </label>
              <select
                required
                value={selectedLoanId}
                onChange={(e) => onSelectLoanId(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Select an active debt --</option>
                {activeLoans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.lenderName} — ₹{loan.outstandingAmount.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {/* Letter Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 font-display">
                2. Negotiation Goal / Letter Type
              </label>
              <select
                value={letterType}
                onChange={(e) => setLetterType(e.target.value as any)}
                className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                <option value="Hardship Explanation">Hardship Explanation / Relief Request</option>
                <option value="Settlement Proposal">Lump-Sum Settlement Offer</option>
                <option value="Counter-Offer">Counter-Offer to Collection Letter</option>
                <option value="Payment Plan Request">Payment Restructuring Request</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-blue-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-start gap-2 leading-relaxed font-sans">
            <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
            <span><strong>Impact:</strong> {getLetterTypeDescription(letterType)}</span>
          </p>

          {/* Hardship context textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 font-display">
              3. Describe Your Hardship Circumstances (Optional)
            </label>
            <textarea
              rows={3}
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="e.g. I was laid off from my job in March, or I am recovering from unforeseen medical bills which have eaten up my savings."
              className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Adding personalized facts helps Gemini make the request significantly more persuasive.</span>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedLoanId}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/15 hover:scale-[1.01]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Strategic Draft</span>
          </button>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <div>
            <p className="text-sm font-semibold text-slate-800 font-display">Drafting your document via Gemini AI...</p>
            <p className="text-xs text-slate-400 mt-1">We are analyzing lender guidelines to craft a professional, firm, and fully legal negotiation draft.</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 p-5 rounded-2xl border border-red-200 text-red-700 text-center">
          <p className="text-sm font-semibold">Could Not Generate Letter</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {/* Generated output */}
      {letterResult && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Editable Draft View */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest font-display">
                  Generated Draft (Editable)
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-display">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="font-display">Copy</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={downloadTextFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all cursor-pointer font-display"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .txt</span>
                </button>

                <button
                  onClick={downloadPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 hover:border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all cursor-pointer font-display"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Editable Subject */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-display">Subject / Header</label>
              <input
                type="text"
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            {/* Editable Letter Body */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-display">Letter Content</label>
              <textarea
                rows={16}
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed bg-slate-50/20"
              />
            </div>

            <div className="text-[10px] text-slate-500 leading-relaxed bg-amber-50/60 border border-amber-200 p-3 rounded-lg flex items-start gap-1.5">
              <span>⚠️</span>
              <span><strong>Review required:</strong> Please double-check all placeholder brackets (like <code>[Your Account Number]</code> or <code>[Date]</code>) and fill in your actual details before sending this document to your lender.</span>
            </div>
          </div>

          {/* Strategic negotiation guidelines from Gemini */}
          <div className="space-y-6">
            {/* Strategy advice card */}
            <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-display">
                  <MessageSquare className="h-4 w-4" />
                  Negotiation Advice & Tactics
                </span>
                
                <h4 className="text-sm font-bold text-white mb-2 font-display">How to Submit this Letter:</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {letterResult.strategy}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-display">3 Core Commandments:</h5>
                  <ul className="space-y-2 text-xs">
                    <li className="flex gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span><strong>Get it in writing:</strong> Never settle or pay a dime until the lender sends a signed letter confirming the settlement amount and that your remaining debt is discharged.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span><strong>Use certified mail:</strong> If mailing physically, always pay extra for Certified Mail with Return Receipt. This is legal proof of receipt.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span><strong>Remain calm and firm:</strong> Debt recovery representatives are trained negotiators. Stick to your hardship story, quote your budget surplus, and don't budge.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-3 mt-4 text-center italic">
                Platform Advice: Saved securely to negotiation history tab.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selector Empty State */}
      {!selectedLoanId && !loading && (
        <div className="bg-slate-50 border border-dashed border-slate-300 p-12 text-center rounded-2xl text-slate-500">
          <p className="text-sm font-semibold font-display text-slate-700">Select a loan account above to begin drafting letters</p>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            Our strategic writing engine will dynamically cross-reference lender rules with your hardship reasons to produce legal defense and hardship letters.
          </p>
        </div>
      )}
    </div>
  );
}
