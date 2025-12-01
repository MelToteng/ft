import React, { useState, useMemo } from 'react';
import { Transaction, BudgetPeriod, BudgetItem, CustomCategory } from '../../types';
import { Button, Icons } from '../../components/ui';
import { TransactionFilters } from './TransactionFilters';
import { TransactionFormModal } from './TransactionFormModal';

interface AllTransactionsViewProps {
    onClose: () => void;
    transactions: Transaction[];
    budgetPeriods: BudgetPeriod[];
    budgets: BudgetItem[];
    customCategories: CustomCategory[];
    allCategories: string[];
    onDeleteTransaction: (id: number) => Promise<void>;
    onUpdateTransaction: (id: number, updates: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
    formatCurrency: (value: number) => string;
}

export const AllTransactionsView: React.FC<AllTransactionsViewProps> = ({
    onClose,
    transactions,
    budgetPeriods,
    budgets,
    customCategories,
    allCategories,
    onDeleteTransaction,
    onUpdateTransaction,
    formatCurrency
}) => {
    const [filters, setFilters] = useState({
        type: 'all' as 'all' | 'income' | 'expense',
        categories: [] as string[],
        startDate: '',
        endDate: '',
        periodId: 'all' as number | 'all',
        searchText: '',
    });
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
            .filter(t => {
                if (!filters.searchText) return true;
                const searchLower = filters.searchText.toLowerCase();
                return (
                    t.description.toLowerCase().includes(searchLower) ||
                    t.category.toLowerCase().includes(searchLower)
                );
            });
    }, [transactions, filters, budgetPeriods]);

    const [isTotalsOpen, setIsTotalsOpen] = useState(true);

    const { totalIncome, totalExpense, netTotal } = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { totalIncome: income, totalExpense: expense, netTotal: income - expense };
    }, [filteredTransactions]);

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

                <div className="mt-6 mb-6">
                    <button
                        onClick={() => setIsTotalsOpen(!isTotalsOpen)}
                        className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors mb-2"
                    >
                        <Icons.ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isTotalsOpen ? 'rotate-180' : ''}`} />
                        {isTotalsOpen ? 'Hide Totals' : 'Show Totals'}
                    </button>

                    {isTotalsOpen && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-down">
                            <div className="bg-surface-light p-4 rounded-xl border border-border-light">
                                <p className="text-sm text-text-secondary mb-1">Total Income</p>
                                <p className="text-xl font-bold text-success">+{formatCurrency(totalIncome)}</p>
                            </div>
                            <div className="bg-surface-light p-4 rounded-xl border border-border-light">
                                <p className="text-sm text-text-secondary mb-1">Total Expenses</p>
                                <p className="text-xl font-bold text-danger">-{formatCurrency(totalExpense)}</p>
                            </div>
                            <div className="bg-surface-light p-4 rounded-xl border border-border-light">
                                <p className="text-sm text-text-secondary mb-1">Net Total</p>
                                <p className={`text-xl font-bold ${netTotal >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {netTotal >= 0 ? '+' : ''}{formatCurrency(netTotal)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3 h-[50vh] overflow-y-auto pr-2 border-t border-border-light pt-6">
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
                                <button
                                    onClick={() => setEditingTransaction(t)}
                                    className="text-text-muted hover:text-primary transition-colors p-1.5 rounded-md hover:bg-primary/10"
                                    title="Edit transaction"
                                >
                                    <Icons.Edit />
                                </button>
                                <button onClick={() => onDeleteTransaction(t.id)} className="text-text-muted hover:text-danger transition-colors p-1.5 rounded-md hover:bg-danger/10">
                                    <Icons.Trash />
                                </button>
                            </div>
                        </div>
                    )) : <div className="text-center py-10 text-text-muted">No transactions match the current filters.</div>}
                </div>
            </div>

            <TransactionFormModal
                isOpen={!!editingTransaction}
                onClose={() => setEditingTransaction(null)}
                type={editingTransaction?.type || null}
                onSubmit={() => { }} // Not used in edit mode
                onUpdate={async (id, updates) => {
                    await onUpdateTransaction(id, updates);
                    setEditingTransaction(null);
                }}
                transaction={editingTransaction}
                expenseCategories={allCategories}
                customCategories={customCategories}
                budgets={budgets}
                budgetPeriods={budgetPeriods}
            />
        </div>
    );
};
