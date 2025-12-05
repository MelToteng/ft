export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  budget_sub_item_id?: number;
}

// New: A budget period with a custom name and date range.
export interface BudgetPeriod {
  id: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface BudgetSubItem {
  id: number;
  budgetItemId: number;
  name: string;
  amount: number;
}

export interface BudgetItem {
  id?: number;
  budgetPeriodId: number; // Links to a BudgetPeriod
  category: string;
  amount: number;
  subItems?: BudgetSubItem[];
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

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: number;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  frequency: RecurringFrequency;
  dayOfPeriod?: number; // day of month (1-31) for monthly, day of week (0-6) for weekly
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, undefined means indefinite
  isActive: boolean;
  lastGeneratedDate?: string; // YYYY-MM-DD
}

export interface CustomCategory {
  id: number;
  name: string;
  type: TransactionType;
  color: string; // hex color code
  icon?: string; // emoji or icon name
}

export interface CSVColumnMapping {
  date: string;
  description: string;
  amount: string;
  type?: string;
  category?: string;
}

export interface ParsedTransaction {
  description: string;
  amount: number;
  date: string;
  type?: TransactionType;
  category?: string;
}

// Shopping List Types
export interface ShoppingList {
  id: number;
  user_id: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
  budget_item_id?: number;
  budget_sub_item_id?: number;
  created_at: string;
  updated_at: string;
  items?: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: number;
  list_id: number;
  name: string;
  quantity: number;
  estimated_cost: number;
  unit_price: number;
  actual_cost: number;
  is_purchased: boolean;
  purchased_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListShare {
  id: number;
  list_id: number;
  token: string;
  shared_with_email?: string;
  expires_at?: string;
  created_at: string;
}

export interface UserNotification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  link?: string;
  created_at: string;
}
