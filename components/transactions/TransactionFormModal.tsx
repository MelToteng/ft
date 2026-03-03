import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, CustomCategory, BudgetItem, BudgetPeriod } from '../../types';
import { Button, Modal, FormInput, FormSelect } from '../../components/ui';

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType | null;
    onSubmit: (transaction: Omit<Transaction, 'id'>, shouldClose?: boolean) => void;
    onUpdate?: (id: number, transaction: Partial<Omit<Transaction, 'id'>>) => void;
    transaction?: Transaction | null; // For edit mode
    expenseCategories: string[];
    customCategories?: CustomCategory[];
    budgets?: BudgetItem[];
    budgetPeriods?: BudgetPeriod[];
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
    isOpen,
    onClose,
    type,
    onSubmit,
    onUpdate,
    transaction = null,
    expenseCategories,
    customCategories = [],
    budgets = [],
    budgetPeriods = []
}) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('Other');
    const [subItemId, setSubItemId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                // Edit mode - populate with existing transaction data
                setDescription(transaction.description);
                setAmount(transaction.amount.toString());
                setDate(transaction.date);
                setCategory(transaction.category);
                setSubItemId(transaction.budget_sub_item_id || null);
            } else {
                // Add mode - reset to defaults
                setDescription('');
                setAmount('');
                setDate(new Date().toISOString().split('T')[0]);
                setCategory(type === 'income' ? 'Income' : expenseCategories.includes('Other') ? 'Other' : expenseCategories[0] || '');
                setSubItemId(null);
            }
        }
    }, [isOpen, type, expenseCategories, transaction]);

    // Reset sub-item when category or date changes (only in add mode)
    useEffect(() => {
        if (!transaction) {
            setSubItemId(null);
        }
    }, [category, date, transaction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!type) return;

        if (transaction && onUpdate) {
            // Edit mode
            onUpdate(transaction.id, {
                description,
                amount: parseFloat(amount),
                date,
                category,
                type,
                budget_sub_item_id: subItemId || undefined
            });
        } else {
            // Add mode
            onSubmit({
                description,
                amount: parseFloat(amount),
                date,
                category,
                type,
                budget_sub_item_id: subItemId || undefined
            }, true);
        }
    };

    const handleSaveAndAddAnother = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!type || !description || !amount) {
            const form = e.currentTarget.closest('form');
            if (form && !form.checkValidity()) {
                form.reportValidity();
                return;
            }
            return;
        }
        onSubmit({
            description,
            amount: parseFloat(amount),
            date,
            category,
            type,
            budget_sub_item_id: subItemId || undefined
        }, false);
        setDescription('');
        setAmount('');
        // Keep date, category, and sub-item for faster entry
    };

    if (!type) return null;

    // Get custom categories for the current type
    const typeCustomCategories = customCategories.filter(c => c.type === type);
    const getCategoryColor = (catName: string) => {
        const custom = typeCustomCategories.find(c => c.name === catName);
        return custom?.color;
    };

    // Determine available sub-items based on date and category
    const currentPeriod = budgetPeriods.find(p => p.startDate <= date && p.endDate >= date);
    const currentBudget = currentPeriod
        ? budgets.find(b => b.budgetPeriodId === currentPeriod.id && b.category === category)
        : null;
    const availableSubItems = currentBudget?.subItems || [];

    const isEditMode = !!transaction;
    const modalTitle = isEditMode
        ? (type === 'income' ? 'Edit Income' : type === 'expense' ? 'Edit Expense' : 'Edit Transfer')
        : (type === 'income' ? 'Add Income' : type === 'expense' ? 'Add Expense' : 'Add Transfer');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit}>
                <FormInput label="Description" id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'income' ? 'e.g., Salary' : 'e.g., Groceries'} required />
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Amount" id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" required />
                    {type !== 'income' ? (
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                            <select
                                id="category"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                                {type === 'transfer' ? (
                                    <>
                                        <option value="Savings">Savings</option>
                                        <option value="Investment">Investment</option>
                                        <option value="Credit Card Payment">Credit Card Payment</option>
                                        <option value="Internal Transfer">Internal Transfer</option>
                                        <option value="Other">Other</option>
                                    </>
                                ) : (
                                    expenseCategories.map(cat => {
                                        const color = getCategoryColor(cat);
                                        return (
                                            <option key={cat} value={cat}>
                                                {color ? '● ' : ''}{cat}
                                            </option>
                                        );
                                    })
                                )}
                            </select>
                            {type === 'expense' && getCategoryColor(category) && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: getCategoryColor(category) }}
                                    />
                                    <span className="text-xs text-text-muted">Custom category</span>
                                </div>
                            )}
                        </div>
                    ) : <FormInput label="Category" id="category" type="text" value="Income" disabled />}
                </div>

                {/* Sub-item Selection */}
                {availableSubItems.length > 0 && (
                    <div className="mt-4">
                        <label htmlFor="subItem" className="block text-sm font-medium text-text-secondary mb-2">
                            Sub-Category (Optional)
                        </label>
                        <select
                            id="subItem"
                            value={subItemId || ''}
                            onChange={e => setSubItemId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="">-- Select Sub-item --</option>
                            {availableSubItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <FormInput label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <div className="flex gap-3 mt-4">
                    <Button type="submit" className="flex-1">
                        {isEditMode ? 'Update' : (type === 'income' ? 'Add Income' : type === 'expense' ? 'Add Expense' : 'Add Transfer')}
                    </Button>
                    {(type === 'expense' || type === 'transfer') && !isEditMode && (
                        <Button type="button" variant="secondary" className="flex-1" onClick={handleSaveAndAddAnother}>
                            Save & Add Another
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
};
