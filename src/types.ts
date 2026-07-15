export interface User {
  id: string;
  email: string;
  username: string;
  monthlyIncome: number;
  monthlyExpenses: number; // excluding EMIs
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  lenderName: string;
  loanType: 'Credit Card' | 'Personal Loan' | 'Home Loan' | 'Auto Loan' | 'Student Loan' | 'Business Loan';
  outstandingAmount: number;
  interestRate: number;
  monthlyEMI: number;
  overdueDuration: number; // in months
  status: 'Current' | 'Overdue' | 'In Default' | 'Settled';
  createdAt: string;
}

export interface SettlementRecommendation {
  loanId: string;
  recommendedAmount: number;
  settlementPercentage: number;
  savingsAmount: number;
  feasibilityRating: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  debtStressLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  analysisSummary: string;
  actionSteps: string[];
}

export interface NegotiationRecord {
  id: string;
  userId: string;
  loanId: string;
  lenderName: string;
  letterType: 'Hardship Explanation' | 'Settlement Proposal' | 'Counter-Offer' | 'Payment Plan Request';
  subject: string;
  content: string;
  strategy: string;
  createdAt: string;
}

export interface FinancialHealthMetrics {
  totalDebt: number;
  totalEMI: number;
  dtiRatio: number; // Debt to Income %
  monthlySurplus: number; // Income - Expenses - EMI
  emiToIncomeRatio: number; // EMI / Income %
  debtStressScore: number; // 0 to 100
  debtStressLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  statusDescription: string;
}
