import React, { useState } from 'react';
import { IndianRupee, AlertTriangle, TrendingUp, TrendingDown, Info, Edit2, Check, X, Sliders, CheckSquare, Square, Sparkles, ShieldCheck } from 'lucide-react';
import { FinancialHealthMetrics, User, Loan } from '../types';

interface FinancialHealthMetricsViewProps {
  metrics: FinancialHealthMetrics;
  user: User;
  loans: Loan[];
  onUpdateFinancials: (income: number, expenses: number) => Promise<void>;
}

export default function FinancialHealthMetricsView({
  metrics,
  user,
  loans = [],
  onUpdateFinancials
}: FinancialHealthMetricsViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [incomeInput, setIncomeInput] = useState(String(user.monthlyIncome));
  const [expensesInput, setExpensesInput] = useState(String(user.monthlyExpenses));
  const [isSaving, setIsSaving] = useState(false);

  // State for What-If Scenario Simulator
  const [simulatedExpensesPercent, setSimulatedExpensesPercent] = useState(100);
  const [simulatedSettleIds, setSimulatedSettleIds] = useState<string[]>([]);
  const [showSimulator, setShowSimulator] = useState(false);

  // Filter out already settled loans for simulation
  const activeSimLoans = (loans || []).filter(l => l.status !== 'Settled');

  const toggleSimulateSettle = (id: string) => {
    if (simulatedSettleIds.includes(id)) {
      setSimulatedSettleIds(simulatedSettleIds.filter(x => x !== id));
    } else {
      setSimulatedSettleIds([...simulatedSettleIds, id]);
    }
  };

  // Calculations for simulated state
  const simExpenses = user.monthlyExpenses * (simulatedExpensesPercent / 100);
  
  // Simulated EMI: sum of EMI of active loans that are NOT simulated settled
  const simEMI = activeSimLoans
    .filter(l => !simulatedSettleIds.includes(l.id))
    .reduce((sum, l) => sum + l.monthlyEMI, 0);

  // Simulated Debt: sum of active loans NOT simulated settled
  const simDebt = activeSimLoans
    .filter(l => !simulatedSettleIds.includes(l.id))
    .reduce((sum, l) => sum + l.outstandingAmount, 0);

  const simSurplus = user.monthlyIncome - simExpenses - simEMI;
  const simEmiRatio = user.monthlyIncome > 0 ? Math.round((simEMI / user.monthlyIncome) * 100) : 0;

  // Let's compute simulated Stress Score
  const getSimulatedStress = () => {
    let score = 10;
    
    // 1. DTI or EMI-to-Income ratio contribution (up to 40 points)
    score += Math.min(simEmiRatio * 1.5, 40);

    // 2. Monthly Surplus contribution (up to 30 points)
    if (simSurplus < 0) {
      score += 30;
    } else if (simSurplus < 1000) {
      score += Math.max(0, (1000 - simSurplus) * 0.03);
    }

    // 3. Outstanding Debt level contribution (up to 20 points)
    score += Math.min((simDebt / 10000) * 5, 20);

    // 4. Remaining overdue loans (up to 10 points)
    const simOverdueCount = activeSimLoans
      .filter(l => !simulatedSettleIds.includes(l.id) && (l.status === 'Overdue' || l.status === 'In Default'))
      .length;
    score += Math.min(simOverdueCount * 5, 10);

    const roundedScore = Math.min(Math.round(score), 100);
    
    let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (roundedScore >= 75) level = 'Critical';
    else if (roundedScore >= 50) level = 'High';
    else if (roundedScore >= 25) level = 'Medium';
    
    return { score: roundedScore, level };
  };

  const simStress = getSimulatedStress();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateFinancials(Number(incomeInput) || 0, Number(expensesInput) || 0);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const getStressColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    }
  };

  const getStressMeterColor = (score: number) => {
    if (score >= 75) return '#ef4444'; // red-500
    if (score >= 50) return '#f97316'; // orange-500
    if (score >= 25) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  // SVG parameters for stress dial
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (metrics.debtStressScore / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Financial Health Summary Title & Quick edit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/40 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-900 font-display tracking-tight">Financial Profile & Debt Stress Status</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track and tune your primary income, living expenses, and overall debt load ratios.</p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => {
              setIncomeInput(String(user.monthlyIncome));
              setExpensesInput(String(user.monthlyExpenses));
              setIsEditing(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-all cursor-pointer relative z-10"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Tune Financials</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center">
                <span className="text-xs font-semibold text-slate-500 px-1 font-display">Income: ₹</span>
                <input
                  type="number"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  className="w-18 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-medium focus:outline-none"
                />
              </div>
              <div className="h-4 w-[1px] bg-slate-300" />
              <div className="flex items-center">
                <span className="text-xs font-semibold text-slate-500 px-1 font-display">Living Exp: ₹</span>
                <input
                  type="number"
                  value={expensesInput}
                  onChange={(e) => setExpensesInput(e.target.value)}
                  className="w-18 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-medium focus:outline-none"
                />
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shadow-xs"
              title="Save financials"
            >
              {isSaving ? (
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all cursor-pointer"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Monthly Income Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Monthly Income</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">₹{user.monthlyIncome.toLocaleString('en-IN')}</span>
            <p className="text-[11px] text-slate-400 mt-1">Your core take-home surplus</p>
          </div>
        </div>

        {/* Living Expenses Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Living Expenses</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">₹{user.monthlyExpenses.toLocaleString('en-IN')}</span>
            <p className="text-[11px] text-slate-400 mt-1">Rent, utilities, grocery (non-EMI)</p>
          </div>
        </div>

        {/* Monthly EMIs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Total Active EMIs</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">₹{metrics.totalEMI.toLocaleString('en-IN')}</span>
            <p className="text-[11px] text-slate-400 mt-1">Sum of monthly repayments</p>
          </div>
        </div>

        {/* Monthly Surplus Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Monthly Surplus</span>
            <div className={`p-1.5 rounded-lg ${metrics.monthlySurplus >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-bold font-mono tracking-tight ${metrics.monthlySurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.monthlySurplus < 0 ? '-' : ''}₹{Math.abs(metrics.monthlySurplus).toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              {metrics.monthlySurplus >= 0 ? 'Income left after expenditures' : 'Budget deficit - high distress'}
            </p>
          </div>
        </div>
      </div>

      {/* Stress Meter & General Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stress Dial Gauge Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 font-display">Overall Debt Stress Gauge</span>
          
          <div className="relative flex items-center justify-center mb-2">
            {/* SVG Arc Progress */}
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              <circle
                stroke="#f1f5f9"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke={getStressMeterColor(metrics.debtStressScore)}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-extrabold text-slate-800 font-mono">{metrics.debtStressScore}</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 font-display">Score</span>
            </div>
          </div>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border font-display ${getStressColor(metrics.debtStressLevel)}`}>
            <AlertTriangle className="h-3 w-3" />
            <span>{metrics.debtStressLevel} Risk Level</span>
          </div>
          
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Your stress score factors EMI-to-income ratio, overdue duration, and monthly surplus levels.
          </p>
        </div>

        {/* Detailed Insights / Recommendations Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3 font-display">
              <Info className="h-4 w-4 text-blue-500" />
              Dynamic Financial Health Insights
            </span>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              {metrics.statusDescription}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="block text-xs font-semibold text-slate-500 font-display">EMI-to-Income Ratio</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-lg font-bold font-mono ${metrics.emiToIncomeRatio > 40 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {metrics.emiToIncomeRatio}%
                  </span>
                  <span className="text-xs text-slate-400">of monthly surplus</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${metrics.emiToIncomeRatio > 50 ? 'bg-red-500' : metrics.emiToIncomeRatio > 35 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(metrics.emiToIncomeRatio, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="block text-xs font-semibold text-slate-500 font-display">Outstanding Balance Total</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-slate-800 font-mono">
                    ₹{metrics.totalDebt.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-400">across all active loans</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {metrics.totalDebt > 0 ? "Eligible for up to 50% AI negotiation discount." : "No active unpaid debts found."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium bg-blue-50/50 p-3 rounded-xl">
            <span>💡 Quick Rule: Keep EMI ratios below 35% for long-term health.</span>
          </div>
        </div>
      </div>

      {/* What-If Simulation Panel */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transition-all duration-300">
        {/* Decorative background vectors */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 text-white rounded-2xl border border-white/10 backdrop-blur-md">
              <Sliders className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight flex items-center gap-2">
                Dynamic What-If Debt Recovery Simulator
                <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-bounce">Interactive</span>
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">Toggle active loan settlements and tune monthly expenses to instantly preview recovery outcomes!</p>
            </div>
          </div>
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/20 hover:scale-[1.02] cursor-pointer"
          >
            {showSimulator ? 'Close Simulator' : 'Launch Interactive Simulator'}
          </button>
        </div>

        {showSimulator && (
          <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-top-4 duration-200 relative z-10">
            {/* Interactive controls */}
            <div className="lg:col-span-5 space-y-6">
              {/* Slider 1: Expenses Percent */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-200 font-display">1. Budget Tightening Slider</span>
                  <span className="text-xs font-mono font-bold text-white bg-blue-800 px-2 py-0.5 rounded-md">
                    {simulatedExpensesPercent}% Expenses (₹{Math.round(simExpenses).toLocaleString('en-IN')}/mo)
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="120"
                  step="5"
                  value={simulatedExpensesPercent}
                  onChange={(e) => setSimulatedExpensesPercent(Number(e.target.value))}
                  className="w-full h-2 bg-blue-950 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-[10px] text-blue-200/70 font-mono mt-1">
                  <span>50% (Lean Budget)</span>
                  <span>100% (Current)</span>
                  <span>120% (Inflated)</span>
                </div>
              </div>

              {/* Checkbox Card list of active debts */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-200 block mb-3 font-display">2. Simulate Settlements (50% Write-off)</span>
                {activeSimLoans.length === 0 ? (
                  <p className="text-xs text-blue-200/70 italic text-center py-4">No active loans available to simulate settling.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeSimLoans.map((loan) => {
                      const isChecked = simulatedSettleIds.includes(loan.id);
                      return (
                        <button
                          key={loan.id}
                          onClick={() => toggleSimulateSettle(loan.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                            isChecked
                              ? 'bg-white/15 border-white/40 text-white shadow-xs'
                              : 'bg-white/5 border-white/5 text-blue-100 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-blue-300 shrink-0" />
                            )}
                            <div>
                              <div className="text-xs font-bold font-display">{loan.lenderName}</div>
                              <div className="text-[10px] text-blue-200/80 font-mono">EMI: ₹{loan.monthlyEMI.toLocaleString('en-IN')}/mo</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono font-bold">₹{loan.outstandingAmount.toLocaleString('en-IN')}</div>
                            <div className="text-[9px] text-emerald-300 font-bold uppercase">Saves 50%</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Simulated Live Output Metrics Dashboard */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 text-slate-900 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Output 1: Stress Score Dial */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display mb-2">Simulated Stress Gauge</span>
                <div className="relative flex items-center justify-center mb-2">
                  <svg height="80" width="80" className="transform -rotate-90">
                    <circle
                      stroke="#f1f5f9"
                      fill="transparent"
                      strokeWidth="6"
                      r="32"
                      cx="40"
                      cy="40"
                    />
                    <circle
                      stroke={getStressMeterColor(simStress.score)}
                      fill="transparent"
                      strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 - (simStress.score / 100) * (2 * Math.PI * 32)}`}
                      strokeLinecap="round"
                      r="32"
                      cx="40"
                      cy="40"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-extrabold text-slate-800 font-mono leading-none">{simStress.score}</span>
                    <span className="text-[8px] uppercase font-bold text-slate-400 font-display">Score</span>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-display ${getStressColor(simStress.level)}`}>
                  <span>{simStress.level} Risk</span>
                </div>
              </div>

              {/* Output 2: Budget Health Comparison */}
              <div className="space-y-3.5 flex flex-col justify-center">
                {/* Simulated EMI Ratio */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500 font-display">Simulated EMI Ratio</span>
                    <span className={`font-mono font-bold ${simEmiRatio > 40 ? 'text-amber-600' : 'text-slate-800'}`}>
                      {simEmiRatio}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${simEmiRatio > 50 ? 'bg-red-500' : simEmiRatio > 35 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(simEmiRatio, 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Actual: {metrics.emiToIncomeRatio}%</span>
                </div>

                {/* Simulated Monthly Surplus */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500 font-display">Simulated Surplus</span>
                    <span className={`font-mono font-bold ${simSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ₹{Math.round(simSurplus).toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${simSurplus >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.max((simSurplus + 10000) / 100000 * 100, 5), 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Actual: ₹{Math.round(metrics.monthlySurplus).toLocaleString('en-IN')}/mo</span>
                </div>
              </div>

              {/* Comparative summaries block */}
              <div className="md:col-span-2 p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  <strong>Simulated Scenario Impact:</strong> {
                    simStress.score < metrics.debtStressScore ? (
                      <span>
                        Saves <strong className="text-emerald-600 font-mono">₹{(metrics.totalDebt - simDebt).toLocaleString('en-IN')}</strong> in total liabilities, decreases monthly EMI pressure by <strong className="text-emerald-600 font-mono">₹{(metrics.totalEMI - simEMI).toLocaleString('en-IN')}/mo</strong>, and elevates your overall stress to <strong className="text-emerald-600 uppercase font-display">{simStress.level}</strong>!
                      </span>
                    ) : (
                      <span>Adjust the sliders and select debt accounts to model your personalized path out of distress.</span>
                    )
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
