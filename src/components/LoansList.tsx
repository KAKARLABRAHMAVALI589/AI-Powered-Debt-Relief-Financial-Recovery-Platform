import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Sparkles, FileText, X, AlertCircle, RefreshCw, CreditCard, Home, Car, GraduationCap, Briefcase, Landmark, Search, Filter } from 'lucide-react';
import { Loan } from '../types';

interface LoansListProps {
  loans: Loan[];
  onAddLoan: (loan: Omit<Loan, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onUpdateLoan: (loanId: string, loan: Partial<Loan>) => Promise<void>;
  onDeleteLoan: (loanId: string) => Promise<void>;
  onSelectForSettlement: (loanId: string) => void;
  onSelectForLetter: (loanId: string) => void;
}

export default function LoansList({
  loans,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onSelectForSettlement,
  onSelectForLetter
}: LoansListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Filter Loans List
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch = loan.lenderName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          loan.loanType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Form Fields
  const [lenderName, setLenderName] = useState('');
  const [loanType, setLoanType] = useState<'Credit Card' | 'Personal Loan' | 'Home Loan' | 'Auto Loan' | 'Student Loan' | 'Business Loan'>('Credit Card');
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyEMI, setMonthlyEMI] = useState('');
  const [overdueDuration, setOverdueDuration] = useState('0');
  const [status, setStatus] = useState<'Current' | 'Overdue' | 'In Default' | 'Settled'>('Current');

  const openAddForm = () => {
    setEditingLoan(null);
    setLenderName('');
    setLoanType('Credit Card');
    setOutstandingAmount('');
    setInterestRate('18');
    setMonthlyEMI('');
    setOverdueDuration('0');
    setStatus('Current');
    setShowForm(true);
  };

  const openEditForm = (loan: Loan) => {
    setEditingLoan(loan);
    setLenderName(loan.lenderName);
    setLoanType(loan.loanType);
    setOutstandingAmount(String(loan.outstandingAmount));
    setInterestRate(String(loan.interestRate));
    setMonthlyEMI(String(loan.monthlyEMI));
    setOverdueDuration(String(loan.overdueDuration));
    setStatus(loan.status);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName || !outstandingAmount) return;

    setLoading(true);
    const payload = {
      lenderName,
      loanType,
      outstandingAmount: Number(outstandingAmount) || 0,
      interestRate: Number(interestRate) || 0,
      monthlyEMI: Number(monthlyEMI) || 0,
      overdueDuration: Number(overdueDuration) || 0,
      status
    };

    try {
      if (editingLoan) {
        await onUpdateLoan(editingLoan.id, payload);
      } else {
        await onAddLoan(payload);
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Settled':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Default':
        return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      case 'Overdue':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getLoanIcon = (type: string) => {
    switch (type) {
      case 'Credit Card':
        return {
          icon: <CreditCard className="h-4 w-4" />,
          classes: 'bg-indigo-50 text-indigo-600 border-indigo-100'
        };
      case 'Home Loan':
        return {
          icon: <Home className="h-4 w-4" />,
          classes: 'bg-amber-50 text-amber-600 border-amber-100'
        };
      case 'Auto Loan':
        return {
          icon: <Car className="h-4 w-4" />,
          classes: 'bg-emerald-50 text-emerald-600 border-emerald-100'
        };
      case 'Student Loan':
        return {
          icon: <GraduationCap className="h-4 w-4" />,
          classes: 'bg-purple-50 text-purple-600 border-purple-100'
        };
      case 'Business Loan':
        return {
          icon: <Briefcase className="h-4 w-4" />,
          classes: 'bg-sky-50 text-sky-600 border-sky-100'
        };
      default:
        return {
          icon: <Landmark className="h-4 w-4" />,
          classes: 'bg-blue-50 text-blue-600 border-blue-100'
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-linear-to-r from-white to-slate-50/50">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display tracking-tight">Your Active Borrowing & Loans</h3>
          <p className="text-sm text-slate-500 mt-0.5">Add credit cards, personal loans, or defaults to generate smart negotiation tactics.</p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/15 transition-all cursor-pointer hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Loan Detail</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      {loans.length > 0 && (
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search lender or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <span className="text-slate-400 text-xs flex items-center gap-1 font-medium select-none">
              <Filter className="h-3.5 w-3.5" />
              <span>Status:</span>
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Current">Current / Healthy</option>
              <option value="Overdue">Overdue</option>
              <option value="In Default">In Default</option>
              <option value="Settled">Settled</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Form Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h4 className="text-base font-bold text-slate-900 font-display">
                {editingLoan ? 'Edit Borrowing Detail' : 'Add New Borrowing Detail'}
              </h4>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
                    Lender Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chase Bank"
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
                    Loan Type
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Home Loan">Home Loan</option>
                    <option value="Auto Loan">Auto Loan</option>
                    <option value="Student Loan">Student Loan</option>
                    <option value="Business Loan">Business Loan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
                    Outstanding (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100000"
                    value={outstandingAmount}
                    onChange={(e) => setOutstandingAmount(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    placeholder="18"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
                    Monthly EMI (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="5000"
                    value={monthlyEMI}
                    onChange={(e) => setMonthlyEMI(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
                    Overdue Duration (Months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="3"
                    value={overdueDuration}
                    onChange={(e) => setOverdueDuration(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-display">
                    Payment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Current">Current / Healthy</option>
                    <option value="Overdue">Overdue</option>
                    <option value="In Default">In Default</option>
                    <option value="Settled">Settled in Full</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer shadow-md shadow-blue-500/15 transition-all"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{editingLoan ? 'Save Loan Amendments' : 'Securely Add Loan'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loan Grid / Table */}
      {loans.length === 0 ? (
        <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center bg-linear-to-b from-white to-slate-50/30">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4 border border-blue-100/50 shadow-xs">
            <AlertCircle className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-800 font-display">Let's set up your borrowing profile</p>
          <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
            Add your active credit card debts, personal loans, or delinquent accounts to map out automated settlement forecasts and legal correspondence.
          </p>
          <button
            onClick={openAddForm}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Account</span>
          </button>
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center bg-linear-to-b from-white to-slate-50/30">
          <div className="p-3 bg-slate-100 text-slate-500 rounded-xl mb-3">
            <Search className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 font-display">No matching loans found</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or filter criteria to view other accounts.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
            className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">
                <th className="py-4 px-6">Lender & Type</th>
                <th className="py-4 px-4 text-right">Outstanding</th>
                <th className="py-4 px-4 text-center">Interest</th>
                <th className="py-4 px-4 text-right">Monthly EMI</th>
                <th className="py-4 px-4 text-center">Overdue Duration</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6 text-right">Strategic Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border shrink-0 ${getLoanIcon(loan.loanType).classes}`}>
                        {getLoanIcon(loan.loanType).icon}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-display">{loan.lenderName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{loan.loanType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-900">
                    ₹{loan.outstandingAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-600 font-mono text-xs">
                    {loan.interestRate}%
                  </td>
                  <td className="py-4 px-4 text-right text-slate-600 font-mono text-xs">
                    ₹{loan.monthlyEMI.toLocaleString('en-IN')}/mo
                  </td>
                  <td className="py-4 px-4 text-center">
                    {loan.overdueDuration > 0 ? (
                      <span className="text-xs font-semibold text-rose-600 font-mono bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                        {loan.overdueDuration} months
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(loan.status)}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {loan.status !== "Settled" && (
                        <>
                          <button
                            onClick={() => onSelectForSettlement(loan.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            title="AI Settlement Prediction"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Predict Settlement</span>
                          </button>
                          
                          <button
                            onClick={() => onSelectForLetter(loan.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            title="Write AI Letter"
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            <span>Negotiate</span>
                          </button>
                        </>
                      )}

                      <div className="w-[1px] h-6 bg-slate-200 mx-1" />

                      <button
                        onClick={() => openEditForm(loan)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer"
                        title="Edit Loan Details"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if(confirm(`Delete loan with ${loan.lenderName}?`)) onDeleteLoan(loan.id); }}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="Delete Loan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
