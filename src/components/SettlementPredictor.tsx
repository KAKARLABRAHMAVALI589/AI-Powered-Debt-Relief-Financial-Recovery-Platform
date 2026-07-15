import React, { useState, useEffect } from 'react';
import { Sparkles, IndianRupee, ArrowRight, TrendingDown, ClipboardList, Shield, RefreshCw } from 'lucide-react';
import { Loan, SettlementRecommendation } from '../types';

interface SettlementPredictorProps {
  loans: Loan[];
  selectedLoanId: string;
  onSelectLoanId: (id: string) => void;
}

export default function SettlementPredictor({
  loans,
  selectedLoanId,
  onSelectLoanId
}: SettlementPredictorProps) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<SettlementRecommendation | null>(null);
  const [error, setError] = useState('');

  const activeLoans = loans.filter(l => l.status !== 'Settled');

  // Trigger analysis
  const triggerAnalysis = async (loanId: string) => {
    if (!loanId) return;
    setLoading(true);
    setError('');
    setRecommendation(null);
    try {
      const res = await fetch(`/api/loans/${loanId}/recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || ''
        }
      });
      if (!res.ok) {
        throw new Error('Could not generate recommendation. Please ensure GEMINI_API_KEY is configured.');
      }
      const data = await res.json();
      setRecommendation(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during AI analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLoanId) {
      triggerAnalysis(selectedLoanId);
    }
  }, [selectedLoanId]);

  const selectedLoan = loans.find(l => l.id === selectedLoanId);

  const getFeasibilityBadge = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Good': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Moderate': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/30 rounded-full blur-2xl pointer-events-none" />
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-display tracking-tight relative z-10">
          <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
          AI-Powered Settlement Recommendation Engine
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-4xl relative z-10">
          Select any active loan. Our advanced Gemini algorithm will analyze your overdue period, interest rate, outstanding amount, and overall cash flow to formulate a legally compliant settlement strategy.
        </p>

        {/* Loan selector */}
        <div className="mt-6 max-w-md relative z-10">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 font-display">
            Choose Loan Account to Analyze
          </label>
          <select
            value={selectedLoanId}
            onChange={(e) => {
              onSelectLoanId(e.target.value);
            }}
            className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="">-- Choose an active loan --</option>
            {activeLoans.map((loan) => (
              <option key={loan.id} value={loan.id}>
                {loan.lenderName} ({loan.loanType}) — ₹{loan.outstandingAmount.toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <Sparkles className="h-5 w-5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 font-display">Reviewing financial metrics with Gemini...</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              We are analyzing lender settlement patterns, calculating risk exposure, and formulating optimized recovery advice.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm text-red-700 flex flex-col items-center text-center">
          <p className="text-sm font-semibold">AI Analysis Unsuccessful</p>
          <p className="text-xs mt-1 max-w-md">{error}</p>
          <button
            onClick={() => triggerAnalysis(selectedLoanId)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-red-200 hover:border-red-300 text-red-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Analysis</span>
          </button>
        </div>
      )}

      {/* Results panel */}
      {recommendation && selectedLoan && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Outstanding balance card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300/80 transition-all duration-300">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">Unpaid Balances</span>
              <div className="mt-4">
                <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">₹{selectedLoan.outstandingAmount.toLocaleString('en-IN')}</span>
                <p className="text-xs text-slate-400 mt-1">Full liability outstanding</p>
              </div>
            </div>

            {/* AI Proposed Settlement */}
            <div className="bg-blue-950 text-blue-50 p-5 rounded-2xl shadow-xl shadow-blue-900/10 flex flex-col justify-between relative overflow-hidden transition-all duration-300">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                <Sparkles className="h-36 w-36" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 font-display">AI Recommended Settlement</span>
                <span className="text-xs font-extrabold bg-blue-900 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-800 font-mono">
                  {recommendation.settlementPercentage}%
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-white">₹{recommendation.recommendedAmount.toLocaleString('en-IN')}</span>
                <p className="text-xs text-blue-300 mt-1">Proposed one-time lump-sum</p>
              </div>
            </div>

            {/* Savings card */}
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest font-display">Estimated Savings</span>
                <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">₹{recommendation.savingsAmount.toLocaleString('en-IN')}</span>
                <p className="text-xs text-emerald-600/80 mt-1">Cash written off entirely</p>
              </div>
            </div>
          </div>

          {/* Detailed strategic insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feasibility and stress analysis */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Feasibility & Risk Matrix</span>
                
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 font-display">Proposal Feasibility</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border font-display ${getFeasibilityBadge(recommendation.feasibilityRating)}`}>
                      {recommendation.feasibilityRating}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 font-display">Debt Stress Rating</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {recommendation.debtStressLevel}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
                    Feasibility evaluates whether your current monthly surplus or savings rate can generate this lump-sum amount within 30-90 days.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-700 flex items-start gap-2">
                <Shield className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <span>Lenders usually settle for larger write-offs once an account has exceeded 3 to 6 months of consecutive default.</span>
              </div>
            </div>

            {/* Analysis summary statement */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                AI Strategic Assessment Summary
              </span>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
                {recommendation.analysisSummary}
              </p>

              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest block mb-3 font-display">Sequential Recovery Roadmap</span>
                <ul className="space-y-2.5">
                  {recommendation.actionSteps.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                      <span className="h-5 w-5 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold shrink-0 text-[10px] font-mono">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedLoanId && !loading && (
        <div className="bg-slate-50 border border-dashed border-slate-300 p-12 text-center rounded-2xl text-slate-500">
          <p className="text-sm font-semibold font-display text-slate-700">Select a loan account above to load recovery forecasts</p>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            Our AI analysis compares your living expense margins with outstanding debt defaults to model lender-specific settlement parameters.
          </p>
        </div>
      )}
    </div>
  );
}
