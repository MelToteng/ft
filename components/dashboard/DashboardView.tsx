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
    budgetDisplayPeriod
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
        const incomeCount = dashboardTransactions.filter(t => t.type === 'income').length;
        const expenseCount = dashboardTransactions.filter(t => t.type === 'expense').length;
        return { incomeCount, expenseCount };
    }, [dashboardTransactions]);

    const [isBudgetProgressModalOpen, setIsBudgetProgressModalOpen] = React.useState(false);
    const [recentTransactionsView, setRecentTransactionsView] = React.useState<'recent' | 'top' | 'categories'>('recent');

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
            .filter(t => t.type === 'expense')
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);
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

    // Calculate velocity stats for budget health
    const velocityStats = useMemo(() => {
        if (!budgetDisplayPeriod) return null;

        const start = new Date(budgetDisplayPeriod.startDate + 'T00:00:00');
        const end = new Date(budgetDisplayPeriod.endDate + 'T23:59:59');
        const now = new Date();

        if (now < start) return null;

        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.min(Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), totalDays);
        const effectiveDays = Math.max(1, daysPassed);

        const dailyAverage = periodExpenses / effectiveDays;
        const projectedSpend = dailyAverage * totalDays;

        // Runway (Days Left at current rate) - only relevant if balance > 0
        const runway = dailyAverage > 0 ? totalBalance / dailyAverage : 0;

        const totalBudget = budgets
            .filter(b => b.budgetPeriodId === budgetDisplayPeriod.id)
            .reduce((sum, b) => sum + b.amount, 0);

        const percentageOfBudget = totalBudget > 0 ? ((projectedSpend / totalBudget) * 100) - 100 : 0;

        // Calculate overspent amount
        const periodTransactions = transactions.filter(t => {
            const d = new Date(t.date + 'T00:00:00');
            return d >= start && d <= end;
        });

        const currentPeriodBudgets = budgets.filter(b => b.budgetPeriodId === budgetDisplayPeriod.id);
        let totalOverspent = 0;

        currentPeriodBudgets.forEach(budget => {
            const spent = periodTransactions
                .filter(t => t.category === budget.category && t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            if (spent > budget.amount) {
                totalOverspent += (spent - budget.amount);
            }
        });

        const overspentPercentage = totalBudget > 0 ? (totalOverspent / totalBudget) * 100 : 0;

        // Projected Savings Rate = (Period Income - Projected Spend) / Period Income
        const projectedSavings = periodIncome - projectedSpend;
        const projectedSavingsRate = periodIncome > 0 ? Math.max(0, (projectedSavings / periodIncome) * 100) : 0;

        let status: 'on-track' | 'warning' | 'danger' = 'on-track';
        if (totalBudget > 0) {
            if (projectedSpend > totalBudget) status = 'danger';
            else if (projectedSpend > totalBudget * 0.9) status = 'warning';
        }

        return {
            dailyAverage,
            projectedSpend,
            totalBudget,
            percentageOfBudget,
            projectedPercentage: totalBudget > 0 ? (projectedSpend / totalBudget) * 100 : 0,
            status,
            runway,
            overspentPercentage,
            totalOverspent,
            projectedSavingsRate
        };
    }, [budgetDisplayPeriod, periodExpenses, budgets, totalBalance, transactions, periodIncome]);

    return (
        <>
            <div className="flex justify-between items-center mb-8 animate-fade-in">
                <div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Dashboard</h1>
                    <p className="text-text-muted">Welcome back to your financial overview.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="primary" onClick={() => setActiveModal('expense')}>
                        <Icons.Plus /> Add Expense
                    </Button>
                    <Button variant="primary" onClick={() => setActiveModal('income')}>
                        <Icons.Plus /> Add Income
                    </Button>
                    <Button variant="secondary" onClick={() => setView('budgets')}>
                        <Icons.Chart /> Budget Planner
                    </Button>
                    <select
                        value={dashboardPeriodFilter}
                        onChange={(e) => setDashboardPeriodFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                    >
                        <option value="all">All Time</option>
                        {budgetPeriods.map(period => (
                            <option key={period.id} value={period.id}>{period.name}</option>
                        ))}
                    </select>
                    <select
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
                {/* Conditionally show either Period Net OR Total Balance based on filter */}
                {dashboardPeriodFilter === 'all' ? (
                    <StatCard
                        label="Total Balance"
                        value={formatCurrency(totalBalance)}
                        colorClass={totalBalance >= 0 ? "bg-success" : "bg-danger"}
                        description="Your cumulative balance across all time (all income minus all expenses)."
                        subValue={
                            <div className="flex flex-col gap-1 mt-2 text-xs font-medium">
                                {velocityStats?.runway && velocityStats.runway > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-muted">Runway:</span>
                                        <span className="text-text-primary">{velocityStats.runway.toFixed(0)} days</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-text-muted">Savings Rate:</span>
                                    <span className={savingsRate >= 20 ? 'text-success' : savingsRate > 0 ? 'text-warning' : 'text-danger'}>
                                        {savingsRate.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        }
                    />
                ) : (
                    <StatCard
                        label="Period Net"
                        value={formatCurrency(periodNet)}
                        colorClass={periodNet >= 0 ? "bg-success" : "bg-danger"}
                        description="Net income minus expenses for this specific period only."
                        trend={calculateTrend(periodNet, previousPeriodStats?.net)}
                        subValue={
                            <div className="flex flex-col gap-1 mt-2 text-xs font-medium">
                                {velocityStats?.dailyAverage && velocityStats.dailyAverage > 0 && periodNet > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-muted">Runway:</span>
                                        <span className="text-text-primary">{(periodNet / velocityStats.dailyAverage).toFixed(0)} days</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-text-muted">Savings Rate:</span>
                                    <span className={savingsRate >= 20 ? 'text-success' : savingsRate > 0 ? 'text-warning' : 'text-danger'}>
                                        {savingsRate.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        }
                    />
                )}

                <StatCard
                    label="Total Income"
                    value={formatCurrency(periodIncome)}
                    colorClass="bg-primary"
                    description={`Sum of ${transactionCounts.incomeCount} income transactions in the selected period.`}
                    trend={calculateTrend(periodIncome, previousPeriodStats?.income)}
                />
                <StatCard
                    label="Total Expenses"
                    value={formatCurrency(periodExpenses)}
                    colorClass="bg-danger"
                    description={`Sum of ${transactionCounts.expenseCount} expense transactions in the selected period.`}
                    trend={calculateTrend(periodExpenses, previousPeriodStats?.expenses)}
                />

                <StatCard
                    label="Spending Velocity"
                    value={<span className="text-2xl">{velocityStats ? `${formatCurrency(velocityStats.dailyAverage)}/day` : '-'}</span>}
                    colorClass={velocityStats?.status === 'danger' ? 'bg-danger' : velocityStats?.status === 'warning' ? 'bg-warning' : 'bg-success'}
                    description="Daily average spending and projected outcome."
                    subValue={velocityStats ? (
                        <div className="flex flex-col gap-1 mt-2 text-xs font-medium">
                            <div className="flex justify-between items-center">
                                <span className="text-text-muted">Projected Spend:</span>
                                <span className={velocityStats.projectedPercentage > 100 ? 'text-danger' : 'text-success'}>
                                    {velocityStats.projectedPercentage.toFixed(0)}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-muted">Proj. Savings Rate:</span>
                                <span className={velocityStats.projectedSavingsRate >= 20 ? 'text-success' : velocityStats.projectedSavingsRate > 0 ? 'text-warning' : 'text-danger'}>
                                    {velocityStats.projectedSavingsRate.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    ) : undefined}
                />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                {/* Budget Health Card */}
                <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96 flex flex-col">
                    {velocityStats && budgetDisplayPeriod ? (
                        <div className="flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-medium text-text-muted mb-1">Budget Health</h3>
                                    <span className="text-xs text-text-muted">{budgetDisplayPeriod.name}</span>
                                </div>
                                <Button variant="ghost" onClick={() => setIsBudgetProgressModalOpen(true)} className="!py-1 !px-2 text-xs h-auto hover:bg-surface-light rounded-lg text-text-muted hover:text-text-primary">
                                    Details <Icons.ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                            </div>

                            <div className="flex-grow flex flex-col items-center justify-center">
                                <div className="mb-4">
                                    <span className={`text-3xl font-bold ${velocityStats.status === 'on-track' ? 'text-success' :
                                        velocityStats.status === 'warning' ? 'text-warning' : 'text-danger'
                                        }`}>
                                        {velocityStats.status === 'on-track' ? 'On Track' :
                                            velocityStats.status === 'warning' ? 'Warning' : 'Over Budget'}
                                    </span>
                                </div>

                                <div className="text-center mb-4">
                                    <div className="text-xs text-text-muted mb-1">Budget Shortfall</div>
                                    <span className={`text-2xl font-bold ${velocityStats.overspentPercentage > 0 ? 'text-danger' : 'text-success'
                                        }`}>
                                        {velocityStats.overspentPercentage.toFixed(1)}%
                                    </span>
                                </div>

                                <div className="w-full mb-4">
                                    <div className="w-full bg-surface rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${velocityStats.status === 'on-track' ? 'bg-success' :
                                                velocityStats.status === 'warning' ? 'bg-warning' : 'bg-danger'
                                                }`}
                                            style={{ width: `${Math.min(velocityStats.projectedPercentage, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <div className="bg-surface-light p-2 rounded-lg text-center">
                                        <div className="text-xs text-text-muted">Budget Total</div>
                                        <div className="text-sm font-bold">{formatCurrency(velocityStats.totalBudget)}</div>
                                    </div>
                                    <div className="bg-surface-light p-2 rounded-lg text-center">
                                        <div className="text-xs text-text-muted">Budget Shortfall</div>
                                        <div className="text-sm font-bold">{formatCurrency(velocityStats.totalOverspent)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-text-muted">
                                <div className="text-sm font-medium mb-1">Budget Health</div>
                                <div className="text-xs">Select a budget period</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Spending Breakdown</h3>
                        <Button variant="ghost" onClick={() => setIsBalanceTrendModalOpen(true)} className="!py-1 !px-3 text-xs">
                            <Icons.Chart className="w-4 h-4" /> View Trend
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
                                <Legend iconSize={10} wrapperStyle={{ bottom: 25, fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-text-muted">No expenses in this period.</div>}
                </div>

                <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96">
                    <div className="flex justify-between items-center mb-4">
                        <div className="bg-surface-light p-1 rounded-xl flex gap-1">
                            <button
                                onClick={() => setRecentTransactionsView('recent')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${recentTransactionsView === 'recent' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                            >
                                Recent
                            </button>
                            <button
                                onClick={() => setRecentTransactionsView('top')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${recentTransactionsView === 'top' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                            >
                                Top Spending
                            </button>
                            <button
                                onClick={() => setRecentTransactionsView('categories')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${recentTransactionsView === 'categories' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                            >
                                Top Categories
                            </button>
                        </div>
                        {recentTransactionsView === 'recent' && (
                            <Button variant="ghost" onClick={() => setView('transactions')} className="!py-1 !px-2 text-xs h-auto hover:bg-surface-light rounded-lg text-text-muted hover:text-text-primary">
                                View All <Icons.ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                        )}
                    </div>
                    <div className="space-y-3 h-[calc(100%-2.5rem)] overflow-y-auto pr-2">
                        {recentTransactionsView === 'categories' ? (
                            topCategoriesSpending.length > 0 ? (
                                topCategoriesSpending.map(cat => {
                                    const progressClass = cat.percentage >= 100 ? 'bg-danger' : cat.percentage > 70 ? 'bg-warning' : 'bg-success';
                                    const remainingClass = cat.remaining < 0 ? 'text-danger' : cat.remaining < (cat.budgeted * 0.3) ? 'text-warning' : 'text-success';

                                    return (
                                        <div key={cat.category} className="p-3 rounded-xl bg-surface-light/30">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="font-semibold">{cat.category}</p>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-danger">-{formatCurrency(cat.spent)}</p>
                                                    <p className="text-xs text-text-muted">of {formatCurrency(cat.budgeted)}</p>
                                                </div>
                                            </div>
                                            <div className="w-full bg-surface rounded-full h-1.5 mb-1">
                                                <div className={`${progressClass} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(cat.percentage, 100)}%` }}></div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className={remainingClass}>
                                                    {cat.remaining >= 0 ? 'Remaining: ' : 'Over: '}{formatCurrency(Math.abs(cat.remaining))}
                                                </span>
                                                <span className="text-text-muted">{cat.percentage.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-text-muted">No budget categories for this period.</div>
                            )
                        ) : (
                            (recentTransactionsView === 'recent' ?
                                (dashboardTransactions.length > 0 ? dashboardTransactions.slice(0, 10) : []) :
                                topSpendingTransactions
                            ).map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-light/50 transition-colors">
                                    <div>
                                        <p className="font-semibold">{t.description}</p>
                                        <p className="text-xs text-text-muted">{t.category} &middot; {new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                    <p className={`font-bold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </p>
                                </div>
                            ))
                        )}
                        {recentTransactionsView !== 'categories' && dashboardTransactions.length === 0 && <div className="text-center py-10 text-text-muted">No transactions for this period.</div>}
                    </div>
                </div>
            </section >

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
                        let totalSpent = 0;
                        let totalRemaining = 0;
                        let unspentBudget = 0;

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
                            totalSpent += spent;
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
                                        <span className="text-xs text-text-muted">Budgeted / Spent</span>
                                        <span className="text-sm font-medium">
                                            <span className="text-text-primary">{formatCurrency(totalBudgeted)}</span>
                                            <span className="text-text-muted mx-1">/</span>
                                            <span className={totalSpent >= totalBudgeted ? 'text-danger' : totalSpent > totalBudgeted * 0.7 ? 'text-warning' : 'text-success'}>
                                                {formatCurrency(totalSpent)}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">Unspent / Remaining</span>
                                        <span className="text-sm font-medium">
                                            <span className={
                                                unspentBudget < totalBudgeted * 0.1 ? 'text-danger' :
                                                    unspentBudget < totalBudgeted * 0.3 ? 'text-warning' :
                                                        'text-success'
                                            }>{formatCurrency(unspentBudget)}</span>
                                            <span className="text-text-muted mx-1">/</span>
                                            <span className={
                                                totalRemaining < 0 ? 'text-danger' :
                                                    totalRemaining < unspentBudget * 0.5 ? 'text-warning' :
                                                        'text-success'
                                            }>{totalRemaining < 0 ? '-' : ''}{formatCurrency(Math.abs(totalRemaining))}</span>
                                        </span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </Modal>
        </>
    );
};
