import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Transaction, TransactionType, BudgetItem, BudgetPeriod, GeminiInsightData, Notification, RecurringTransaction, CustomCategory } from './types';
import { getFinancialInsight } from './services/geminiService';
import { Modal } from './components/ui';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getBudgets,
    saveBudgets,
    getBudgetPeriods,
    addBudgetPeriod,
    updateBudgetPeriod,
    deleteBudgetPeriod,
    getSetting,
    setSetting,
    getRecurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    processRecurringTransactions,
    getCustomCategories,
} from './services/supabaseService';
import { BackgroundShapes } from './components/layout/BackgroundShapes';
import { Auth } from './components/Auth';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { BudgetManagementView } from './components/budget/BudgetManagementView';
import { AllTransactionsView } from './components/transactions/AllTransactionsView';
import { RecurringTransactionsView } from './components/transactions/RecurringTransactionsView';
import { ShoppingListView } from './components/shopping/ShoppingListView';
import { ShoppingListDetailView } from './components/shopping/ShoppingListDetailView';
import { TransactionFormModal } from './components/transactions/TransactionFormModal';
import { RecurringTransactionModal } from './components/transactions/RecurringTransactionModal';
import { ImportExportModal } from './components/transactions/ImportExportModal';
import { CategoryManagement } from './components/settings/CategoryManagement';

// --- CONSTANTS ---
const DEFAULT_EXPENSE_CATEGORIES = [
    'Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Housing', 'Education', 'Personal Care', 'Travel', 'Savings', 'Debt', 'Gifts', 'Donations', 'Other'
];

function AppContent() {
    const [session, setSession] = useState<Session | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<BudgetItem[]>([]);
    const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([]);
    const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
    const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [insight, setInsight] = useState<GeminiInsightData | null>(null);
    const [isInsightLoading, setIsInsightLoading] = useState(false);
    const [insightError, setInsightError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'dashboard' | 'budgets' | 'transactions' | 'recurring' | 'wish-list' | 'wish-list-detail'>('dashboard');
    const [selectedListId, setSelectedListId] = useState<number | undefined>(undefined);
    const [dashboardPeriodFilter, setDashboardPeriodFilter] = useState<number | 'all'>('all'); // Will be updated in loadData
    const [isBalanceTrendModalOpen, setIsBalanceTrendModalOpen] = useState(false);
    const [currency, setCurrency] = useState('USD');

    const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const formatCurrency = useCallback((value: number) => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
            }).format(value);
        } catch (e) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(value);
        }
    }, [currency]);

    const loadData = useCallback(async () => {
        if (!session) return;
        try {
            const results = await Promise.all([
                getTransactions(),
                getBudgets(),
                getBudgetPeriods(),
                getSetting('currency'),
                getRecurringTransactions(),
                getCustomCategories(),
                processRecurringTransactions(),
            ]);

            const loadedTransactions = results[0];
            const loadedBudgets = results[1];
            const loadedPeriods = results[2];
            const savedCurrency = results[3];
            const loadedRecurring = results[4];
            const loadedCategories = results[5];
            const processingResult = results[6];

            setTransactions(loadedTransactions);
            setBudgets(loadedBudgets);
            setBudgetPeriods(loadedPeriods);
            setRecurringTransactions(loadedRecurring);
            setCustomCategories(loadedCategories);
            if (savedCurrency) setCurrency(savedCurrency);

            // Set default period to the latest one if not already set or if it's 'all' and we want a default
            if (loadedPeriods.length > 0 && (dashboardPeriodFilter === 'all' || !loadedPeriods.find(p => p.id === dashboardPeriodFilter))) {
                const sortedPeriods = [...loadedPeriods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
                setDashboardPeriodFilter(sortedPeriods[0].id);
            }

            if (processingResult.generatedCount > 0) {
                addNotification(processingResult.message, 'success');
                // Reload transactions to show the new ones
                const updatedTransactions = await getTransactions();
                setTransactions(updatedTransactions);
            }

        } catch (error: any) {
            console.error("Error loading data:", error);
            addNotification(`Could not load data: ${error.message}`, "error");
        }
    }, [session, addNotification]);

    const handleSetCurrency = async (newCurrency: string) => {
        setCurrency(newCurrency);
        await setSetting('currency', newCurrency);
        addNotification(`Currency set to ${newCurrency}`, 'success');
    };

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session, loadData]);

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

    const { periodIncome, periodExpenses, periodNet, periodTransfers } = useMemo(() => {
        const income = dashboardTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = dashboardTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const transfers = dashboardTransactions.filter(t => t.type === 'transfer').reduce((sum, t) => sum + t.amount, 0);

        return {
            periodIncome: income,
            periodExpenses: expenses,
            periodTransfers: transfers,
            periodNet: income - expenses - transfers
        };
    }, [dashboardTransactions]);

    const totalBalance = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const transfers = transactions.filter(t => t.type === 'transfer').reduce((sum, t) => sum + t.amount, 0);
        // Assuming 'transfer' is outgoing from the tracked balance to an external account/goal
        return income - expenses - transfers;
    }, [transactions]);

    const savingsRate = useMemo(() => {
        if (periodIncome === 0) return 0;
        // In the new system, transfers are deductions from the main account.
        // Net savings is essentially what's left after expenses and transfers, 
        // unless we want to count certain transfers as 'savings' themselves.
        // For simplicity, let's follow the user's lead: periodNet is what remains.
        return Math.max(0, (periodNet / periodIncome) * 100);
    }, [periodIncome, periodNet]);

    const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>, shouldClose: boolean = true) => {
        try {
            const newTransaction = await addTransaction(transaction);
            setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            if (shouldClose) {
                setActiveModal(null);
            }
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

    const handleUpdateTransaction = async (id: number, updates: Partial<Omit<Transaction, 'id'>>) => {
        try {
            const updatedTransaction = await updateTransaction(id, updates);
            setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));
            addNotification('Transaction updated successfully!', 'success');
        } catch (error: any) {
            addNotification(error.message, 'error');
        }
    };

    const handleSavePeriod = async (period: Omit<BudgetPeriod, 'id'> & { id: number | 'new' }, budgetsToSave: { category: string, amount: number, subItems?: { name: string; amount: number }[] }[]) => {
        if (period.id === 'new') {
            const newPeriod = await addBudgetPeriod({ name: period.name, startDate: period.startDate, endDate: period.endDate });
            await saveBudgets(newPeriod.id, budgetsToSave);
        } else {
            await updateBudgetPeriod(period as BudgetPeriod);
            await saveBudgets(period.id, budgetsToSave);
        }
        addNotification('Budget period saved to database!', 'success');
        await loadData();
    };

    const handleDeletePeriod = async (id: number) => {
        await deleteBudgetPeriod(id);
        addNotification('Budget period deleted from database.', 'info');
        await loadData();
    };

    const handleSaveRecurring = async (transaction: Omit<RecurringTransaction, 'id'>) => {
        try {
            await addRecurringTransaction(transaction);
            await loadData();
            addNotification('Recurring transaction saved!', 'success');
        } catch (error: any) {
            addNotification(error.message, 'error');
        }
    };

    const handleUpdateRecurring = async (id: number, transaction: Partial<RecurringTransaction>) => {
        try {
            await updateRecurringTransaction(id, transaction);
            await loadData();
            addNotification('Recurring transaction updated!', 'success');
        } catch (error: any) {
            addNotification(error.message, 'error');
        }
    };

    const handleDeleteRecurring = async (id: number) => {
        try {
            await deleteRecurringTransaction(id);
            await loadData();
            addNotification('Recurring transaction deleted.', 'info');
        } catch (error: any) {
            addNotification(error.message, 'error');
        }
    };

    const startingBalance = useMemo(() => {
        if (dashboardPeriodFilter === 'all') {
            return 0;
        }
        const period = budgetPeriods.find(p => p.id === dashboardPeriodFilter);
        if (!period) return 0;

        const periodStartD = new Date(period.startDate + 'T00:00:00');
        const periodEndD = new Date(period.endDate + 'T23:59:59');

        // Find encompassing periods (where current period falls within)
        const encompassingPeriods = budgetPeriods.filter(p => {
            const start = new Date(p.startDate + 'T00:00:00');
            const end = new Date(p.endDate + 'T23:59:59');
            return start <= periodStartD && end >= periodEndD;
        });

        // Use the earliest start date of encompassing periods
        const earliestStartD = encompassingPeriods.reduce((earliest, p) => {
            const start = new Date(p.startDate + 'T00:00:00');
            return start < earliest ? start : earliest;
        }, periodStartD);

        return transactions
            .filter(t => {
                const tDate = new Date(t.date + 'T00:00:00');
                return tDate >= earliestStartD && tDate < periodStartD;
            })
            .reduce((acc, t) => {
                if (t.type === 'income') return acc + t.amount;
                if (t.type === 'expense' || t.type === 'transfer') return acc - t.amount;
                return acc;
            }, 0);

    }, [transactions, budgetPeriods, dashboardPeriodFilter]);

    const chartData = useMemo(() => {
        if (dashboardTransactions.length === 0 && dashboardPeriodFilter === 'all') return [];

        const sorted = [...dashboardTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let runningBalance = startingBalance;
        const data = sorted.map(t => {
            if (t.type === 'income') runningBalance += t.amount;
            else if (t.type === 'expense' || t.type === 'transfer') runningBalance -= t.amount;

            return {
                date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                balance: runningBalance
            };
        });
        return [{ date: 'Start', balance: startingBalance }, ...data];
    }, [dashboardTransactions, startingBalance, dashboardPeriodFilter]);

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
        customCategories.filter(c => c.type === 'expense').forEach(c => categories.add(c.name));
        return Array.from(categories).sort();
    }, [transactions, budgets, customCategories]);

    const activeBudgetCategories = useMemo(() => {
        const categories = new Set<string>();
        budgets.forEach(b => categories.add(b.category));
        categories.add('Other');
        return Array.from(categories).sort();
    }, [budgets]);

    const budgetDisplayPeriodId = useMemo(() => {
        if (typeof dashboardPeriodFilter === 'number') {
            return dashboardPeriodFilter;
        }
        if (budgetPeriods.length > 0) {
            // Default to the latest period
            const sortedPeriods = [...budgetPeriods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            return sortedPeriods[0].id;
        }
        return null;
    }, [dashboardPeriodFilter, budgetPeriods]);

    const budgetDisplayPeriod = useMemo(() => {
        if (!budgetDisplayPeriodId) return null;
        return budgetPeriods.find(p => p.id === budgetDisplayPeriodId);
    }, [budgetDisplayPeriodId, budgetPeriods]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setTransactions([]);
        setBudgets([]);
        setBudgetPeriods([]);
        setRecurringTransactions([]);
        setCustomCategories([]);
        setNotifications([]);
        setInsight(null);
        setView('dashboard');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-text-primary flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-text-secondary">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-background text-text-primary relative">
                <BackgroundShapes />
                <div className="relative z-10">
                    <Auth />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-primary relative">
            <BackgroundShapes />

            <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
                <Header
                    onSignOut={handleSignOut}
                    onRecurring={() => setView('recurring')}
                    onImportExport={() => setActiveModal('import-export')}
                    onCategories={() => setActiveModal('categories')}
                    onGetInsight={handleGetInsight}
                    onViewAllTransactions={() => setView('transactions')}
                    onWishLists={() => setView('wish-list')}
                    isInsightLoading={isInsightLoading}
                />

                {view === 'dashboard' && (
                    <DashboardView
                        transactions={dashboardTransactions}
                        budgets={budgets}
                        budgetPeriods={budgetPeriods}
                        dashboardPeriodFilter={dashboardPeriodFilter}
                        setDashboardPeriodFilter={setDashboardPeriodFilter}
                        currency={currency}
                        handleSetCurrency={handleSetCurrency}
                        periodIncome={periodIncome}
                        periodExpenses={periodExpenses}
                        periodNet={periodNet}
                        startingBalance={startingBalance}
                        totalBalance={totalBalance}
                        savingsRate={savingsRate}
                        formatCurrency={formatCurrency}
                        setActiveModal={setActiveModal}
                        setView={setView}
                        handleDeleteTransaction={handleDeleteTransaction}
                        isBalanceTrendModalOpen={isBalanceTrendModalOpen}
                        setIsBalanceTrendModalOpen={setIsBalanceTrendModalOpen}
                        chartData={chartData}
                        spendingByCategory={spendingByCategory}
                        budgetDisplayPeriod={budgetDisplayPeriod}
                        handleAddTransaction={handleAddTransaction}
                    />
                )}

                {view === 'budgets' && (
                    <BudgetManagementView
                        onClose={() => setView('dashboard')}
                        budgetPeriods={budgetPeriods}
                        budgets={budgets}
                        transactions={transactions}
                        formatCurrency={formatCurrency}
                        allCategories={allExpenseCategories}
                        addNotification={addNotification}
                        onSavePeriod={handleSavePeriod}
                        onDeletePeriod={handleDeletePeriod}
                    />
                )}

                {view === 'transactions' && (
                    <AllTransactionsView
                        onClose={() => setView('dashboard')}
                        transactions={transactions}
                        budgetPeriods={budgetPeriods}
                        budgets={budgets}
                        customCategories={customCategories}
                        allCategories={allExpenseCategories}
                        onDeleteTransaction={handleDeleteTransaction}
                        onUpdateTransaction={handleUpdateTransaction}
                        formatCurrency={formatCurrency}
                    />
                )}

                {view === 'recurring' && (
                    <RecurringTransactionsView
                        onClose={() => setView('dashboard')}
                        recurringTransactions={recurringTransactions}
                        onSaveRecurring={handleSaveRecurring}
                        onUpdateRecurring={handleUpdateRecurring}
                        onDeleteRecurring={handleDeleteRecurring}
                        expenseCategories={activeBudgetCategories}
                        formatCurrency={formatCurrency}
                    />
                )}

                {view === 'wish-list' && (
                    <ShoppingListView
                        onNavigate={(nextView, listId) => {
                            if (listId) setSelectedListId(listId);
                            setView(nextView);
                        }}
                        formatCurrency={formatCurrency}
                    />
                )}

                {view === 'wish-list-detail' && selectedListId && (
                    <ShoppingListDetailView
                        listId={selectedListId}
                        onBack={() => setView('wish-list')}
                        formatCurrency={formatCurrency}
                        budgets={budgets}
                        budgetPeriods={budgetPeriods}
                    />
                )}
            </div>

            <TransactionFormModal
                isOpen={activeModal === 'income' || activeModal === 'expense' || activeModal === 'transfer'}
                onClose={() => setActiveModal(null)}
                type={activeModal === 'income' ? 'income' : activeModal === 'expense' ? 'expense' : activeModal === 'transfer' ? 'transfer' : null}
                onSubmit={handleAddTransaction}
                expenseCategories={activeBudgetCategories}
                customCategories={customCategories}
                budgets={budgets}
                budgetPeriods={budgetPeriods}
            />

            <RecurringTransactionModal
                isOpen={activeModal === 'recurring'}
                onClose={() => setActiveModal(null)}
                onSave={handleSaveRecurring}
                expenseCategories={activeBudgetCategories}
            />

            <ImportExportModal
                isOpen={activeModal === 'import-export'}
                onClose={() => setActiveModal(null)}
                onImportComplete={loadData}
                addNotification={addNotification}
            />

            <CategoryManagement
                isOpen={activeModal === 'categories'}
                onClose={() => setActiveModal(null)}
                addNotification={addNotification}
            />

            <Modal isOpen={activeModal === 'insight'} onClose={() => setActiveModal(null)} title="AI Financial Insight">
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
        </div>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}
