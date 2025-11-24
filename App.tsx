import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, TransactionType, BudgetItem, BudgetPeriod, GeminiInsightData, Notification } from './types';
import { getFinancialInsight } from './services/geminiService';
import { Modal } from './components/ui';
import { initDb, getTransactions, addTransaction, deleteTransaction, getBudgets, getBudgetPeriods, addBudgetPeriod, updateBudgetPeriod, deleteBudgetPeriod, saveBudgets, getSetting, setSetting, seedWithMockData } from './services/sqliteService';

// Components
import { BackgroundShapes } from './components/layout/BackgroundShapes';
import { TransactionFormModal } from './components/transactions/TransactionFormModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { BudgetManagementView } from './components/budget/BudgetManagementView';
import { AllTransactionsView } from './components/transactions/AllTransactionsView';

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
            setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setActiveModal(null);
            addNotification(`${transaction.type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
        } catch (error: any) {
            addNotification(error.message, 'error');
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                await deleteTransaction(id);
                setTransactions(transactions.filter(t => t.id !== id));
                addNotification('Transaction deleted.', 'info');
            } catch (error: any) {
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
        return [{ date: 'Start', balance: startingBalance }, ...data];
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
            const sortedPeriods = [...budgetPeriods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
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
                    <DashboardView
                        transactions={transactions}
                        budgets={budgets}
                        budgetPeriods={budgetPeriods}
                        dashboardPeriodFilter={dashboardPeriodFilter}
                        setDashboardPeriodFilter={setDashboardPeriodFilter}
                        currency={currency}
                        handleSetCurrency={handleSetCurrency}
                        periodIncome={periodIncome}
                        periodExpenses={periodExpenses}
                        periodNet={periodNet}
                        financialRunway={financialRunway}
                        formatCurrency={formatCurrency}
                        setActiveModal={setActiveModal}
                        setView={setView}
                        handleGetInsight={handleGetInsight}
                        isInsightLoading={isInsightLoading}
                        handleDeleteTransaction={handleDeleteTransaction}
                        isBalanceTrendModalOpen={isBalanceTrendModalOpen}
                        setIsBalanceTrendModalOpen={setIsBalanceTrendModalOpen}
                        chartData={chartData}
                        spendingByCategory={spendingByCategory}
                        budgetDisplayPeriod={budgetDisplayPeriod}
                    />
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