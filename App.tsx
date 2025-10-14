import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, TransactionType, BudgetItem, BudgetPeriod, GeminiInsightData, Notification } from './types';
import { getFinancialInsight } from './services/geminiService';
import { Button, Modal, FormInput, FormSelect, Icons } from './components/ui';
import { initDb, getTransactions, addTransaction, deleteTransaction, getBudgets, getBudgetPeriods, addBudgetPeriod, updateBudgetPeriod, deleteBudgetPeriod, saveBudgets, getSetting, setSetting, getTransactionsCount, seedWithMockData } from './services/sqliteService';

// --- MOCK DATA ---
const createMockData = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);
    const d = (monthOffset: number, day: number) => formatDate(new Date(currentYear, currentMonth + monthOffset, day));

    const mockBudgetPeriods: BudgetPeriod[] = [
      { id: 1, name: 'Current Month', startDate: d(0, 1), endDate: d(1, 0) },
      { id: 2, name: 'Last Month', startDate: d(-1, 1), endDate: d(0, 0) },
      { id: 3, name: 'Next Month', startDate: d(1, 1), endDate: d(2, 0) },
      { id: 4, name: 'Summer Vacation', startDate: d(1, 15), endDate: d(1, 25) },
    ];

    const mockBudgets: BudgetItem[] = [
      // Current Month
      { id: 101, budgetPeriodId: 1, category: 'Groceries', amount: 500 },
      { id: 102, budgetPeriodId: 1, category: 'Transport', amount: 150 },
      { id: 103, budgetPeriodId: 1, category: 'Eating Out', amount: 200 },
      { id: 104, budgetPeriodId: 1, category: 'Utilities', amount: 250 },
      { id: 105, budgetPeriodId: 1, category: 'Shopping', amount: 300 },
      // Last Month
      { id: 201, budgetPeriodId: 2, category: 'Groceries', amount: 480 },
      { id: 202, budgetPeriodId: 2, category: 'Utilities', amount: 240 },
      { id: 203, budgetPeriodId: 2, category: 'Entertainment', amount: 100 },
      // Next Month (planning)
      { id: 301, budgetPeriodId: 3, category: 'Groceries', amount: 520 },
      { id: 302, budgetPeriodId: 3, category: 'Shopping', amount: 150 },
      { id: 303, budgetPeriodId: 3, category: 'Travel', amount: 800 },
      // Summer Vacation
      { id: 401, budgetPeriodId: 4, category: 'Travel', amount: 750 },
      { id: 402, budgetPeriodId: 4, category: 'Eating Out', amount: 400 },
      { id: 403, budgetPeriodId: 4, category: 'Entertainment', amount: 250 },
    ];
    
    const mockTransactions: Transaction[] = ([
        // Last Month's Data
        { id: 10, type: 'income', description: 'Salary (Last Month)', amount: 4000, date: d(-1, 2), category: 'Income' },
        { id: 11, type: 'income', description: 'Freelance Project', amount: 750, date: d(-1, 15), category: 'Income' },
        { id: 12, type: 'expense', description: 'Groceries', amount: 115.20, date: d(-1, 5), category: 'Groceries' },
        { id: 13, type: 'expense', description: 'Internet Bill', amount: 60.00, date: d(-1, 10), category: 'Utilities' },
        { id: 14, type: 'expense', description: 'Concert Tickets', amount: 95.00, date: d(-1, 20), category: 'Entertainment' },
        { id: 15, type: 'expense', description: 'New headphones', amount: 180.00, date: d(-1, 22), category: 'Shopping' },
        { id: 16, type: 'expense', description: 'Train pass', amount: 80.00, date: d(-1, 3), category: 'Transport' },
        { id: 17, type: 'expense', description: 'Dinner', amount: 65.00, date: d(-1, 12), category: 'Eating Out' },
  
        // Current Month's Data
        { id: 1, type: 'income', description: 'Salary', amount: 4000, date: d(0, 2), category: 'Income' },
        { id: 21, type: 'income', description: 'Stock Dividend', amount: 120, date: d(0, 18), category: 'Income' },
        { id: 2, type: 'expense', description: 'Weekly Groceries', amount: 120.50, date: d(0, 3), category: 'Groceries' },
        { id: 3, type: 'expense', description: 'Gasoline', amount: 45.00, date: d(0, 4), category: 'Transport' },
        { id: 4, type: 'expense', description: 'Electricity Bill', amount: 85.75, date: d(0, 5), category: 'Utilities' },
        { id: 5, type: 'expense', description: 'Dinner with friends', amount: 78.30, date: d(0, 6), category: 'Eating Out' },
        { id: 6, type: 'expense', description: 'Netflix Subscription', amount: 15.99, date: d(0, 10), category: 'Subscriptions' },
        { id: 7, type: 'expense', description: 'Birthday Gift', amount: 50.00, date: d(0, 12), category: 'Gifts' },
        { id: 8, type: 'expense', description: 'Coffee run', amount: 8.50, date: d(0, 15), category: 'Eating Out' },
        { id: 9, type: 'expense', description: 'More groceries', amount: 95.00, date: d(0, 16), category: 'Groceries' },
        { id: 22, type: 'expense', description: 'New jacket', amount: 125.00, date: d(0, 19), category: 'Shopping' },
    ] as Transaction[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return { mockTransactions, mockBudgets, mockBudgetPeriods };
};

// --- CONSTANTS ---
const DEFAULT_EXPENSE_CATEGORIES = ['Housing', 'Groceries', 'Transport', 'Utilities', 'Eating Out', 'Entertainment', 'Shopping', 'Health', 'Personal Care', 'Subscriptions', 'Gifts', 'Travel', 'Other'];
const PIE_CHART_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6366F1'];


// --- UI COMPONENTS ---

const BackgroundShapes = () => (
  <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
    <div className="absolute w-52 h-52 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 top-[10%] right-[10%] animate-[float_8s_ease-in-out_infinite]"></div>
    <div className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 bottom-[20%] left-[5%] animate-[float_10s_ease-in-out_2s_infinite]"></div>
    <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 top-[50%] right-[20%] animate-[float_6s_ease-in-out_4s_infinite]"></div>
    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
        50% { transform: translateY(-25px) rotate(180deg) scale(1.05); }
      }
    `}</style>
  </div>
);

const Header: React.FC = () => (
  <header className="text-center my-12 animate-slide-down relative">
    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text mb-2">
      Finance Tracker
    </h1>
    <p className="text-text-secondary text-lg">Modern budgeting with intelligent insights</p>
  </header>
);

interface StatCardProps {
  label: string;
  value: string;
  colorClass: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, colorClass }) => (
    <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-custom-lg">
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorClass}`}></div>
        <p className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">{label}</p>
        <p className={`text-3xl font-bold ${colorClass.replace('bg-','text-')}`}>
            {value}
        </p>
    </div>
);


// --- MAIN APP COMPONENT ---
export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [insight, setInsight] = useState<GeminiInsightData | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [view, setView] = useState<'dashboard' | 'budgets' | 'transactions'>('dashboard');
  const [dashboardPeriodFilter, setDashboardPeriodFilter] = useState<number | 'all'>('all');
  const [isBalanceTrendModalOpen, setIsBalanceTrendModalOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);
  
  const formatCurrency = useCallback((value: number) => {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    } catch (e) {
        // Fallback for invalid currency code
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }
  }, [currency]);

  const loadData = useCallback(async () => {
    try {
        const [loadedTransactions, loadedBudgets, loadedPeriods, savedCurrency] = await Promise.all([
            getTransactions(),
            getBudgets(),
            getBudgetPeriods(),
            getSetting('currency'),
        ]);

        setTransactions(loadedTransactions);
        setBudgets(loadedBudgets);
        setBudgetPeriods(loadedPeriods);
        if (savedCurrency) setCurrency(savedCurrency);

    } catch (error) {
        console.error("Error loading data:", error);
        addNotification("Could not load data.", "error");
    }
  }, [addNotification]);
  
  const handleSetCurrency = async (newCurrency: string) => {
      setCurrency(newCurrency);
      await setSetting('currency', newCurrency);
      addNotification(`Currency set to ${newCurrency}`, 'success');
  };

  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      try {
        await initDb();
        await loadData();
      } catch (error) {
        console.error("Initialization error:", error);
        addNotification("Failed to initialize the app.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [loadData]);

  const handleSeedData = async () => {
    if (!window.confirm('This will add sample transactions and budgets to your existing data. Are you sure you want to continue?')) {
        return;
    }
    setIsSeeding(true);
    try {
      await seedWithMockData(createMockData());
      addNotification('Demo data added successfully!', 'success');
      await loadData();
    } catch (e) {
      addNotification('Failed to add demo data.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };


  // Transactions filtered for the dashboard view (stats, charts)
  const dashboardTransactions = useMemo(() => {
    if (dashboardPeriodFilter === 'all') {
      return transactions;
    }
    const period = budgetPeriods.find(p => p.id === dashboardPeriodFilter);
    if (!period) return [];

    const periodStart = new Date(period.startDate + 'T00:00:00');
    const periodEnd = new Date(period.endDate + 'T23:59:59');

    return transactions.filter(t => {
      const transactionDate = new Date(t.date + 'T00:00:00');
      return transactionDate >= periodStart && transactionDate <= periodEnd;
    });
  }, [transactions, budgetPeriods, dashboardPeriodFilter]);


  const { periodIncome, periodExpenses, periodNet } = useMemo(() => {
    const income = dashboardTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = dashboardTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { periodIncome: income, periodExpenses: expenses, periodNet: income - expenses };
  }, [dashboardTransactions]);

  const totalBalance = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return income - expenses;
  }, [transactions]);

  const financialRunway = useMemo(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentExpenses = transactions
          .filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
          .reduce((sum, t) => sum + t.amount, 0);
      
      if (recentExpenses <= 0) return '∞';
      
      const avgDailyExpense = recentExpenses / 30;
      if (totalBalance <= 0) return '0 days';
      
      return `${Math.floor(totalBalance / avgDailyExpense)} days`;
  }, [transactions, totalBalance]);
  
  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
        const newTransaction = await addTransaction(transaction);
        setTransactions(prev => [newTransaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setActiveModal(null);
        addNotification(`${transaction.type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
    } catch(error: any) {
        addNotification(error.message, 'error');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        setTransactions(transactions.filter(t => t.id !== id));
        addNotification('Transaction deleted.', 'info');
      } catch(error: any) {
        addNotification(error.message, 'error');
      }
    }
  };
  
  const handleSavePeriod = async (period: Omit<BudgetPeriod, 'id'> & { id: number | 'new' }, budgetsToSave: { category: string, amount: number }[]) => {
      if (period.id === 'new') {
          const newPeriod = await addBudgetPeriod({ name: period.name, startDate: period.startDate, endDate: period.endDate });
          await saveBudgets(newPeriod.id, budgetsToSave);
      } else {
          await updateBudgetPeriod(period as BudgetPeriod);
          await saveBudgets(period.id, budgetsToSave);
      }
      addNotification('Budget period saved to database!', 'success');
      await loadData(); // Reload from DB
  };
  
  const handleDeletePeriod = async (id: number) => {
      await deleteBudgetPeriod(id);
      addNotification('Budget period deleted from database.', 'info');
      await loadData();
  };

  const startingBalance = useMemo(() => {
    if (dashboardPeriodFilter === 'all') {
        return 0;
    }
    const period = budgetPeriods.find(p => p.id === dashboardPeriodFilter);
    if (!period) return 0;

    const periodStart = new Date(period.startDate + 'T00:00:00');
    
    return transactions
        .filter(t => new Date(t.date) < periodStart)
        .reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

  }, [transactions, budgetPeriods, dashboardPeriodFilter]);

  const chartData = useMemo(() => {
    if (dashboardTransactions.length === 0 && dashboardPeriodFilter === 'all') return [];
    
    const sorted = [...dashboardTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = startingBalance;
    const data = sorted.map(t => {
      runningBalance += t.type === 'income' ? t.amount : -t.amount;
      return {
        date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: runningBalance
      };
    });
    return [{date: 'Start', balance: startingBalance}, ...data];
  }, [dashboardTransactions, startingBalance]);

  const spendingByCategory = useMemo(() => {
    const expenses = dashboardTransactions.filter(t => t.type === 'expense');
    const categoryMap = new Map<string, number>();
    expenses.forEach(t => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    });
    
    const sorted = Array.from(categoryMap.entries())
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value);

    const topN = 5;
    if (sorted.length > topN) {
      const top = sorted.slice(0, topN);
      const otherValue = sorted.slice(topN).reduce((acc, curr) => acc + curr.value, 0);
      return [...top, { name: 'Other', value: otherValue }];
    }
    return sorted;

  }, [dashboardTransactions]);

  const handleGetInsight = async () => {
    if (transactions.length < 5) {
        addNotification('Need at least 5 transactions for a meaningful insight.', 'info');
        return;
    }
    setIsInsightLoading(true);
    setInsightError(null);
    try {
        const result = await getFinancialInsight(transactions);
        setInsight(result);
        setActiveModal('insight');
    } catch (error: any) {
        setInsightError(error.message || 'An unknown error occurred.');
        addNotification(error.message || 'An unknown error occurred.', 'error');
    } finally {
        setIsInsightLoading(false);
    }
  };
  
  const allExpenseCategories = useMemo(() => {
      const categories = new Set(DEFAULT_EXPENSE_CATEGORIES);
      transactions.filter(t => t.type === 'expense').forEach(t => categories.add(t.category));
      budgets.forEach(b => categories.add(b.category));
      return Array.from(categories).sort();
  }, [transactions, budgets]);

  const budgetDisplayPeriodId = useMemo(() => {
    if (typeof dashboardPeriodFilter === 'number') {
        return dashboardPeriodFilter;
    }
    // When 'all' is selected, find the current period or fallback to most recent
    if (budgetPeriods.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const currentPeriod = budgetPeriods.find(p => p.startDate <= today && p.endDate >= today);
        if (currentPeriod) return currentPeriod.id;
        // Fallback to the most recent period based on start date
        const sortedPeriods = [...budgetPeriods].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        return sortedPeriods[0].id;
    }
    return null;
  }, [dashboardPeriodFilter, budgetPeriods]);

  const budgetDisplayPeriod = useMemo(() => {
      if (!budgetDisplayPeriodId) return null;
      return budgetPeriods.find(p => p.id === budgetDisplayPeriodId);
  }, [budgetDisplayPeriodId, budgetPeriods]);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-primary-light mb-2">Loading Your Financials...</h1>
                <p className="text-text-secondary">Please wait a moment.</p>
            </div>
        </div>
    );
  }

  return (
    <>
      <BackgroundShapes />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen relative z-10">
        
        {view === 'dashboard' ? (
          <>
            <Header />
            
            <section className="flex flex-wrap gap-4 justify-center items-center mb-8 animate-slide-up">
                <Button onClick={() => setActiveModal('income')}>💰 Add Income</Button>
                <Button onClick={() => setActiveModal('expense')}>💸 Add Expense</Button>
                <Button variant="secondary" onClick={() => setView('budgets')}>📊 Manage Budgets</Button>
                {/* <Button variant="secondary" onClick={handleGetInsight} disabled={isInsightLoading}>
                    {isInsightLoading ? 'Analyzing...' : <><Icons.Sparkles/> Get AI Insight</>}
                </Button> */}
                <Button variant="secondary" onClick={handleGetInsight} disabled="true" tooltip="AI Insights are temporarily disabled" className="cursor-not-allowed opacity-50">
                    {isInsightLoading ? 'Analyzing...' : <><Icons.Sparkles/> Get AI Insight</>}
                </Button>
            </section>
            
            <div className="flex justify-end items-center mb-6 animate-fade-in gap-4">
                <div>
                    <label htmlFor="dashboard-period-filter" className="text-sm font-medium text-text-secondary mr-3">
                        Showing data for:
                    </label>
                    <select 
                        id="dashboard-period-filter"
                        value={dashboardPeriodFilter}
                        onChange={e => setDashboardPeriodFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                    >
                        <option value="all">All Time</option>
                        {budgetPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="currency-select" className="text-sm font-medium text-text-secondary mr-3">
                        Currency:
                    </label>
                    <select 
                        id="currency-select"
                        value={currency}
                        onChange={e => handleSetCurrency(e.target.value)}
                        className="bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                    >
                        <option value="BWP">BWP (P)</option>
                        <option value="ZAR">ZAR (R)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="INR">INR (₹)</option>
                    </select>
                </div>
            </div>


            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-in">
                <StatCard label="Total Income" value={formatCurrency(periodIncome)} colorClass="bg-success" />
                <StatCard label="Total Expenses" value={formatCurrency(periodExpenses)} colorClass="bg-danger" />
                <StatCard label="Current Balance" value={formatCurrency(periodNet)} colorClass="bg-primary" />
                <StatCard label="Financial Runway" value={financialRunway} colorClass="bg-warning" />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Budget Progress</h3>
                        {budgetDisplayPeriod && (
                           <span className="text-sm text-text-muted font-medium bg-surface-light px-3 py-1 rounded-lg">{budgetDisplayPeriod.name}</span>
                        )}
                    </div>
                    <div className="overflow-y-auto flex-grow pr-2 space-y-4">
                    {(() => {
                        if (!budgetDisplayPeriod) {
                            return <div className="flex items-center justify-center h-full text-text-muted">Create a budget period to track progress.</div>;
                        }

                        const currentPeriodBudgets = budgets.filter(b => b.budgetPeriodId === budgetDisplayPeriod.id);
                        if (currentPeriodBudgets.length === 0) {
                            return <div className="flex items-center justify-center h-full text-text-muted">Set budgets for {budgetDisplayPeriod.name}.</div>;
                        }
                        
                        const periodStart = new Date(budgetDisplayPeriod.startDate + 'T00:00:00');
                        const periodEnd = new Date(budgetDisplayPeriod.endDate + 'T23:59:59');

                        return currentPeriodBudgets.map((budget) => {
                          const spent = transactions
                            .filter(t => t.category === budget.category && t.type === 'expense')
                            .filter(t => {
                                const transactionDate = new Date(t.date + 'T00:00:00');
                                return transactionDate >= periodStart && transactionDate <= periodEnd;
                            })
                            .reduce((sum, t) => sum + t.amount, 0);

                          const percentage = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
                          const progressClass = percentage >= 100 ? 'bg-danger' : percentage > 70 ? 'bg-warning' : 'bg-success';
                          return (
                              <div key={budget.category}>
                                  <div className="flex justify-between text-sm mb-1">
                                      <span className="font-semibold">{budget.category}</span>
                                      <span className="text-text-muted">{formatCurrency(spent)} / {formatCurrency(budget.amount)}</span>
                                  </div>
                                  <div className="w-full bg-surface-light rounded-full h-2.5">
                                      <div className={`${progressClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                                  </div>
                              </div>
                          );
                        });
                    })()}
                    </div>
                </div>

                <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Spending Breakdown</h3>
                        <Button variant="ghost" onClick={() => setIsBalanceTrendModalOpen(true)} className="!py-1 !px-3 text-xs">
                           <Icons.Chart className="w-4 h-4"/> View Trend
                        </Button>
                    </div>

                    {spendingByCategory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie
                                    data={spendingByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="60%"
                                    outerRadius="80%"
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {spendingByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => `${formatCurrency(value)} (${((value / periodExpenses) * 100).toFixed(1)}%)`}
                                    contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #27272A', borderRadius: '1rem' }}
                                />
                                <Legend iconSize={10} wrapperStyle={{bottom: 25, fontSize: '12px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-text-muted">No expenses in this period.</div>}
                </div>
                
                <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Recent Transactions</h3>
                        <Button variant="secondary" onClick={() => setView('transactions')} className="!py-1 !px-3 text-xs">View All <Icons.ChevronRight /></Button>
                    </div>
                    <div className="space-y-3 h-[calc(100%-2.5rem)] overflow-y-auto pr-2">
                    {(dashboardTransactions.length > 0 ? dashboardTransactions.slice(0, 10) : []).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-light/50 transition-colors">
                            <div>
                                <p className="font-semibold">{t.description}</p>
                                <p className="text-xs text-text-muted">{t.category} &middot; {new Date(t.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className={`font-bold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                </p>
                                <button onClick={() => handleDeleteTransaction(t.id)} className="text-text-muted hover:text-danger transition-colors p-1.5 rounded-md hover:bg-danger/10">
                                    <Icons.Trash />
                                </button>
                            </div>
                        </div>
                    ))}
                    {dashboardTransactions.length === 0 && <div className="text-center py-10 text-text-muted">No transactions for this period.</div>}
                    </div>
                </div>
            </section>
          </>
        ) : view === 'budgets' ? (
           <BudgetManagementView
              onClose={() => setView('dashboard')}
              budgetPeriods={budgetPeriods}
              budgets={budgets}
              allCategories={allExpenseCategories}
              onSavePeriod={handleSavePeriod}
              onDeletePeriod={handleDeletePeriod}
              addNotification={addNotification}
           />
        ) : (
            <AllTransactionsView
                onClose={() => setView('dashboard')}
                transactions={transactions}
                budgetPeriods={budgetPeriods}
                allCategories={allExpenseCategories}
                onDeleteTransaction={handleDeleteTransaction}
                formatCurrency={formatCurrency}
            />
        )}
      </div>

      <TransactionFormModal
        isOpen={activeModal === 'income' || activeModal === 'expense'}
        onClose={() => setActiveModal(null)}
        type={activeModal as TransactionType}
        onSubmit={handleAddTransaction}
        expenseCategories={allExpenseCategories}
      />
      
       <Modal isOpen={activeModal === 'insight'} onClose={() => setActiveModal(null)} title="Your Financial Insight">
            {insightError && <p className="text-danger text-sm mb-4">{insightError}</p>}
            {insight && (
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-primary-light mb-2">Summary</h4>
                        <p className="text-text-secondary">{insight.summary}</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-primary-light mb-2">Suggestions</h4>
                        <ul className="list-disc list-inside space-y-2 text-text-secondary">
                            {insight.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-primary-light mb-2">Top Spending Habits</h4>
                        <div className="space-y-3">
                            {insight.spendingHabits.map((habit) => (
                                <div key={habit.category}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold">{habit.category}</span>
                                        <span className="text-text-muted">{habit.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-surface-light rounded-full h-2.5">
                                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${habit.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Modal>

        <Modal isOpen={isBalanceTrendModalOpen} onClose={() => setIsBalanceTrendModalOpen(false)} title="Balance Trend" className="max-w-4xl">
            <div className="h-[60vh] p-4">
                 {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorBalanceModal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#71717A" tick={{fontSize: 12}} dy={10} />
                            <YAxis stroke="#71717A" tickFormatter={formatCurrency} tick={{fontSize: 12}} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                            <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #27272A', borderRadius: '1rem' }} />
                            <Area type="monotone" dataKey="balance" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorBalanceModal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-text-muted">Not enough data to display trend.</div>}
            </div>
        </Modal>
      
      <div className="fixed top-5 right-5 z-[100] space-y-3">
        {notifications.map(n => (
          <div key={n.id} className={`px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-sm animate-slide-in-right ${n.type === 'success' ? 'bg-success' : n.type === 'error' ? 'bg-danger' : 'bg-primary'}`}>
            {n.message}
          </div>
        ))}
      </div>
       <style>{`
          @keyframes slide-in-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
          @keyframes slide-down { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slide-down { animation: slide-down 0.5s ease-out; }
          @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slide-up { animation: slide-up 0.5s ease-out 0.2s both; }
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fade-in 0.5s ease-out 0.4s both; }
       `}</style>
    </>
  );
}


// --- FORM & FILTER COMPONENTS ---

interface TransactionFiltersProps {
    allCategories: string[];
    filters: {
        type: 'all' | 'income' | 'expense';
        categories: string[];
        startDate: string;
        endDate: string;
        periodId: number | 'all';
    };
    onFilterChange: React.Dispatch<React.SetStateAction<any>>;
    budgetPeriods: BudgetPeriod[];
}
const TransactionFilters: React.FC<TransactionFiltersProps> = ({ allCategories, filters, onFilterChange, budgetPeriods }) => {
    const [isOpen, setIsOpen] = useState(true); // Default open on this page
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);

    const handleFilterChange = (field: string, value: any) => {
        onFilterChange((prev: any) => ({ ...prev, [field]: value }));
    };
    
    const handleCategoryChange = (category: string) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...filters.categories, category];
        handleFilterChange('categories', newCategories);
    };

    const resetFilters = () => {
        onFilterChange({ type: 'all', categories: [], startDate: '', endDate: '', periodId: 'all' });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold">Filters</h3>
                <Button variant="ghost" onClick={resetFilters} className="text-sm">Reset All</Button>
            </div>
             {isOpen && (
                <div className="mt-4">
                    <div className="flex items-center gap-2 rounded-xl bg-surface-light p-1 mb-4 w-fit">
                        {(['all', 'income', 'expense'] as const).map(type => (
                            <button key={type} onClick={() => handleFilterChange('type', type)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${filters.type === type ? 'bg-primary text-white' : 'text-text-secondary hover:bg-border-light'}`}>
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         <FormSelect label="Budget Period" id="period-filter" value={String(filters.periodId)} onChange={e => handleFilterChange('periodId', e.target.value === 'all' ? 'all' : Number(e.target.value))} className="!mb-0">
                            <option value="all">All Time</option>
                            {budgetPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </FormSelect>
                         <div className="relative" ref={categoryDropdownRef}>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Categories</label>
                            <button onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-left text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors flex justify-between items-center">
                                <span className="truncate">{filters.categories.length > 0 ? filters.categories.join(', ') : 'Select categories'}</span>
                                <Icons.ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isCategoryDropdownOpen && (
                                <div className="absolute z-10 top-full mt-2 w-full bg-surface border border-border-light rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {allCategories.map(cat => (
                                        <label key={cat} className="flex items-center px-4 py-2 hover:bg-surface-light cursor-pointer">
                                            <input type="checkbox" checked={filters.categories.includes(cat)} onChange={() => handleCategoryChange(cat)} className="h-4 w-4 rounded bg-surface-light border-border text-primary focus:ring-primary"/>
                                            <span className="ml-3 text-text-primary">{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-text-secondary mb-2">Start Date</label>
                             <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors"/>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-text-secondary mb-2">End Date</label>
                             <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors"/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType | null;
    onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
    expenseCategories: string[];
}
const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose, type, onSubmit, expenseCategories }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('Other');
    
    useEffect(() => {
        if(isOpen) {
            setDescription('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setCategory(type === 'income' ? 'Income' : expenseCategories.includes('Other') ? 'Other' : expenseCategories[0] || '');
        }
    }, [isOpen, type, expenseCategories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!type) return;
        onSubmit({ description, amount: parseFloat(amount), date, category, type });
    };

    if (!type) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={type === 'income' ? 'Add Income' : 'Add Expense'}>
            <form onSubmit={handleSubmit}>
                <FormInput label="Description" id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'income' ? 'e.g., Salary' : 'e.g., Groceries'} required />
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Amount" id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" required />
                    {type === 'expense' ? (
                        <FormSelect label="Category" id="category" value={category} onChange={e => setCategory(e.target.value)}>
                            {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </FormSelect>
                    ) : <FormInput label="Category" id="category" type="text" value="Income" disabled />}
                </div>
                 <FormInput label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <Button type="submit" className="w-full mt-4">{type === 'income' ? 'Add Income' : 'Add Expense'}</Button>
            </form>
        </Modal>
    );
};

interface BudgetManagementViewProps {
    onClose: () => void;
    budgetPeriods: BudgetPeriod[];
    budgets: BudgetItem[];
    allCategories: string[];
    addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    onSavePeriod: (period: Omit<BudgetPeriod, 'id'> & { id: number | 'new' }, budgetsToSave: { category: string, amount: number }[]) => Promise<void>;
    onDeletePeriod: (id: number) => Promise<void>;
}
const BudgetManagementView: React.FC<BudgetManagementViewProps> = ({ onClose, budgetPeriods, budgets, allCategories, addNotification, onSavePeriod, onDeletePeriod }) => {
    const [activePeriodId, setActivePeriodId] = useState<number | 'new' | null>(null);
    const [periodName, setPeriodName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [budgetValues, setBudgetValues] = useState<Record<string, string>>({});
    const [displayedCategories, setDisplayedCategories] = useState<string[]>([]);
    const [customCategory, setCustomCategory] = useState('');

    useEffect(() => {
        if (budgetPeriods.length > 0 && !activePeriodId) {
            setActivePeriodId(budgetPeriods[0].id);
        }
        if (budgetPeriods.length === 0) {
             setActivePeriodId('new');
        }
    }, [budgetPeriods, activePeriodId]);

    useEffect(() => {
        if (activePeriodId && activePeriodId !== 'new') {
            const period = budgetPeriods.find(p => p.id === activePeriodId);
            if (period) {
                setPeriodName(period.name);
                setStartDate(period.startDate);
                setEndDate(period.endDate);

                const periodBudgets = budgets.filter(b => b.budgetPeriodId === activePeriodId);
                const initialValues: Record<string, string> = {};
                periodBudgets.forEach(b => {
                    initialValues[b.category] = String(b.amount);
                });
                setBudgetValues(initialValues);

                const budgetCats = new Set(periodBudgets.map(b => b.category));
                allCategories.forEach(c => budgetCats.add(c));
                setDisplayedCategories(Array.from(budgetCats).sort());
            }
        } else if (activePeriodId === 'new') {
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setDate(today.getDate() + 30);
            
            setPeriodName('');
            setStartDate(today.toISOString().slice(0, 10));
            setEndDate(nextMonth.toISOString().slice(0, 10));
            setBudgetValues({});
            setDisplayedCategories([...DEFAULT_EXPENSE_CATEGORIES].sort());
        }
    }, [activePeriodId, budgetPeriods, budgets, allCategories]);

    const handleSelectPeriod = (id: number | 'new') => {
        setActivePeriodId(id);
    };

    const handleSave = async () => {
        if (!periodName || !startDate || !endDate) {
            addNotification('Period name and dates are required.', 'error');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            addNotification('Start date cannot be after end date.', 'error');
            return;
        }

        const budgetsToSave = displayedCategories
            .map(category => ({ category, amount: parseFloat(budgetValues[category]) || 0 }))
            .filter(b => b.amount >= 0);
        
        try {
            await onSavePeriod({ id: activePeriodId as number, name: periodName, startDate, endDate }, budgetsToSave);
            onClose(); // Go back to dashboard on success
        } catch (error: any) {
            addNotification('Failed to save budget: ' + error.message, 'error');
        }
    };
    
    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this period and all its budgets? This cannot be undone.')) {
            try {
                await onDeletePeriod(id);
                setActivePeriodId(null);
                 if (budgetPeriods.length <= 1) { // if last one was deleted
                    onClose();
                }
            } catch (error: any) {
                addNotification('Failed to delete period: ' + error.message, 'error');
            }
        }
    };

    const handleAddCustomCategory = () => {
        const trimmed = customCategory.trim();
        if (trimmed && !displayedCategories.includes(trimmed)) {
            setDisplayedCategories(prev => [...prev, trimmed].sort());
            setCustomCategory('');
        }
    };
    
    const handleRemoveCategory = (categoryToRemove: string) => {
        setDisplayedCategories(prev => prev.filter(c => c !== categoryToRemove));
        setBudgetValues(prev => {
            const newValues = {...prev};
            delete newValues[categoryToRemove];
            return newValues;
        });
    };

    return (
        <div className="animate-fade-in py-12">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">Budget Management</h1>
                    <p className="text-text-secondary mt-1">Create custom periods and allocate your funds.</p>
                </div>
                <Button onClick={onClose} variant="secondary">
                    <Icons.ChevronLeft /> Back to Dashboard
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-surface/50 backdrop-blur-xl p-8 rounded-4xl border border-border">
                {/* Left Column: Period List */}
                <div className="lg:col-span-1 lg:border-r lg:border-border-light lg:pr-6">
                    <h3 className="text-xl font-bold mb-4">Budget Periods</h3>
                    
                    {/* Mobile Dropdown View */}
                    <div className="lg:hidden">
                        <FormSelect
                            label=""
                            id="budget-period-select"
                            value={activePeriodId || ''}
                            onChange={e => handleSelectPeriod(e.target.value === 'new' ? 'new' : Number(e.target.value))}
                            className="!mb-4"
                        >
                            {budgetPeriods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            <option value="new">✚ Create New Period...</option>
                        </FormSelect>
                    </div>

                    {/* Desktop List View */}
                    <div className="hidden lg:block">
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {budgetPeriods.map(p => (
                                <button 
                                    key={p.id} 
                                    onClick={() => handleSelectPeriod(p.id)}
                                    className={`w-full text-left p-3 rounded-xl transition-colors text-sm ${activePeriodId === p.id ? 'bg-primary/20 text-primary-light' : 'hover:bg-surface-light'}`}
                                >
                                    <p className="font-semibold">{p.name}</p>
                                    <p className={`text-xs ${activePeriodId === p.id ? 'text-primary-light/80' : 'text-text-muted'}`}>
                                        {new Date(p.startDate + 'T00:00:00').toLocaleDateString()} - {new Date(p.endDate + 'T00:00:00').toLocaleDateString()}
                                    </p>
                                </button>
                            ))}
                        </div>
                         <Button variant="secondary" onClick={() => handleSelectPeriod('new')} className="w-full mt-4 !py-2 text-sm"><Icons.Plus /> Create New Period</Button>
                    </div>
                </div>


                {/* Right Column: Editor */}
                <div className="lg:col-span-2">
                    {activePeriodId ? (
                        <div>
                            <h3 className="text-xl font-bold mb-4">{activePeriodId === 'new' ? 'Create New Period' : 'Edit Period'}</h3>
                            <div className="bg-surface-light p-4 rounded-2xl">
                                <FormInput label="Period Name" id="periodName" value={periodName} onChange={e => setPeriodName(e.target.value)} placeholder="e.g., July Paycheck"/>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Start Date" id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    <FormInput label="End Date" id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-bold mt-6 mb-4">Category Budgets</h3>
                             <div className="space-y-3 max-h-64 overflow-y-auto pr-2 mb-4">
                                {displayedCategories.map(cat => (
                                    <div key={cat} className="flex items-center gap-2">
                                        <label htmlFor={`budget-${cat}`} className="text-sm font-medium text-text-secondary flex-1 truncate w-1/3">{cat}</label>
                                        <div className="flex-1">
                                            <FormInput label="" id={`budget-${cat}`} type="number" value={budgetValues[cat] || ''} onChange={e => setBudgetValues({...budgetValues, [cat]: e.target.value})} placeholder="0.00" step="0.01" className="!mb-0" />
                                        </div>
                                        <button onClick={() => handleRemoveCategory(cat)} className="text-text-muted hover:text-danger p-2 rounded-md transition-colors"><Icons.Trash /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 border-t border-border-light pt-4">
                                <FormInput label="" id="customCategory" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Add new category..." className="!mb-0 flex-grow"/>
                                <Button type="button" variant="secondary" onClick={handleAddCustomCategory} className="!py-2">Add</Button>
                            </div>

                             <div className="flex justify-between items-center mt-6">
                                {activePeriodId !== 'new' ? (
                                    <Button variant="danger" onClick={() => handleDelete(activePeriodId as number)} className="!py-2"><Icons.Trash /> Delete Period</Button>
                                ) : <div></div>}
                                <Button onClick={handleSave} className="!py-2">Save Changes</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-muted">
                            <p>Select a period to edit or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


interface AllTransactionsViewProps {
    onClose: () => void;
    transactions: Transaction[];
    budgetPeriods: BudgetPeriod[];
    allCategories: string[];
    onDeleteTransaction: (id: number) => Promise<void>;
    formatCurrency: (value: number) => string;
}
const AllTransactionsView: React.FC<AllTransactionsViewProps> = ({ onClose, transactions, budgetPeriods, allCategories, onDeleteTransaction, formatCurrency }) => {
    const [filters, setFilters] = useState({
        type: 'all' as 'all' | 'income' | 'expense',
        categories: [] as string[],
        startDate: '',
        endDate: '',
        periodId: 'all' as number | 'all',
    });

    const filteredTransactions = useMemo(() => {
        let results = [...transactions];

        if (filters.periodId !== 'all') {
            const period = budgetPeriods.find(p => p.id === filters.periodId);
            if (period) {
                const periodStart = new Date(period.startDate + 'T00:00:00');
                const periodEnd = new Date(period.endDate + 'T23:59:59');
                results = results.filter(t => {
                    const transactionDate = new Date(t.date + 'T00:00:00');
                    return transactionDate >= periodStart && transactionDate <= periodEnd;
                });
            }
        }

        return results
            .filter(t => filters.type === 'all' || t.type === filters.type)
            .filter(t => filters.categories.length === 0 || filters.categories.includes(t.category))
            .filter(t => !filters.startDate || new Date(t.date) >= new Date(filters.startDate))
            .filter(t => {
                if (!filters.endDate) return true;
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                return new Date(t.date) <= endDate;
            })
    }, [transactions, filters, budgetPeriods]);

    return (
        <div className="animate-fade-in py-12">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">All Transactions</h1>
                    <p className="text-text-secondary mt-1">Search, filter, and review all your financial activities.</p>
                </div>
                <Button onClick={onClose} variant="secondary">
                    <Icons.ChevronLeft /> Back to Dashboard
                </Button>
            </header>

            <div className="bg-surface/50 backdrop-blur-xl p-8 rounded-4xl border border-border">
                <TransactionFilters 
                    allCategories={allCategories}
                    filters={filters}
                    onFilterChange={setFilters}
                    budgetPeriods={budgetPeriods}
                />
                <div className="space-y-3 h-[60vh] overflow-y-auto pr-2 mt-6 border-t border-border-light pt-6">
                    {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-light/50 transition-colors">
                            <div>
                                <p className="font-semibold">{t.description}</p>
                                <p className="text-xs text-text-muted">{t.category} &middot; {new Date(t.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className={`font-bold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                </p>
                                <button onClick={() => onDeleteTransaction(t.id)} className="text-text-muted hover:text-danger transition-colors p-1.5 rounded-md hover:bg-danger/10">
                                    <Icons.Trash />
                                </button>
                            </div>
                        </div>
                    )) : <div className="text-center py-10 text-text-muted">No transactions match the current filters.</div>}
                </div>
            </div>
        </div>
    );
};