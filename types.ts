export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
}

// New: A budget period with a custom name and date range.
export interface BudgetPeriod {
  id: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface BudgetItem {
  id?: number;
  budgetPeriodId: number; // Links to a BudgetPeriod
  category: string;
  amount: number;
}


export interface GeminiInsightData {
  summary: string;
  suggestions: string[];
  spendingHabits: { category: string; percentage: number }[];
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}
