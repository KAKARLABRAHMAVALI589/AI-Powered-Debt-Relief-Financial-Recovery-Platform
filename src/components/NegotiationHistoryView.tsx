import React, { useState } from 'react';
import { History, Trash2, Calendar, FileText, ChevronDown, ChevronUp, Copy, CheckCircle2, Download } from 'lucide-react';
import { NegotiationRecord } from '../types';
import { jsPDF } from 'jspdf';

interface NegotiationHistoryViewProps {
  history: NegotiationRecord[];
  onDeleteHistory: (id: string) => Promise<void>;
}

export default function NegotiationHistoryView({
  history,
  onDeleteHistory
}: NegotiationHistoryViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const copyContent = (record: NegotiationRecord) => {
    const fullText = `Subject: ${record.subject}\n\n${record.content}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadPDF = (record: NegotiationRecord) => {
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
    doc.text('DEBTRELIEF AI - HISTORICAL RECORD', margin, 25);

    // Subtle line divider
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, 28, pageWidth - margin, 28);

    // Document Meta Information
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate-400
    const recordDateStr = new Date(record.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Record Date: ${recordDateStr} | Lender: ${record.lenderName} (${record.letterType})`, margin, 34);

    // Document Subject line
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    
    const wrappedSubject = doc.splitTextToSize(`Subject: ${record.subject}`, contentWidth);
    let currentY = 44;
    doc.text(wrappedSubject, margin, currentY);
    
    currentY += (wrappedSubject.length * 6) + 4;

    // Document Body text content
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // Slate-700
    
    const wrappedContent = doc.splitTextToSize(record.content, contentWidth);
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

    doc.save(`${record.letterType.replace(/\s+/g, '_')}_${record.lenderName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/20 rounded-full blur-2xl pointer-events-none" />
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-display tracking-tight relative z-10">
          <History className="h-5 w-5 text-blue-500" />
          AI Negotiation & Correspondence Archive
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-4xl relative z-10">
          Review, read, or print previous negotiation letters generated on this account. Keep records of letters sent to creditors as a critical defensive audit log.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 p-12 text-center rounded-2xl text-slate-500">
          <p className="text-sm font-semibold font-display text-slate-700">No negotiation documents in archive yet</p>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            Once you generate hardship statements or settlement proposals in the "AI Letter Generator" tab, they will automatically be preserved here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const isExpanded = expandedId === record.id;
            const isCopied = copiedId === record.id;
            const dateStr = new Date(record.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            return (
              <div
                key={record.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md/50 transition-all overflow-hidden"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(record.id)}
                  className="p-5 flex items-center justify-between flex-wrap gap-4 cursor-pointer bg-slate-50/30 hover:bg-slate-50 transition-all select-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        {record.letterType} for {record.lenderName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{dateStr}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleExpand(record.id)}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-all cursor-pointer"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    
                    <button
                      onClick={() => { if(confirm("Remove this document from history?")) onDeleteHistory(record.id); }}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-all cursor-pointer"
                      title="Delete log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-100 bg-white space-y-6 animate-in slide-in-from-top-4 duration-150">
                    {/* Copy & Export options */}
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-display">Historical Record action options:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyContent(record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                        >
                          {isCopied ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-display">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span className="font-display">Copy Full Text</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => downloadPDF(record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs font-display"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Subject line */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 font-display">Subject / Header Line</span>
                      <p className="text-sm font-bold text-slate-800 bg-slate-50/50 p-2.5 border border-slate-100 rounded-lg">
                        {record.subject}
                      </p>
                    </div>

                    {/* Letter draft body */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 font-display">Letter Draft Body</span>
                      <pre className="text-xs text-slate-700 font-mono bg-slate-50/20 p-4 border border-slate-100 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {record.content}
                      </pre>
                    </div>

                    {/* Associated Strategy */}
                    <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1.5 font-display">
                        Lender-Specific Strategy
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {record.strategy}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
