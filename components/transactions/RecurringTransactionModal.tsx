import React, { useState, useEffect } from 'react';
import { RecurringTransaction, RecurringFrequency, TransactionType } from '../../types';
import { Modal, Button } from '../ui';

interface RecurringTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<RecurringTransaction, 'id'>) => Promise<void>;
    transaction?: RecurringTransaction;
    expenseCategories: string[];
}

export const RecurringTransactionModal: React.FC<RecurringTransactionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    transaction,
    expenseCategories,
}) => {
    const [formData, setFormData] = useState<Omit<RecurringTransaction, 'id'>>({
        description: '',
        amount: 0,
        type: 'expense',
        category: '',
        frequency: 'monthly',
        dayOfPeriod: 1,
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (transaction) {
            setFormData({
                description: transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                category: transaction.category,
                frequency: transaction.frequency,
                dayOfPeriod: transaction.dayOfPeriod,
                startDate: transaction.startDate,
                endDate: transaction.endDate,
                isActive: transaction.isActive,
            });
        } else {
            setFormData({
                description: '',
                amount: 0,
                type: 'expense',
                category: '',
                frequency: 'monthly',
                dayOfPeriod: 1,
                startDate: new Date().toISOString().split('T')[0],
                isActive: true,
            });
        }
    }, [transaction, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving recurring transaction:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transaction ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                            className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => handleChange('type', e.target.value as TransactionType)}
                            className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                    <select
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                        required
                    >
                        <option value="">Select category</option>
                        {expenseCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Frequency</label>
                        <select
                            value={formData.frequency}
                            onChange={(e) => handleChange('frequency', e.target.value as RecurringFrequency)}
                            className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>

                    {(formData.frequency === 'monthly' || formData.frequency === 'weekly') && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                {formData.frequency === 'monthly' ? 'Day of Month' : 'Day of Week'}
                            </label>
                            <input
                                type="number"
                                min={formData.frequency === 'monthly' ? 1 : 0}
                                max={formData.frequency === 'monthly' ? 31 : 6}
                                value={formData.dayOfPeriod || (formData.frequency === 'monthly' ? 1 : 0)}
                                onChange={(e) => handleChange('dayOfPeriod', parseInt(e.target.value))}
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            {formData.frequency === 'weekly' && (
                                <p className="text-xs text-text-muted mt-1">0=Sunday, 6=Saturday</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Start Date</label>
                        <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => handleChange('startDate', e.target.value)}
                            className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">End Date (Optional)</label>
                        <input
                            type="date"
                            value={formData.endDate || ''}
                            onChange={(e) => handleChange('endDate', e.target.value || undefined)}
                            className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => handleChange('isActive', e.target.checked)}
                        className="mr-2"
                    />
                    <label htmlFor="isActive" className="text-sm text-text-secondary">Active</label>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isSaving} className="flex-1">
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
