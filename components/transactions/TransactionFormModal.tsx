import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, CustomCategory } from '../../types';
import { Button, Modal, FormInput, FormSelect } from '../../components/ui';

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType | null;
    onSubmit: (transaction: Omit<Transaction, 'id'>, shouldClose?: boolean) => void;
    expenseCategories: string[];
    customCategories?: CustomCategory[];
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
    isOpen,
    onClose,
    type,
    onSubmit,
    expenseCategories,
    customCategories = []
}) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('Other');

    useEffect(() => {
        if (isOpen) {
            setDescription('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setCategory(type === 'income' ? 'Income' : expenseCategories.includes('Other') ? 'Other' : expenseCategories[0] || '');
        }
    }, [isOpen, type, expenseCategories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!type) return;
        onSubmit({ description, amount: parseFloat(amount), date, category, type }, true);
    };

    const handleSaveAndAddAnother = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!type || !description || !amount) {
            // Trigger browser validation if possible, or just return
            // Since we can't easily trigger browser validation programmatically on partial form,
            // we'll just check if values exist.
            const form = e.currentTarget.closest('form');
            if (form && !form.checkValidity()) {
                form.reportValidity();
                return;
            }
            return;
        }
        onSubmit({ description, amount: parseFloat(amount), date, category, type }, false);
        setDescription('');
        setAmount('');
        // Keep date and category for faster entry
    };

    if (!type) return null;

    // Get custom categories for the current type
    const typeCustomCategories = customCategories.filter(c => c.type === type);
    const getCategoryColor = (catName: string) => {
        const custom = typeCustomCategories.find(c => c.name === catName);
        return custom?.color;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={type === 'income' ? 'Add Income' : 'Add Expense'}>
            <form onSubmit={handleSubmit}>
                <FormInput label="Description" id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'income' ? 'e.g., Salary' : 'e.g., Groceries'} required />
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Amount" id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" required />
                    {type === 'expense' ? (
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                            <select
                                id="category"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                                {expenseCategories.map(cat => {
                                    const color = getCategoryColor(cat);
                                    return (
                                        <option key={cat} value={cat}>
                                            {color ? '● ' : ''}{cat}
                                        </option>
                                    );
                                })}
                            </select>
                            {getCategoryColor(category) && (
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
                <FormInput label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <div className="flex gap-3 mt-4">
                    <Button type="submit" className="flex-1">{type === 'income' ? 'Add Income' : 'Add Expense'}</Button>
                    {type === 'expense' && (
                        <Button type="button" variant="secondary" className="flex-1" onClick={handleSaveAndAddAnother}>
                            Save & Add Another
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
};
