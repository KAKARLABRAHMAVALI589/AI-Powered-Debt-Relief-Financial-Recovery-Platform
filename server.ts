import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db, hashPassword } from "./server/db";
import { generateSettlementRecommendation, generateNegotiationLetter } from "./server/gemini";
import { FinancialHealthMetrics, Loan } from "./src/types";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // CORS headers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-user-id");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Auth Middleware helper
  const getUserId = (req: express.Request): string | null => {
    const userId = req.headers["x-user-id"];
    return typeof userId === "string" ? userId : null;
  };

  // --- API Routes ---

  // Register
  app.post("/api/auth/register", (req, res) => {
    try {
      const { username, email, password, monthlyIncome, monthlyExpenses } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Username, email, and password are required" });
      }

      const existing = db.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      const hashed = hashPassword(password);
      const user = db.createUser(
        username,
        email.toLowerCase(),
        hashed,
        Number(monthlyIncome) || 0,
        Number(monthlyExpenses) || 0
      );

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = db.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const hashed = hashPassword(password);
      if (user.passwordHash !== hashed) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  // Check if email exists for recovery
  app.post("/api/auth/check-email", (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const user = db.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "No account found with this email address" });
      }
      res.json({ username: user.username, email: user.email });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });

  // Reset password / Recover Account
  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and new password are required" });
      }
      const user = db.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "No account found with this email address" });
      }
      const hashed = hashPassword(password);
      db.updateUserPassword(email, hashed);
      res.json({ success: true, message: "Password updated successfully!" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Password reset failed" });
    }
  });

  // Get user profile
  app.get("/api/user/profile", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = db.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  });

  // Update user profile financials
  app.put("/api/user/profile", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { monthlyIncome, monthlyExpenses } = req.body;
      const updated = db.updateUserFinancials(
        userId,
        Number(monthlyIncome) || 0,
        Number(monthlyExpenses) || 0
      );
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get financial health metrics (dynamic)
  app.get("/api/user/financial-health", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = db.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const loans = db.getLoans(userId);
    
    // Calculate metrics
    const totalDebt = loans.reduce((sum, l) => l.status !== "Settled" ? sum + l.outstandingAmount : sum, 0);
    const totalEMI = loans.reduce((sum, l) => l.status !== "Settled" ? sum + l.monthlyEMI : sum, 0);
    
    const dtiRatio = user.monthlyIncome > 0 ? (totalEMI / user.monthlyIncome) * 100 : 0;
    const emiToIncomeRatio = dtiRatio;
    const monthlySurplus = user.monthlyIncome - user.monthlyExpenses - totalEMI;

    // Debt Stress Score calculation (0 - 100)
    let score = 0;
    if (totalDebt > 0) {
      // 1. EMI Ratio (max 40 pts)
      if (emiToIncomeRatio > 50) score += 40;
      else if (emiToIncomeRatio > 35) score += 30;
      else if (emiToIncomeRatio > 20) score += 15;
      else score += 5;

      // 2. Overdue Duration (max 30 pts)
      const maxOverdue = loans.reduce((max, l) => l.status !== "Settled" ? Math.max(max, l.overdueDuration) : max, 0);
      if (maxOverdue >= 6) score += 30;
      else if (maxOverdue >= 3) score += 20;
      else if (maxOverdue > 0) score += 10;

      // 3. Surplus status (max 30 pts)
      if (monthlySurplus < 0) score += 30;
      else if (monthlySurplus < 200) score += 20;
      else if (monthlySurplus < 500) score += 10;
    }

    let level: 'Low' | 'Medium' | 'High' | 'Critical' = "Low";
    let statusDescription = "Your debt levels are healthy. Maintain current payment cycles.";

    if (score >= 75) {
      level = "Critical";
      statusDescription = "Urgent: High default risk. Settlement and loss mitigation strategies should be pursued immediately.";
    } else if (score >= 50) {
      level = "High";
      statusDescription = "Caution: Debt load is heavily impacting your financial flexibility. Restructuring is highly recommended.";
    } else if (score >= 25) {
      level = "Medium";
      statusDescription = "Moderate financial stress. Keep track of overdue loans and optimize monthly expenses.";
    }

    const metrics: FinancialHealthMetrics = {
      totalDebt,
      totalEMI,
      dtiRatio: Math.round(dtiRatio * 10) / 10,
      monthlySurplus,
      emiToIncomeRatio: Math.round(emiToIncomeRatio * 10) / 10,
      debtStressScore: score,
      debtStressLevel: level,
      statusDescription
    };

    res.json(metrics);
  });

  // Get Loans
  app.get("/api/loans", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const loans = db.getLoans(userId);
    res.json(loans);
  });

  // Add Loan
  app.post("/api/loans", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { lenderName, loanType, outstandingAmount, interestRate, monthlyEMI, overdueDuration, status } = req.body;
      
      if (!lenderName || !loanType || outstandingAmount === undefined) {
        return res.status(400).json({ error: "Lender name, loan type, and outstanding amount are required" });
      }

      const newLoan = db.addLoan(userId, {
        lenderName,
        loanType,
        outstandingAmount: Number(outstandingAmount) || 0,
        interestRate: Number(interestRate) || 0,
        monthlyEMI: Number(monthlyEMI) || 0,
        overdueDuration: Number(overdueDuration) || 0,
        status: status || "Current"
      });

      res.status(201).json(newLoan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Loan
  app.put("/api/loans/:loanId", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { loanId } = req.params;
      const updated = db.updateLoan(userId, loanId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Loan
  app.delete("/api/loans/:loanId", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { loanId } = req.params;
      db.deleteLoan(userId, loanId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI-Powered Settlement Recommendation (Scenario 1)
  app.post("/api/loans/:loanId/recommendation", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { loanId } = req.params;
      const user = db.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const loan = db.getLoanById(loanId, userId);
      if (!loan) return res.status(404).json({ error: "Loan not found" });

      const allLoans = db.getLoans(userId);
      
      const recommendation = await generateSettlementRecommendation(
        loan,
        user.monthlyIncome,
        user.monthlyExpenses,
        allLoans
      );

      res.json(recommendation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get negotiation letters history
  app.get("/api/negotiations", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const history = db.getNegotiations(userId);
    res.json(history);
  });

  // Generate and save a negotiation letter (Scenario 2)
  app.post("/api/negotiations", async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { loanId, letterType, customContext } = req.body;
      
      if (!loanId || !letterType) {
        return res.status(400).json({ error: "Loan ID and letter type are required" });
      }

      const user = db.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const loan = db.getLoanById(loanId, userId);
      if (!loan) return res.status(404).json({ error: "Loan not found" });

      // Generate letter via Gemini
      const generated = await generateNegotiationLetter(
        loan,
        {
          username: user.username,
          monthlyIncome: user.monthlyIncome,
          monthlyExpenses: user.monthlyExpenses
        },
        letterType,
        customContext
      );

      // Save into DB
      const record = db.addNegotiation(userId, {
        loanId,
        lenderName: loan.lenderName,
        letterType,
        subject: generated.subject,
        content: generated.content,
        strategy: generated.strategy
      });

      res.status(201).json(record);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete negotiation history record
  app.delete("/api/negotiations/:id", (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { id } = req.params;
      db.deleteNegotiation(userId, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite Integration & Static asset serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Powered Debt Relief & Recovery Platform running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
