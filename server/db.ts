import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Loan, NegotiationRecord } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface Schema {
  users: (User & { passwordHash: string })[];
  loans: Loan[];
  negotiations: NegotiationRecord[];
}

function initDb(): Schema {
  if (!fs.existsSync(DB_FILE)) {
    const initialData: Schema = {
      users: [],
      loans: [],
      negotiations: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read database, resetting...", e);
    const initialData: Schema = {
      users: [],
      loans: [],
      negotiations: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveDb(data: Schema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export const db = {
  // User operations
  getUsers(): (User & { passwordHash: string })[] {
    return initDb().users;
  },

  getUserByEmail(email: string): (User & { passwordHash: string }) | undefined {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  getUserById(id: string): User | undefined {
    const user = this.getUsers().find(u => u.id === id);
    if (!user) return undefined;
    const { passwordHash, ...rest } = user;
    return rest;
  },

  createUser(username: string, email: string, passwordHash: string, monthlyIncome: number, monthlyExpenses: number): User {
    const data = initDb();
    const newUser: User & { passwordHash: string } = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      monthlyIncome,
      monthlyExpenses,
      createdAt: new Date().toISOString()
    };
    data.users.push(newUser);
    saveDb(data);
    const { passwordHash: _, ...rest } = newUser;
    return rest;
  },

  updateUserPassword(email: string, passwordHash: string): boolean {
    const data = initDb();
    const userIndex = data.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) {
      return false;
    }
    data.users[userIndex].passwordHash = passwordHash;
    saveDb(data);
    return true;
  },

  updateUserFinancials(id: string, monthlyIncome: number, monthlyExpenses: number): User {
    const data = initDb();
    const userIndex = data.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error("User not found");
    }
    data.users[userIndex].monthlyIncome = monthlyIncome;
    data.users[userIndex].monthlyExpenses = monthlyExpenses;
    saveDb(data);
    const { passwordHash: _, ...rest } = data.users[userIndex];
    return rest;
  },

  // Loan operations
  getLoans(userId: string): Loan[] {
    const data = initDb();
    return data.loans.filter(l => l.userId === userId);
  },

  getLoanById(loanId: string, userId: string): Loan | undefined {
    const data = initDb();
    return data.loans.find(l => l.id === loanId && l.userId === userId);
  },

  addLoan(userId: string, loan: Omit<Loan, 'id' | 'userId' | 'createdAt'>): Loan {
    const data = initDb();
    const newLoan: Loan = {
      ...loan,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString()
    };
    data.loans.push(newLoan);
    saveDb(data);
    return newLoan;
  },

  updateLoan(userId: string, loanId: string, updatedFields: Partial<Omit<Loan, 'id' | 'userId' | 'createdAt'>>): Loan {
    const data = initDb();
    const loanIndex = data.loans.findIndex(l => l.id === loanId && l.userId === userId);
    if (loanIndex === -1) {
      throw new Error("Loan not found");
    }
    data.loans[loanIndex] = {
      ...data.loans[loanIndex],
      ...updatedFields
    };
    saveDb(data);
    return data.loans[loanIndex];
  },

  deleteLoan(userId: string, loanId: string): void {
    const data = initDb();
    data.loans = data.loans.filter(l => !(l.id === loanId && l.userId === userId));
    // also remove negotiations associated with this loan
    data.negotiations = data.negotiations.filter(n => !(n.loanId === loanId && n.userId === userId));
    saveDb(data);
  },

  // Negotiations
  getNegotiations(userId: string): NegotiationRecord[] {
    const data = initDb();
    return data.negotiations.filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  addNegotiation(userId: string, negotiation: Omit<NegotiationRecord, 'id' | 'userId' | 'createdAt'>): NegotiationRecord {
    const data = initDb();
    const newRecord: NegotiationRecord = {
      ...negotiation,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString()
    };
    data.negotiations.push(newRecord);
    saveDb(data);
    return newRecord;
  },

  deleteNegotiation(userId: string, id: string): void {
    const data = initDb();
    data.negotiations = data.negotiations.filter(n => !(n.id === id && n.userId === userId));
    saveDb(data);
  }
};
