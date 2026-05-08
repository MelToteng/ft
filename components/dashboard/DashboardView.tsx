import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, BudgetPeriod, BudgetItem } from '../../types';
import { Button, Icons, Modal } from '../../components/ui';
import { StatCard } from './StatCard';

const PIE_CHART_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6366F1'];

interface DashboardViewProps {
    transactions: Transaction[];
    budgets: BudgetItem[];
    budgetPeriods: BudgetPeriod[];
    dashboardPeriodFilter: number | 'all';
    setDashboardPeriodFilter: (value: number | 'all') => void;
    currency: string;
    handleSetCurrency: (currency: string) => void;
    periodIncome: number;
    periodExpenses: number;
    periodNet: number;
    startingBalance: number;
    totalBalance: number;
    savingsRate: number;
    formatCurrency: (value: number) => string;
    setActiveModal: (modal: string | null) => void;
    setView: (view: 'dashboard' | 'budgets' | 'transactions') => void;
    handleDeleteTransaction: (id: number) => void;
    isBalanceTrendModalOpen: boolean;
    setIsBalanceTrendModalOpen: (isOpen: boolean) => void;
    chartData: any[];
    spendingByCategory: any[];
    budgetDisplayPeriod: BudgetPeriod | null | undefined;
    handleAddTransaction?: (transaction: Omit<Transaction, 'id'>, shouldClose?: boolean) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    transactions,
    budgets,
    budgetPeriods,
    dashboardPeriodFilter,
    setDashboardPeriodFilter,
    currency,
    handleSetCurrency,
    periodIncome,
    periodExpenses,
    periodNet,
    startingBalance,
    totalBalance,
    savingsRate,
    formatCurrency,
    setActiveModal,
    setView,
    handleDeleteTransaction,
    isBalanceTrendModalOpen,
    setIsBalanceTrendModalOpen,
    chartData,
    spendingByCategory,
    budgetDisplayPeriod,
    handleAddTransaction
}) => {

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

    const transactionCounts = useMemo(() => {
        return {
            incomeCount: dashboardTransactions.filter(t => t.type === 'income').length,
            expenseCount: dashboardTransactions.filter(t => t.type === 'expense' || t.type === 'transfer').length,
        };
    }, [dashboardTransactions]);

    const [isBudgetProgressModalOpen, setIsBudgetProgressModalOpen] = React.useState(false);
    const [recentTransactionsView, setRecentTransactionsView] = React.useState<'recent' | 'top' | 'categories'>('recent');
    const [expandedBudgets, setExpandedBudgets] = React.useState<Set<string>>(new Set());
    const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null);
    const [selectedStatCard, setSelectedStatCard] = React.useState<{label: string, value: React.ReactNode, colorClass: string, description?: string} | null>(null);

    const toggleBudgetExpanded = (category: string) => {
        setExpandedBudgets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    // Calculate previous period stats for trends
    const previousPeriodStats = useMemo(() => {
        if (!budgetDisplayPeriod) return null;
        // Sort periods by date descending
        const sortedPeriods = [...budgetPeriods].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        const currentIndex = sortedPeriods.findIndex(p => p.id === budgetDisplayPeriod.id);
        // Get the next period in the sorted list (which is chronologically previous)
        const previousPeriod = currentIndex !== -1 && currentIndex < sortedPeriods.length - 1 ? sortedPeriods[currentIndex + 1] : null;

        if (!previousPeriod) return null;

        const start = new Date(previousPeriod.startDate + 'T00:00:00');
        const end = new Date(previousPeriod.endDate + 'T23:59:59');

        const prevTransactions = transactions.filter(t => {
            const d = new Date(t.date + 'T00:00:00');
            return d >= start && d <= end;
        });

        const income = prevTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = prevTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const net = income - expenses;

        return { income, expenses, net };
    }, [budgetDisplayPeriod, budgetPeriods, transactions]);

    const calculateTrend = (current: number, previous: number | undefined) => {
        if (previous === undefined || previous === 0) return undefined;
        const change = ((current - previous) / previous) * 100;
        return {
            value: Math.abs(change),
            direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
            label: 'vs last period'
        };
    };

    const topSpendingTransactions = useMemo(() => {
        return dashboardTransactions
            .filter(t => t.type === 'expense' || t.type === 'transfer')
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);
    }, [dashboardTransactions]);
    const categorySpending = useMemo(() => {
        const spending: Record<string, number> = {};
        dashboardTransactions
            .filter(t => t.type === 'expense' || t.type === 'transfer')
            .forEach(t => {
                spending[t.category] = (spending[t.category] || 0) + t.amount;
            });
        return Object.entries(spending).map(([name, amount]) => ({ name, amount }));
    }, [dashboardTransactions]);

    // Calculate top spending by budget categories (top 3)
    const topCategoriesSpending = useMemo(() => {
        if (!budgetDisplayPeriod) return [];

        const currentPeriodBudgets = budgets.filter(b => b.budgetPeriodId === budgetDisplayPeriod.id);
        const periodStart = new Date(budgetDisplayPeriod.startDate + 'T00:00:00');
        const periodEnd = new Date(budgetDisplayPeriod.endDate + 'T23:59:59');

        return currentPeriodBudgets.map(budget => {
            const spent = transactions
                .filter(t => t.category === budget.category && t.type === 'expense')
                .filter(t => {
                    const transactionDate = new Date(t.date + 'T00:00:00');
                    return transactionDate >= periodStart && transactionDate <= periodEnd;
                })
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                category: budget.category,
                budgeted: budget.amount,
                spent,
                remaining: budget.amount - spent,
                percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0
            };
        }).sort((a, b) => b.spent - a.spent).slice(0, 3);
    }, [budgetDisplayPeriod, budgets, transactions]);

    // Calculate budget health and remaining
    const budgetStats = useMemo(() => {
        if (!budgetDisplayPeriod) return null;

        const totalBudget = budgets
            .filter(b => b.budgetPeriodId === budgetDisplayPeriod.id)
            .reduce((sum, b) => sum + b.amount, 0);

        const periodStart = new Date(budgetDisplayPeriod.startDate + 'T00:00:00');
        const periodEnd = new Date(budgetDisplayPeriod.endDate + 'T23:59:59');

        const currentPeriodBudgets = budgets.filter(b => b.budgetPeriodId === budgetDisplayPeriod.id);
        const budgetedCategories = new Set(currentPeriodBudgets.map(b => b.category));

        const periodExpensesInBudget = transactions
            .filter(t => t.type === 'expense' && budgetedCategories.has(t.category))
            .filter(t => {
                const d = new Date(t.date + 'T00:00:00');
                return d >= periodStart && d <= periodEnd;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const remaining = totalBudget - periodExpensesInBudget;
        const percentageSpent = totalBudget > 0 ? (periodExpensesInBudget / totalBudget) * 100 : 0;

        let status: 'success' | 'warning' | 'danger' = 'success';
        if (percentageSpent > 100) status = 'danger';
        else if (percentageSpent >= 85) status = 'warning';

        return {
            totalBudget,
            spent: periodExpensesInBudget,
            remaining,
            percentageSpent,
            status
        };
    }, [budgetDisplayPeriod, budgets, transactions]);

    const transferTotal = useMemo(() => {
        return dashboardTransactions
            .filter(t => t.type === 'transfer')
            .reduce((sum, t) => sum + t.amount, 0);
    }, [dashboardTransactions]);

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 animate-fade-in gap-3">
                {/* Action buttons: icon-only + tooltip on mobile, icon+text on md+ */}
                <div className="flex justify-center md:justify-start flex-wrap gap-3 w-full md:w-auto">

                    {/* Add Expense */}
                    <div
                        className="relative"
                        onMouseEnter={() => setActiveTooltip('expense')}
                        onMouseLeave={() => setActiveTooltip(null)}
                    >
                        <Button variant="primary" onClick={() => setActiveModal('expense')}>
                            <Icons.TrendingDown />
                            <span className="hidden md:inline">Add Expense</span>
                        </Button>
                        {activeTooltip === 'expense' && (
                            <span className="md:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium bg-surface-light border border-border rounded-lg whitespace-nowrap z-50 shadow-custom">
                                Add Expense
                            </span>
                        )}
                    </div>

                    {/* Add Income */}
                    <div
                        className="relative"
                        onMouseEnter={() => setActiveTooltip('income')}
                        onMouseLeave={() => setActiveTooltip(null)}
                    >
                        <Button variant="secondary" onClick={() => setActiveModal('income')}>
                            <Icons.TrendingUp />
                            <span className="hidden md:inline">Add Income</span>
                        </Button>
                        {activeTooltip === 'income' && (
                            <span className="md:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium bg-surface-light border border-border rounded-lg whitespace-nowrap z-50 shadow-custom">
                                Add Income
                            </span>
                        )}
                    </div>

                    {/* Add Transfer */}
                    <div
                        className="relative"
                        onMouseEnter={() => setActiveTooltip('transfer')}
                        onMouseLeave={() => setActiveTooltip(null)}
                    >
                        <Button variant="secondary" onClick={() => setActiveModal('transfer')}>
                            <Icons.ArrowLeftRight />
                            <span className="hidden md:inline">Add Transfer</span>
                        </Button>
                        {activeTooltip === 'transfer' && (
                            <span className="md:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium bg-surface-light border border-border rounded-lg whitespace-nowrap z-50 shadow-custom">
                                Add Transfer
                            </span>
                        )}
                    </div>

                    {/* Budget Planner */}
                    <div
                        className="relative"
                        onMouseEnter={() => setActiveTooltip('budgets')}
                        onMouseLeave={() => setActiveTooltip(null)}
                    >
                        <Button variant="secondary" onClick={() => setView('budgets')}>
                            <Icons.Chart />
                            <span className="hidden md:inline">Budget Planner</span>
                        </Button>
                        {activeTooltip === 'budgets' && (
                            <span className="md:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs font-medium bg-surface-light border border-border rounded-lg whitespace-nowrap z-50 shadow-custom">
                                Budget Planner
                            </span>
                        )}
                    </div>

                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={dashboardPeriodFilter}
                        onChange={(e) => setDashboardPeriodFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="bg-surface-light border border-border rounded-xl px-2 md:px-4 py-1.5 md:py-2 text-text-primary text-xs md:text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors flex-1 md:flex-none"
                    >
                        <option value="all">All Time</option>
                        {budgetPeriods.map(period => (
                            <option key={period.id} value={period.id}>{period.name}</option>
                        ))}
                    </select>
                    <select
                        value={currency}
                        onChange={e => handleSetCurrency(e.target.value)}
                        className="bg-surface-light border border-border rounded-xl px-2 md:px-4 py-1.5 md:py-2 text-text-primary text-xs md:text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors flex-1 md:flex-none"
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


            <section className="grid grid-cols-3 gap-2 md:gap-6 mb-8 md:mb-12 animate-fade-in sticky top-2 z-50 bg-background/95 backdrop-blur-xl py-4 -mx-4 px-4">
                <StatCard
                    label="Total Budgeted"
                    value={formatCurrency(budgetStats?.totalBudget || 0)}
                    colorClass="bg-primary"
                    description="Total amount allocated for the current period."
                    onClick={() => setSelectedStatCard({
                        label: "Total Budgeted",
                        value: formatCurrency(budgetStats?.totalBudget || 0),
                        colorClass: "bg-primary",
                        description: "Total amount allocated for the current period."
                    })}
                />
                <StatCard
                    label="Total Spent"
                    value={formatCurrency(budgetStats?.spent || 0)}
                    colorClass={budgetStats?.status === 'danger' ? 'bg-danger' : 'bg-warning'}
                    description="Total amount spent in budgeted categories."
                    onClick={() => setSelectedStatCard({
                        label: "Total Spent",
                        value: formatCurrency(budgetStats?.spent || 0),
                        colorClass: budgetStats?.status === 'danger' ? 'bg-danger' : 'bg-warning',
                        description: "Total amount spent in budgeted categories."
                    })}
                />
                <StatCard
                    label="Budget Remaining"
                    value={formatCurrency(budgetStats?.remaining || 0)}
                    colorClass={budgetStats?.status === 'danger' ? 'bg-danger' : budgetStats?.status === 'warning' ? 'bg-warning' : 'bg-success'}
                    description="Total budgeted amount minus expenses."
                    onClick={() => setSelectedStatCard({
                        label: "Budget Remaining",
                        value: formatCurrency(budgetStats?.remaining || 0),
                        colorClass: budgetStats?.status === 'danger' ? 'bg-danger' : budgetStats?.status === 'warning' ? 'bg-warning' : 'bg-success',
                        description: "Total budgeted amount minus expenses."
                    })}
                />
            </section>

            <Modal isOpen={!!selectedStatCard} onClose={() => setSelectedStatCard(null)} title={selectedStatCard?.label || ''}>
                {selectedStatCard && (
                    <div className="p-4 space-y-6">
                        <div className={`text-4xl md:text-6xl font-bold ${selectedStatCard.colorClass.replace('bg-', 'text-')}`}>
                            {selectedStatCard.value}
                        </div>
                        <p className="text-lg text-text-secondary leading-relaxed">
                            {selectedStatCard.description}
                        </p>
                        {selectedStatCard.label === "Budget Remaining" && budgetStats && (
                             <div className="flex flex-col gap-2 mt-4 p-4 bg-surface-light rounded-2xl">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-text-muted">Budget Utilization:</span>
                                    <span className={`font-bold ${budgetStats.status === 'danger' ? 'text-danger' : 'text-success'}`}>
                                        {budgetStats.percentageSpent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${budgetStats.status === 'danger' ? 'bg-danger' : budgetStats.status === 'warning' ? 'bg-warning' : 'bg-primary'}`}
                                        style={{ width: `${Math.min(budgetStats.percentageSpent, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <section className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border mb-12">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-bold">Budget Checklist</h3>
                        <p className="text-sm text-text-muted mt-1">Track your progress and mark items as paid.</p>
                    </div>
                </div>

                {budgetDisplayPeriod ? (
                    <div className="space-y-4">
                        {budgets.filter(b => b.budgetPeriodId === budgetDisplayPeriod.id).map(budget => {
                            const periodStart = new Date(budgetDisplayPeriod.startDate + 'T00:00:00');
                            const periodEnd = new Date(budgetDisplayPeriod.endDate + 'T23:59:59');
                            const spent = transactions
                                .filter(t => t.category === budget.category && t.type === 'expense')
                                .filter(t => {
                                    const transactionDate = new Date(t.date + 'T00:00:00');
                                    return transactionDate >= periodStart && transactionDate <= periodEnd;
                                })
                                .reduce((sum, t) => sum + t.amount, 0);

                            const remaining = budget.amount - spent;
                            const isPaid = remaining <= 0;
                            const trueProgressPercentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                            const isOverBudget = trueProgressPercentage > 100;
                            const isWarning = trueProgressPercentage >= 85 && trueProgressPercentage <= 100;
                            const progressColorClass = isOverBudget ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-success';
                            const rowBaseClass = isOverBudget ? 'bg-danger/10 border-danger/30' : (isPaid ? 'bg-surface-light/30 border-warning/30 opacity-75' : 'bg-surface border-border hover:border-primary/50');
                            
                            const isExpanded = expandedBudgets.has(budget.category);
                            const hasSubItems = budget.subItems && budget.subItems.length > 0;

                            return (
                                <div key={budget.category} className={`p-4 rounded-2xl border transition-all ${rowBaseClass}`}>
                                    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${hasSubItems ? 'cursor-pointer' : ''}`} onClick={() => hasSubItems && toggleBudgetExpanded(budget.category)}>
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Checkbox-like button */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!isPaid && handleAddTransaction) {
                                                        handleAddTransaction({
                                                            type: 'expense',
                                                            amount: remaining,
                                                            category: budget.category,
                                                            description: `${budget.category} Payment`,
                                                            date: new Date().toISOString().split('T')[0]
                                                        }, false);
                                                    }
                                                }}
                                                disabled={isPaid}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isPaid ? (isOverBudget ? 'bg-danger text-white' : 'bg-warning text-white') : 'bg-surface-light border-2 border-border hover:border-primary text-transparent hover:text-primary/20'}`}
                                            >
                                                <Icons.Check className="w-5 h-5" />
                                            </button>
                                            
                                            <div className="flex-1">
                                                <h4 className={`font-bold text-lg flex items-center gap-2 ${isPaid ? 'line-through text-text-muted' : ''}`}>
                                                    {budget.category}
                                                    {hasSubItems && (
                                                        <Icons.ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    )}
                                                </h4>
                                                <div className="w-full bg-surface-light rounded-full h-1.5 mt-2 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all ${progressColorClass}`} 
                                                        style={{ width: `${Math.min(trueProgressPercentage, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 md:gap-6 justify-between w-full md:w-auto md:justify-end md:min-w-[250px] mt-2 md:mt-0 pt-3 md:pt-0 border-t border-border/30 md:border-t-0 overflow-hidden">
                                            <div className="text-center md:text-right flex-1 md:flex-none min-w-0">
                                                <p className="text-[10px] md:text-xs text-text-muted uppercase tracking-wider mb-1 truncate">Spent</p>
                                                <p className="font-semibold text-[11px] sm:text-sm md:text-base truncate">{formatCurrency(spent)}</p>
                                            </div>
                                            <div className="text-center md:text-right flex-1 md:flex-none min-w-0">
                                                <p className="text-[10px] md:text-xs text-text-muted uppercase tracking-wider mb-1 truncate">Budget</p>
                                                <p className="font-semibold text-[11px] sm:text-sm md:text-base truncate">{formatCurrency(budget.amount)}</p>
                                            </div>
                                            <div className="text-center md:text-right flex-1 md:flex-none min-w-0">
                                                <p className="text-[10px] md:text-xs text-text-muted uppercase tracking-wider mb-1 truncate">Remaining</p>
                                                <p className={`font-bold text-[11px] sm:text-sm md:text-base truncate ${isPaid ? 'text-success' : 'text-primary'}`}>{formatCurrency(Math.max(0, remaining))}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && hasSubItems && (
                                        <div className="mt-4 pt-4 border-t border-border/50 md:pl-12 space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
                                            {budget.subItems!.map(sub => {
                                                const subSpent = transactions
                                                    .filter(t => t.category === budget.category && t.type === 'expense' && t.budget_sub_item_id === sub.id)
                                                    .filter(t => {
                                                        const transactionDate = new Date(t.date + 'T00:00:00');
                                                        return transactionDate >= periodStart && transactionDate <= periodEnd;
                                                    })
                                                    .reduce((sum, t) => sum + t.amount, 0);

                                                const subRemaining = sub.amount - subSpent;
                                                const isSubPaid = subRemaining <= 0;
                                                const trueSubProgress = sub.amount > 0 ? (subSpent / sub.amount) * 100 : 0;
                                                const subOverBudget = trueSubProgress > 100;
                                                const subWarning = trueSubProgress >= 85 && trueSubProgress <= 100;
                                                const subProgressColorClass = subOverBudget ? 'bg-danger' : subWarning ? 'bg-warning' : 'bg-success';

                                                return (
                                                    <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-light/20 rounded-xl border border-border/30">
                                                        <div className="flex items-center gap-3 flex-1 w-full">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!isSubPaid && handleAddTransaction) {
                                                                        handleAddTransaction({
                                                                            type: 'expense',
                                                                            amount: subRemaining,
                                                                            category: budget.category,
                                                                            description: `${sub.name} Payment`,
                                                                            date: new Date().toISOString().split('T')[0],
                                                                            budget_sub_item_id: sub.id
                                                                        }, false);
                                                                    }
                                                                }}
                                                                disabled={isSubPaid}
                                                                className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ${isSubPaid ? (subOverBudget ? 'bg-danger text-white' : 'bg-warning text-white') : 'bg-surface border border-border hover:border-primary text-transparent hover:text-primary/20'}`}
                                                            >
                                                                <Icons.Check className="w-3 h-3" />
                                                            </button>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-medium text-sm truncate ${isSubPaid ? 'line-through text-text-muted' : ''}`}>{sub.name}</p>
                                                                <div className="w-full bg-surface-light rounded-full h-1 mt-1.5 overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full transition-all ${subProgressColorClass}`} 
                                                                        style={{ width: `${Math.min(trueSubProgress, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[11px] w-full sm:w-auto sm:min-w-[150px] justify-between sm:justify-end pl-9 sm:pl-0 mt-1 sm:mt-0 border-t sm:border-none border-border/30 pt-2 sm:pt-0 overflow-hidden">
                                                            <div className="text-left sm:text-right flex-1 sm:flex-none min-w-0">
                                                                <p className="text-[10px] text-text-muted uppercase tracking-wider truncate">Spent</p>
                                                                <p className="font-semibold truncate">{formatCurrency(subSpent)}</p>
                                                            </div>
                                                            <div className="text-right flex-1 sm:flex-none min-w-0">
                                                                <p className="text-[10px] text-text-muted uppercase tracking-wider truncate">Budget</p>
                                                                <p className="font-semibold truncate">{formatCurrency(sub.amount)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {budgets.filter(b => b.budgetPeriodId === budgetDisplayPeriod.id).length === 0 && (
                            <div className="text-center py-10 text-text-muted">
                                <p>No budget items for this period.</p>
                                <Button variant="secondary" onClick={() => setView('budgets')} className="mt-4">
                                    Create a Budget
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 text-text-muted">
                        <p>No budget period selected.</p>
                    </div>
                )}
            </section>

            <Modal isOpen={isBalanceTrendModalOpen} onClose={() => setIsBalanceTrendModalOpen(false)} title="Balance Trend" className="max-w-4xl">
                <div className="h-[60vh] p-4">
                    {chartData.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorBalanceModal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#71717A" tick={{ fontSize: 12 }} dy={10} />
                                <YAxis stroke="#71717A" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                                <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #27272A', borderRadius: '1rem' }} />
                                <Area type="monotone" dataKey="balance" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorBalanceModal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-text-muted">Not enough data to display trend.</div>}
                </div>
            </Modal>

            {/* Budget Progress Modal */}
            <Modal isOpen={isBudgetProgressModalOpen} onClose={() => setIsBudgetProgressModalOpen(false)} title={`Budget Progress${budgetDisplayPeriod ? ` - ${budgetDisplayPeriod.name}` : ''}`} className="max-w-2xl">
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                    {(() => {
                        if (!budgetDisplayPeriod) {
                            return <div className="text-center py-10 text-text-muted">Create a budget period to track progress.</div>;
                        }

                        const currentPeriodBudgets = budgets.filter(b => b.budgetPeriodId === budgetDisplayPeriod.id);
                        if (currentPeriodBudgets.length === 0) {
                            return <div className="text-center py-10 text-text-muted">Set budgets for {budgetDisplayPeriod.name}.</div>;
                        }

                        const periodStart = new Date(budgetDisplayPeriod.startDate + 'T00:00:00');
                        const periodEnd = new Date(budgetDisplayPeriod.endDate + 'T23:59:59');

                        // Calculate totals
                        let totalBudgeted = 0;
                        let totalExpenses = 0;
                        let totalRemaining = 0;
                        let unspentBudget = 0;

                        const periodTransfersAmount = transactions
                            .filter(t => t.type === 'transfer')
                            .filter(t => {
                                const d = new Date(t.date + 'T00:00:00');
                                return d >= periodStart && d <= periodEnd;
                            })
                            .reduce((sum, t) => sum + t.amount, 0);

                        const budgetData = currentPeriodBudgets.map((budget) => {
                            const spent = transactions
                                .filter(t => t.category === budget.category && t.type === 'expense')
                                .filter(t => {
                                    const transactionDate = new Date(t.date + 'T00:00:00');
                                    return transactionDate >= periodStart && transactionDate <= periodEnd;
                                })
                                .reduce((sum, t) => sum + t.amount, 0);

                            const remaining = budget.amount - spent;
                            const percentage = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;

                            totalBudgeted += budget.amount;
                            totalExpenses += spent;
                            totalRemaining += remaining;
                            if (remaining > 0) {
                                unspentBudget += remaining;
                            }

                            return { budget, spent, remaining, percentage };
                        });

                        return (
                            <>
                                <div className="space-y-4 mb-6">
                                    {budgetData.map(({ budget, spent, remaining, percentage }) => {
                                        const progressClass = percentage >= 100 ? 'bg-danger' : percentage > 70 ? 'bg-warning' : 'bg-success';
                                        const remainingClass = remaining < 0 ? 'text-danger' : remaining < (budget.amount * 0.1) ? 'text-danger' : remaining < (budget.amount * 0.3) ? 'text-warning' : 'text-success';

                                        return (
                                            <div key={budget.category}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-semibold">{budget.category}</span>
                                                    <div className="text-right">
                                                        <span className="text-text-muted">{formatCurrency(spent)} / {formatCurrency(budget.amount)}</span>
                                                        <span className={`ml-2 text-xs font-medium ${remainingClass}`}>
                                                            ({remaining >= 0 ? 'Rem: ' : 'Over: '}{formatCurrency(Math.abs(remaining))})
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-surface-light rounded-full h-2.5">
                                                    <div className={`${progressClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Totals Section */}
                                <div className="border-t border-border pt-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">Budgeted / Total Deducted</span>
                                        <span className="text-sm font-medium">
                                            <span className="text-text-primary">{formatCurrency(totalBudgeted)}</span>
                                            <span className="text-text-muted mx-1">/</span>
                                            <span className={(totalExpenses + periodTransfersAmount) >= totalBudgeted ? 'text-danger' : (totalExpenses + periodTransfersAmount) > totalBudgeted * 0.7 ? 'text-warning' : 'text-success'}>
                                                {formatCurrency(totalExpenses + periodTransfersAmount)}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">Actual Remaining (Budget)</span>
                                        <span className={`text-sm font-medium ${totalRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {formatCurrency(totalRemaining)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">Unspent (Period Net)</span>
                                        <span className={`text-sm font-medium ${periodNet >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {formatCurrency(periodNet)}
                                        </span>
                                    </div>
                                    {transferTotal > 0 && (
                                        <div className="text-[10px] text-text-muted italic text-right">
                                            * Transfers ({formatCurrency(transferTotal)}) already deducted from Unspent
                                        </div>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </div>
            </Modal>
        </>
    );
};
