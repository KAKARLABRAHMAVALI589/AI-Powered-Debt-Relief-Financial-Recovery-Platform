import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, History, DollarSign, LogOut, LayoutDashboard, ShieldAlert, Coins, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { User, Loan, FinancialHealthMetrics, NegotiationRecord } from './types';
import AuthView from './components/AuthView';
import FinancialHealthMetricsView from './components/FinancialHealthMetricsView';
import LoansList from './components/LoansList';
import SettlementPredictor from './components/SettlementPredictor';
import LetterGenerator from './components/LetterGenerator';
import NegotiationHistoryView from './components/NegotiationHistoryView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [metrics, setMetrics] = useState<FinancialHealthMetrics | null>(null);
  const [negotiationHistory, setNegotiationHistory] = useState<NegotiationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'predictor' | 'generator' | 'history'>('dashboard');
  
  // Selected targets across tabs
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');

  // Initial loading states
  const [initializing, setInitializing] = useState(true);

  // Theme support
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('portal-theme') as 'light' | 'dark') || 'light';
  });

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('portal-theme', newTheme);
  };

  // Authenticate from local storage on boot
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      fetchUserProfile(storedUserId);
    } else {
      setInitializing(false);
    }
  }, []);

  // Fetch full user state
  const fetchUserProfile = async (userId: string) => {
    try {
      const headers = { 'x-user-id': userId };
      
      const profileRes = await fetch('/api/user/profile', { headers });
      if (!profileRes.ok) {
        localStorage.removeItem('userId');
        setUser(null);
        setInitializing(false);
        return;
      }
      const profileData = await profileRes.json();
      setUser(profileData);
      localStorage.setItem('userId', profileData.id);

      // Load associated records
      await refreshAllData(profileData.id);
    } catch (e) {
      console.error("Failed to load user session", e);
    } finally {
      setInitializing(false);
    }
  };

  const refreshAllData = async (userId: string) => {
    const headers = { 'x-user-id': userId };
    try {
      // 1. Fetch Loans
      const loansRes = await fetch('/api/loans', { headers });
      const loansData = await loansRes.json();
      
      setLoans(loansData);

      // 2. Fetch financial metrics
      const metricsRes = await fetch('/api/user/financial-health', { headers });
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      // 3. Fetch negotiations history
      const negotiationsRes = await fetch('/api/negotiations', { headers });
      const negotiationsData = await negotiationsRes.json();
      setNegotiationHistory(negotiationsData);
    } catch (e) {
      console.error("Failed to refresh records", e);
    }
  };

  // Handlers
  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    localStorage.setItem('userId', authenticatedUser.id);
    refreshAllData(authenticatedUser.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setUser(null);
    setLoans([]);
    setMetrics(null);
    setNegotiationHistory([]);
    setActiveTab('dashboard');
  };

  const handleUpdateFinancials = async (income: number, expenses: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ monthlyIncome: income, monthlyExpenses: expenses })
      });
      const updatedUser = await res.json();
      setUser(updatedUser);
      await refreshAllData(user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLoan = async (loanPayload: Omit<Loan, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(loanPayload)
      });
      await refreshAllData(user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLoan = async (loanId: string, loanPayload: Partial<Loan>) => {
    if (!user) return;
    try {
      await fetch(`/api/loans/${loanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(loanPayload)
      });
      await refreshAllData(user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!user) return;
    try {
      await fetch(`/api/loans/${loanId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      if (selectedLoanId === loanId) {
        setSelectedLoanId('');
      }
      await refreshAllData(user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNegotiation = async (id: string) => {
    if (!user) return;
    try {
      await fetch(`/api/negotiations/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      await refreshAllData(user.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Nav helpers
  const handleSelectForSettlement = (loanId: string) => {
    setSelectedLoanId(loanId);
    setActiveTab('predictor');
  };

  const handleSelectForLetter = (loanId: string) => {
    setSelectedLoanId(loanId);
    setActiveTab('generator');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-800 tracking-tight font-display">Loading DebtRelief AI Secure Portal...</p>
        <p className="text-xs text-slate-400 mt-1">Establishing encrypted secure session</p>
      </div>
    );
  }

  // Not logged in -> Show Auth Screen
  if (!user) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  const overdueCount = loans.filter(l => l.status === 'Overdue' || l.status === 'In Default').length;

  return (
    <div className={`min-h-screen flex flex-row font-sans overflow-hidden transition-colors duration-200 ${
      theme === 'dark' ? 'dark bg-[#020617] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5 font-bold text-white text-xl tracking-tight font-display">
            <div className="w-9 h-9 bg-linear-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-wide">DEBTRELIEF AI</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-6 py-3 text-sm font-semibold transition-all cursor-pointer border-r-4 ${
              activeTab === 'dashboard'
                ? 'bg-slate-800/60 text-blue-400 border-blue-500'
                : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 border-transparent'
            }`}
          >
            <LayoutDashboard className={`mr-3 h-4 w-4 shrink-0 transition-transform ${activeTab === 'dashboard' ? 'scale-110 text-blue-400' : 'text-slate-500'}`} />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('predictor')}
            className={`w-full flex items-center px-6 py-3 text-sm font-semibold transition-all cursor-pointer border-r-4 ${
              activeTab === 'predictor'
                ? 'bg-slate-800/60 text-blue-400 border-blue-500'
                : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 border-transparent'
            }`}
          >
            <Coins className={`mr-3 h-4 w-4 shrink-0 transition-transform ${activeTab === 'predictor' ? 'scale-110 text-blue-400' : 'text-slate-500'}`} />
            <span>AI Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`w-full flex items-center px-6 py-3 text-sm font-semibold transition-all cursor-pointer border-r-4 ${
              activeTab === 'generator'
                ? 'bg-slate-800/60 text-blue-400 border-blue-500'
                : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 border-transparent'
            }`}
          >
            <FileText className={`mr-3 h-4 w-4 shrink-0 transition-transform ${activeTab === 'generator' ? 'scale-110 text-blue-400' : 'text-slate-500'}`} />
            <span>Hardship Letter Lab</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center px-6 py-3 text-sm font-semibold transition-all cursor-pointer border-r-4 ${
              activeTab === 'history'
                ? 'bg-slate-800/60 text-blue-400 border-blue-500'
                : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 border-transparent'
            }`}
          >
            <History className={`mr-3 h-4 w-4 shrink-0 transition-transform ${activeTab === 'history' ? 'scale-110 text-blue-400' : 'text-slate-500'}`} />
            <span className="flex-1 text-left">Saved Letters</span>
            {negotiationHistory.length > 0 && (
              <span className="ml-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {negotiationHistory.length}
              </span>
            )}
          </button>
        </nav>

        {/* Plan Status Widget */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-850/40 rounded-xl p-3 border border-slate-800">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Plan Status</p>
            <p className="text-sm font-medium text-slate-300">Recovery Phase 1</p>
            <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                style={{ width: overdueCount === 0 ? '100%' : '33%' }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
              {overdueCount === 0 ? 'All debts handled' : `${overdueCount} defaults active`}
            </p>
          </div>
        </div>

        {/* Profile Settings & Theme Section */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/20">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 select-none uppercase text-xs">
                {user.username.slice(0, 2)}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.username}</p>
                <p className="text-[9px] text-slate-500 truncate">{user.email || `${user.username.toLowerCase().replace(/\s+/g, '')}@example.com`}</p>
              </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl p-2.5 border border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Workspace Theme</span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/60 rounded-lg">
                <button
                  onClick={() => handleSetTheme('light')}
                  className={`py-1 px-1.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun className="h-3 w-3 text-amber-500" />
                  <span>Clean</span>
                </button>
                <button
                  onClick={() => handleSetTheme('dark')}
                  className={`py-1 px-1.5 text-[9px] font-bold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="h-3 w-3 text-indigo-400" />
                  <span>Deep Space</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <header className={`h-16 border-b flex items-center justify-between px-8 shrink-0 shadow-xs z-10 transition-colors duration-200 ${
          theme === 'dark' ? 'bg-[#090e1f] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h1 className={`text-base font-semibold font-display transition-colors duration-200 ${
            theme === 'dark' ? 'text-white' : 'text-slate-850'
          }`}>
            Debt Recovery & Settlement
          </h1>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className={`text-sm font-semibold transition-colors duration-200 ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>{user.username}</p>
              <p className="text-xs text-slate-500 font-mono">{user.email || `${user.username.toLowerCase().replace(/\s+/g, '')}@example.com`}</p>
            </div>
            
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold select-none uppercase shadow-xs transition-colors duration-200 ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              {user.username.slice(0, 2)}
            </div>

            <div className={`h-6 w-[1px] ${theme === 'dark' ? 'bg-slate-850' : 'bg-slate-200'}`} />

            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-rose-400' : 'hover:bg-slate-100 text-slate-500 hover:text-rose-600'
              }`}
              title="Sign out of portal"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <div className={`flex-1 p-8 overflow-y-auto transition-colors duration-200 ${
          theme === 'dark' ? 'bg-[#050b18]' : 'bg-slate-50/40'
        }`}>

          {/* Render Active Component Only */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6"
            >
              {metrics && (
                <FinancialHealthMetricsView
                  metrics={metrics}
                  user={user}
                  loans={loans}
                  onUpdateFinancials={handleUpdateFinancials}
                />
              )}
              
              <LoansList
                loans={loans}
                onAddLoan={handleAddLoan}
                onUpdateLoan={handleUpdateLoan}
                onDeleteLoan={handleDeleteLoan}
                onSelectForSettlement={handleSelectForSettlement}
                onSelectForLetter={handleSelectForLetter}
              />
            </motion.div>
          )}

          {activeTab === 'predictor' && (
            <motion.div
              key="predictor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <SettlementPredictor
                loans={loans}
                selectedLoanId={selectedLoanId}
                onSelectLoanId={setSelectedLoanId}
              />
            </motion.div>
          )}

          {activeTab === 'generator' && (
            <motion.div
              key="generator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <LetterGenerator
                loans={loans}
                selectedLoanId={selectedLoanId}
                onSelectLoanId={setSelectedLoanId}
                onGenerationSuccess={() => {
                  refreshAllData(user.id);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <NegotiationHistoryView
                history={negotiationHistory}
                onDeleteHistory={handleDeleteNegotiation}
              />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
