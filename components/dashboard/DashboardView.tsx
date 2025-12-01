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

    return (
        <>

            <section className="flex flex-wrap gap-4 justify-center items-center mb-8 animate-slide-up">
                <Button onClick={() => setActiveModal('income')}>💰 Add Income</Button>
                <Button onClick={() => setActiveModal('expense')}>💸 Add Expense</Button>
                <Button variant="secondary" onClick={() => setView('budgets')}>📊 Budget Planner</Button>
            </section>

            <div className="flex flex-wrap justify-end items-center mb-6 animate-fade-in gap-4">
                <div>
                    <label htmlFor="dashboard-period-filter" className="text-sm font-medium text-text-secondary mr-3">
                        Showing data for:
                    </label>
                    <select
                        id="dashboard-period-filter"
                        aria-label="Filter dashboard by time period"
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
                        aria-label="Select currency"
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
                <StatCard
                    label="Total Income"
                    value={formatCurrency(periodIncome)}
                    colorClass="bg-success"
                    description={`Sum of ${transactionCounts.incomeCount} income transactions in the selected period.`}
                />
                <StatCard
                    label="Total Expenses"
                    value={formatCurrency(periodExpenses)}
                    colorClass="bg-danger"
                    description={`Sum of ${transactionCounts.expenseCount} expense transactions in the selected period.`}
                />

                {/* Conditionally show either Period Net OR Total Balance based on filter */}
                {dashboardPeriodFilter === 'all' ? (
                    <StatCard
                        label="Total Balance"
                        value={formatCurrency(totalBalance)}
                        colorClass={totalBalance >= 0 ? "bg-primary" : "bg-danger"}
                        description="Your cumulative balance across all time (all income minus all expenses)."
                    />
                ) : (
                    <StatCard
                        label="Period Net"
                        value={formatCurrency(periodNet)}
                        colorClass={periodNet >= 0 ? "bg-primary" : "bg-danger"}
                        description="Net income minus expenses for this specific period only."
                    />
                )}

                <StatCard
                    label="Savings Rate"
                    value={`${savingsRate.toFixed(1)}%`}
                    colorClass={savingsRate >= 20 ? 'bg-success' : savingsRate > 0 ? 'bg-warning' : 'bg-danger'}
                    description="Percentage of income saved in this period. Formula: ((Income - Expenses) / Income) * 100."
                />
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

                                const remaining = budget.amount - spent;
                                const percentage = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
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
                            });
                        })()}
                    </div>
                    {(() => {
                        if (!budgetDisplayPeriod) return null;
                        const periodStart = new Date(budgetDisplayPeriod.startDate + 'T00:00:00');
                        const periodEnd = new Date(budgetDisplayPeriod.endDate + 'T23:59:59');

                        const totalSpent = transactions
                            .filter(t => t.type === 'expense')
                            .filter(t => {
                                const transactionDate = new Date(t.date + 'T00:00:00');
                                return transactionDate >= periodStart && transactionDate <= periodEnd;
                            })
                            .reduce((sum, t) => sum + t.amount, 0);

                        const totalBudgeted = budgets
                            .filter(b => b.budgetPeriodId === budgetDisplayPeriod.id)
                            .reduce((sum, b) => sum + b.amount, 0);

                        const totalRemaining = totalBudgeted - totalSpent;
                        const percentage = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
                        const progressClass = totalSpent >= totalBudgeted ? 'text-red-500' : percentage > 70 ? 'text-amber-500' : 'text-green-500';

                        return (<div className="mt-4 border-t border-border pt-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold">Totals</span>
                                <div className="text-right">
                                    <span className={`${progressClass} text-text-muted`}>{formatCurrency(totalSpent)} / {formatCurrency(totalBudgeted)}</span>
                                    <span className={`ml-2 text-xs font-medium ${totalRemaining < 0 ? 'text-danger' : 'text-success'}`}>
                                        ({totalRemaining >= 0 ? 'Rem: ' : 'Over: '}{formatCurrency(Math.abs(totalRemaining))})
                                    </span>
                                </div>
                            </div>
                        </div>);
                    })()}
                </div >

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
        </>
    );
};
