import React, { useState, useMemo } from 'react';
import { RecurringTransaction, TransactionType } from '../../types';
import { Button, Icons } from '../../components/ui';
import { RecurringTransactionModal } from './RecurringTransactionModal';

interface RecurringTransactionsViewProps {
    onClose: () => void;
    recurringTransactions: RecurringTransaction[];
    onSaveRecurring: (transaction: Omit<RecurringTransaction, 'id'>) => Promise<void>;
    onUpdateRecurring: (id: number, transaction: Partial<RecurringTransaction>) => Promise<void>;
    onDeleteRecurring: (id: number) => Promise<void>;
    expenseCategories: string[];
    formatCurrency: (value: number) => string;
}

export const RecurringTransactionsView: React.FC<RecurringTransactionsViewProps> = ({
    onClose,
    recurringTransactions,
    onSaveRecurring,
    onUpdateRecurring,
    onDeleteRecurring,
    expenseCategories,
    formatCurrency,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | undefined>(undefined);

    const handleEdit = (transaction: RecurringTransaction) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingTransaction(undefined);
        setIsModalOpen(true);
    };

    const handleSave = async (transaction: Omit<RecurringTransaction, 'id'>) => {
        if (editingTransaction) {
            await onUpdateRecurring(editingTransaction.id, transaction);
        } else {
            await onSaveRecurring(transaction);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this recurring transaction?')) {
            await onDeleteRecurring(id);
        }
    };

    const handleToggleActive = async (transaction: RecurringTransaction) => {
        await onUpdateRecurring(transaction.id, { isActive: !transaction.isActive });
    };

    const upcomingTransactions = useMemo(() => {
        return recurringTransactions
            .filter(t => t.isActive)
            .map(t => {
                const nextDate = new Date(t.lastGeneratedDate || t.startDate);
                if (t.lastGeneratedDate) {
                    switch (t.frequency) {
                        case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
                        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                        case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                    }
                }

                // Adjust for day of period if monthly
                if (t.frequency === 'monthly' && t.dayOfPeriod) {
                    const currentMonth = nextDate.getMonth();
                    const targetDay = Math.min(t.dayOfPeriod, new Date(nextDate.getFullYear(), currentMonth + 1, 0).getDate());
                    nextDate.setDate(targetDay);
                }

                return {
                    ...t,
                    nextDate: nextDate.toISOString().split('T')[0]
                };
            })
            .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());
    }, [recurringTransactions]);

    return (
        <div className="animate-fade-in py-12">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">Recurring Transactions</h1>
                    <p className="text-text-secondary mt-1">Manage your automated income and expenses.</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleAddNew}>
                        <Icons.Plus className="w-4 h-4 mr-2" /> New Recurring
                    </Button>
                    <Button onClick={onClose} variant="secondary">
                        <Icons.ChevronLeft /> Back to Dashboard
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold">Active Rules</h2>
                    <div className="bg-surface/50 backdrop-blur-xl rounded-4xl border border-border overflow-hidden">
                        {recurringTransactions.length > 0 ? (
                            <div className="divide-y divide-border-light">
                                {recurringTransactions.map(t => (
                                    <div key={t.id} className={`p-6 transition-colors ${!t.isActive ? 'opacity-60 bg-surface-light/30' : 'hover:bg-surface-light/50'}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-lg">{t.description}</h3>
                                                    {!t.isActive && <span className="text-xs bg-surface-light border border-border px-2 py-0.5 rounded text-text-muted">Inactive</span>}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                                                    <span className="flex items-center gap-1">
                                                        <span className="text-lg">{t.frequency === 'monthly' ? '📅' : t.frequency === 'weekly' ? '🗓️' : '⏰'}</span>
                                                        {t.frequency.charAt(0).toUpperCase() + t.frequency.slice(1)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="text-lg">🏷️</span>
                                                        {t.category}
                                                    </span>
                                                    {t.lastGeneratedDate && (
                                                        <span className="flex items-center gap-1 text-text-muted">
                                                            Last run: {new Date(t.lastGeneratedDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xl font-bold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                </p>
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button onClick={() => handleToggleActive(t)} className="p-1.5 text-text-muted hover:text-primary transition-colors" title={t.isActive ? "Pause" : "Resume"}>
                                                        {t.isActive ? <Icons.Pause className="w-4 h-4" /> : <Icons.Play className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => handleEdit(t)} className="p-1.5 text-text-muted hover:text-primary transition-colors" title="Edit">
                                                        <Icons.Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-text-muted hover:text-danger transition-colors" title="Delete">
                                                        <Icons.Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-text-muted">
                                <p>No recurring transactions found.</p>
                                <p className="text-sm mt-2">Create one to automate your budget!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar / Upcoming */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold">Upcoming</h2>
                    <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border">
                        {upcomingTransactions.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingTransactions.slice(0, 5).map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-surface-light rounded-xl border border-border-light">
                                        <div>
                                            <p className="font-medium text-sm">{t.description}</p>
                                            <p className="text-xs text-text-secondary">Due: {new Date(t.nextDate).toLocaleDateString()}</p>
                                        </div>
                                        <p className={`font-bold text-sm ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                            {formatCurrency(t.amount)}
                                        </p>
                                    </div>
                                ))}
                                {upcomingTransactions.length > 5 && (
                                    <p className="text-xs text-center text-text-muted pt-2">
                                        + {upcomingTransactions.length - 5} more upcoming
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-text-muted text-sm text-center py-4">No upcoming transactions.</p>
                        )}

                        <div className="mt-6 pt-6 border-t border-border-light">
                            <h3 className="text-sm font-semibold mb-2">Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Monthly Income</span>
                                    <span className="font-medium text-success">
                                        +{formatCurrency(recurringTransactions.filter(t => t.isActive && t.type === 'income' && t.frequency === 'monthly').reduce((sum, t) => sum + t.amount, 0))}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-secondary">Monthly Expenses</span>
                                    <span className="font-medium text-danger">
                                        -{formatCurrency(recurringTransactions.filter(t => t.isActive && t.type === 'expense' && t.frequency === 'monthly').reduce((sum, t) => sum + t.amount, 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <RecurringTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                transaction={editingTransaction}
                expenseCategories={expenseCategories}
            />
        </div>
    );
};
