import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../../types';
import { Button, Modal, FormInput, FormSelect } from '../../components/ui';

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType | null;
    onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
    expenseCategories: string[];
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose, type, onSubmit, expenseCategories }) => {
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
