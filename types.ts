export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // YYY-MM-DD
  category: string;
}

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Budget {
  amount: number;
  period: BudgetPeriod;
  startDay?: number; // e.g., 15 for the 15th of the month, or 1 for Monday
}

export interface Budgets {
  [category: string]: Budget;
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
