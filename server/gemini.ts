import { GoogleGenAI, Type } from "@google/genai";
import { Loan, SettlementRecommendation } from '../src/types';

// Lazy client initialization to avoid crashing on boot if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to your secrets or environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export async function generateSettlementRecommendation(
  loan: Loan,
  monthlyIncome: number,
  monthlyExpenses: number,
  otherLoans: Loan[]
): Promise<SettlementRecommendation> {
  const ai = getAiClient();
  
  const totalEMIOtherLoans = otherLoans.reduce((sum, l) => sum + (l.id !== loan.id ? l.monthlyEMI : 0), 0);
  const totalDebtOtherLoans = otherLoans.reduce((sum, l) => sum + (l.id !== loan.id ? l.outstandingAmount : 0), 0);
  
  const prompt = `
    Analyze the financial profile of a borrower seeking a debt settlement recommendation for a specific loan.
    
    Borrower Financial Profile:
    - Monthly Income: ₹${monthlyIncome} (INR)
    - Monthly Expenses (excluding debt EMIs): ₹${monthlyExpenses} (INR)
    - Total Monthly EMIs of OTHER loans: ₹${totalEMIOtherLoans} (INR)
    - Total Outstanding Balance of OTHER loans: ₹${totalDebtOtherLoans} (INR)
    
    Target Loan Details:
    - Lender Name: ${loan.lenderName}
    - Loan Type: ${loan.loanType}
    - Outstanding Balance: ₹${loan.outstandingAmount} (INR)
    - Interest Rate: ${loan.interestRate}%
    - Current Monthly EMI: ₹${loan.monthlyEMI} (INR)
    - Overdue Duration: ${loan.overdueDuration} months
    - Loan Status: ${loan.status}
    
    Requirements for recommendation:
    1. Recommended Settlement Amount: Should typically range from 30% to 55% of the outstanding balance depending on the overdue duration (lenders accept deeper discounts for longer overdue periods, e.g. > 6 months). Format all monetary figures strictly in Indian Rupees (₹).
    2. Settlement Percentage: The percentage of outstanding balance proposed to settle.
    3. Savings Amount: The difference between outstanding balance and recommended settlement in Indian Rupees (₹).
    4. Feasibility Rating: "Excellent", "Good", "Moderate", or "Poor", based on whether the borrower's monthly surplus (Income - Expenses - EMIs) allows them to save for a lump-sum or handle a short term payment plan.
    5. Debt Stress Level: Analyze cumulative DTI and target loan distress and return "Low", "Medium", "High", or "Critical".
    6. Analysis Summary: Provide an objective, encouraging, professional explanation of why this settlement is realistic under Indian financial conditions, what tactics the lender might use, and how the borrower should approach it. Reference CIBIL credit scoring consequences if relevant.
    7. Action Steps: Provide 3-5 concrete, sequential steps the borrower should take immediately to execute this strategy.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert financial advisor and debt settlement strategist specializing in Indian consumer debt, banking norms (RBI regulations), and financial recovery. All monetary outputs must be framed in Indian Rupees (₹).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedAmount: {
              type: Type.NUMBER,
              description: "The lump sum settlement amount in Indian Rupees suggested for negotiation."
            },
            settlementPercentage: {
              type: Type.NUMBER,
              description: "The percentage of the outstanding amount that the recommended amount represents (e.g. 45)."
            },
            savingsAmount: {
              type: Type.NUMBER,
              description: "The Indian Rupees saved (outstanding balance minus recommended amount)."
            },
            feasibilityRating: {
              type: Type.STRING,
              description: "Evaluation of the borrower's ability to pull off this settlement based on income and expenses. Must be 'Excellent', 'Good', 'Moderate', or 'Poor'."
            },
            debtStressLevel: {
              type: Type.STRING,
              description: "The severity of the financial situation. Must be 'Low', 'Medium', 'High', or 'Critical'."
            },
            analysisSummary: {
              type: Type.STRING,
              description: "Professional explanation of the loan status, lender's typical policies, and justification for the settlement values, keeping Indian banking regulations in mind."
            },
            actionSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 to 5 realistic, step-by-step actions for the borrower to take next in the Indian credit context."
            }
          },
          required: [
            "recommendedAmount",
            "settlementPercentage",
            "savingsAmount",
            "feasibilityRating",
            "debtStressLevel",
            "analysisSummary",
            "actionSteps"
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text received from Gemini API");
    }
    
    return JSON.parse(resultText.trim()) as SettlementRecommendation;
  } catch (error) {
    console.error("Gemini API Error in generateSettlementRecommendation:", error);
    // Fallback in case of API issues, ensuring a graceful user experience
    const mockRecPercent = loan.overdueDuration > 6 ? 35 : loan.overdueDuration > 3 ? 45 : 55;
    const recAmt = Math.round(loan.outstandingAmount * (mockRecPercent / 100));
    const savings = loan.outstandingAmount - recAmt;
    const surplus = monthlyIncome - monthlyExpenses - loan.monthlyEMI - totalEMIOtherLoans;
    
    return {
      loanId: loan.id,
      recommendedAmount: recAmt,
      settlementPercentage: mockRecPercent,
      savingsAmount: savings,
      feasibilityRating: surplus > 10000 ? 'Good' : 'Moderate',
      debtStressLevel: loan.overdueDuration > 6 ? 'Critical' : loan.overdueDuration > 3 ? 'High' : 'Medium',
      analysisSummary: `[System Note: AI engine offline. Showing smart estimation] Based on standard financial policies in India, a settlement of ${mockRecPercent}% is estimated for ${loan.lenderName}. Lenders typically settle for deep discounts after accounts remain overdue for 3-6+ months, as they are classified as non-performing assets (NPAs) under RBI guidelines.`,
      actionSteps: [
        "Create a dedicated recovery savings account to stack the settlement fund.",
        "Wait for the lender to initiate a settlement offer or contact their recovery department proactively.",
        "Obtain any final agreement in writing (such as a formal Settlement Letter on bank letterhead) before sending a single rupee.",
        "Once settled, request a 'No Dues Certificate' or 'Settlement Letter' for updating credit reporting agencies like CIBIL."
      ]
    };
  }
}

export async function generateNegotiationLetter(
  loan: Loan,
  user: { username: string; monthlyIncome: number; monthlyExpenses: number },
  letterType: 'Hardship Explanation' | 'Settlement Proposal' | 'Counter-Offer' | 'Payment Plan Request',
  customContext?: string
): Promise<{ subject: string; content: string; strategy: string }> {
  const ai = getAiClient();

  const monthlySurplus = user.monthlyIncome - user.monthlyExpenses - loan.monthlyEMI;

  const prompt = `
    Generate a professional negotiation document (email or mail letter) to a lender.
    
    Lender Name: ${loan.lenderName}
    Loan Type: ${loan.loanType}
    Outstanding Balance: ₹${loan.outstandingAmount} (INR)
    Interest Rate: ${loan.interestRate}%
    Monthly EMI: ₹${loan.monthlyEMI} (INR)
    Overdue Duration: ${loan.overdueDuration} months
    Borrower Name: ${user.username}
    Borrower Monthly Income: ₹${user.monthlyIncome} (INR)
    Borrower Monthly Expenses: ₹${user.monthlyExpenses} (INR)
    Estimated Monthly Surplus: ₹${monthlySurplus} (INR)
    
    Letter Type Needed: ${letterType}
    ${customContext ? `Additional context / reasons provided by borrower: "${customContext}"` : ''}
    
    The document must be respectful, highly professional, firm, and contain clear placeholders (like [Date], [Account Number]) so the borrower can fill it. It must explain the financial hardship objectively, cite standard consumer goodwill if applicable under Indian laws/RBI rules, propose concrete terms in Indian Rupees (₹), and ask for a written confirmation.
    
    Provide the response in structured JSON containing:
    1. subject: A strong email subject line or letter header.
    2. content: The full draft of the letter or email with formatted spacing (use \\n for newlines).
    3. strategy: 2-3 sentences of strategic advice on how the borrower should send this letter (e.g., email vs speed post, what documents to attach, call follow up).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert consumer advocate and debt relief professional specializing in Indian financial services, RBI consumer protection guidelines, and collection rules. Write highly persuasive, compliant, professional lender-specific hardship, counter-offer, and settlement letters using Indian Rupees (₹) and Indian formatting standards.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: "Strong, professional email subject line or letter header."
            },
            content: {
              type: Type.STRING,
              description: "The full formal body of the letter with appropriate spacing, greetings, paragraphs, and closings. Use [Date], [Your Contact Info], and [Account Number] placeholders."
            },
            strategy: {
              type: Type.STRING,
              description: "Strategic advice on how to send this specific letter, what backup documents to include (like bank statements/salary slips), and key negotiation rules under Indian banking conditions."
            }
          },
          required: ["subject", "content", "strategy"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini API");
    }

    return JSON.parse(text.trim()) as { subject: string; content: string; strategy: string };
  } catch (error) {
    console.error("Gemini API Error in generateNegotiationLetter:", error);
    // Fallback letter in case of API failure
    const dateStr = new Date().toLocaleDateString('en-IN');
    
    let subject = "";
    let content = "";
    let strategy = "";

    if (letterType === 'Hardship Explanation') {
      subject = `Financial Hardship Explanation - Account ID: [Your Account Number]`;
      content = `Date: ${dateStr}\n\nTo: ${loan.lenderName} Loss Mitigation & Restructuring Department\nFrom: ${user.username}\n\nSubject: Formal Hardship Notice and Request for Restructuring / Moratorium\n\nTo Whom It May Concern,\n\nI am writing to formally notify you that I am experiencing severe financial hardship, which has made it impossible for me to maintain my regular monthly payment of ₹${loan.monthlyEMI.toLocaleString('en-IN')} on my ${loan.loanType}.\n\nCurrently, my monthly income is ₹${user.monthlyIncome.toLocaleString('en-IN')} against critical living expenses of ₹${user.monthlyExpenses.toLocaleString('en-IN')}. I have been struck by unexpected financial setbacks, leaving me with negligible surplus. I remain fully committed to resolving this debt, but I need your department's cooperation.\n\nI request a temporary interest rate reduction or a short-term moratorium of payments until my financial situation stabilizes under RBI's consumer relief frameworks. Please let me know what relief programs are available for my account.\n\nThank you for your understanding and cooperation.\n\nSincerely,\n\n${user.username}`;
      strategy = "Send this letter via email to the lender's nodal officer or grievance cell, or speed post it. Attach proof of hardship such as recent salary slips, bank account statement, or medical reports.";
    } else {
      const settleAmount = Math.round(loan.outstandingAmount * 0.45);
      subject = `Settlement Proposal - Account ID: [Your Account Number]`;
      content = `Date: ${dateStr}\n\nTo: ${loan.lenderName} Recovery & Collections Department\nFrom: ${user.username}\n\nSubject: Formal Request for Debt Settlement (One-Time Lump-Sum Offer)\n\nTo Whom It May Concern,\n\nI am writing to propose a mutually beneficial resolution for my outstanding balance of ₹${loan.outstandingAmount.toLocaleString('en-IN')} on my ${loan.loanType}.\n\nDue to persistent and severe financial hardship, I am unable to repay this debt in full. I have consulted with financial advisors and managed to compile a one-time lump-sum fund of ₹${settleAmount.toLocaleString('en-IN')} through the assistance of family. I offer this amount as a settlement in full for the account.\n\nPlease note that if this settlement is accepted, I require a written confirmation (Settlement Letter on official letterhead) stating that the account will be reported as 'Settled' or 'Paid in Full' to CIBIL and other credit bureaus, and that the remaining balance of the debt is completely discharged.\n\nI look forward to your written response.\n\nSincerely,\n\n${user.username}`;
      strategy = "Propose a settlement amount between 35% and 50% of your outstanding debt. Never send any money until you have a signed settlement agreement in writing on official bank letterhead from an authorized lender representative.";
    }

    return { subject, content, strategy };
  }
}
