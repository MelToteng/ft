import React, { useState, useEffect } from 'react';
import { BudgetPeriod, BudgetItem } from '../../types';
import { Button, FormInput, Icons } from '../../components/ui';
import { BudgetCategoryModal } from './BudgetCategoryModal';

interface BudgetManagementViewProps {
    onClose: () => void;
    budgetPeriods: BudgetPeriod[];
    budgets: BudgetItem[];
    allCategories: string[];
    addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    onSavePeriod: (period: Omit<BudgetPeriod, 'id'> & { id: number | 'new' }, budgetsToSave: { category: string, amount: number }[]) => Promise<void>;
    onDeletePeriod: (id: number) => Promise<void>;
}

export const BudgetManagementView: React.FC<BudgetManagementViewProps> = ({
    onClose,
    budgetPeriods,
    budgets,
    allCategories,
    addNotification,
    onSavePeriod,
    onDeletePeriod
}) => {
    const [activePeriodId, setActivePeriodId] = useState<number | 'new' | null>(null);
    const [periodName, setPeriodName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [budgetValues, setBudgetValues] = useState<Record<string, number>>({});
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    useEffect(() => {
        if (budgetPeriods.length > 0 && !activePeriodId) {
            setActivePeriodId(budgetPeriods[0].id);
        }
        if (budgetPeriods.length === 0) {
            setActivePeriodId('new');
        }
    }, [budgetPeriods, activePeriodId]);

    useEffect(() => {
        if (activePeriodId && activePeriodId !== 'new') {
            const period = budgetPeriods.find(p => p.id === activePeriodId);
            if (period) {
                setPeriodName(period.name);
                setStartDate(period.startDate);
                setEndDate(period.endDate);

                const periodBudgets = budgets.filter(b => b.budgetPeriodId === activePeriodId);
                const initialValues: Record<string, number> = {};
                periodBudgets.forEach(b => {
                    initialValues[b.category] = b.amount;
                });
                setBudgetValues(initialValues);
            }
        } else if (activePeriodId === 'new') {
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setDate(today.getDate() + 30);

            setPeriodName('');
            setStartDate(today.toISOString().slice(0, 10));
            setEndDate(nextMonth.toISOString().slice(0, 10));
            setBudgetValues({});
        }
    }, [activePeriodId, budgetPeriods, budgets]);

    const handleSelectPeriod = (id: number | 'new') => {
        setActivePeriodId(id);
    };

    const handleSave = async () => {
        if (!periodName || !startDate || !endDate) {
            addNotification('Period name and dates are required.', 'error');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            addNotification('Start date cannot be after end date.', 'error');
            return;
        }

        const budgetsToSave = Object.entries(budgetValues)
            .map(([category, amount]: [string, number]) => ({ category, amount }))
            .filter((b: { category: string; amount: number }) => b.amount > 0);

        try {
            await onSavePeriod({ id: activePeriodId as number, name: periodName, startDate, endDate }, budgetsToSave);
            onClose();
        } catch (error: any) {
            addNotification('Failed to save budget: ' + error.message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this period and all its budgets? This cannot be undone.')) {
            try {
                await onDeletePeriod(id);
                setActivePeriodId(null);
                if (budgetPeriods.length <= 1) {
                    onClose();
                }
            } catch (error: any) {
                addNotification('Failed to delete period: ' + error.message, 'error');
            }
        }
    };

    const handleAddCategory = () => {
        setIsCategoryModalOpen(true);
    };

    const handleAddCategories = (categories: string[]) => {
        setBudgetValues(prev => {
            const newValues = { ...prev };
            categories.forEach(cat => {
                if (!newValues[cat]) {
                    newValues[cat] = 0; // Initialize with 0, user will enter amount
                }
            });
            return newValues;
        });
    };

    const handleAmountChange = (category: string, value: string) => {
        const amount = parseFloat(value) || 0;
        setBudgetValues(prev => ({ ...prev, [category]: amount }));
    };

    const handleRemoveCategory = (category: string) => {
        setBudgetValues(prev => {
            const newValues = { ...prev };
            delete newValues[category];
            return newValues;
        });
    };

    const budgetedCategories = Object.keys(budgetValues).sort();
    const availableCategories = allCategories.filter(cat => !budgetedCategories.includes(cat));

    const totalBudgeted: number = (Object.values(budgetValues) as number[]).reduce((sum: number, amount: number) => sum + amount, 0);

    return (
        <div className="animate-fade-in py-12">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">Budget Planner</h1>
                    <p className="text-text-secondary mt-1">Create budget periods and allocate funds to categories.</p>
                </div>
                <Button onClick={onClose} variant="secondary">
                    <Icons.ChevronLeft /> Back to Dashboard
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-surface/50 backdrop-blur-xl p-8 rounded-4xl border border-border">
                {/* Left Column: Period List */}
                <div className="lg:col-span-1 lg:border-r lg:border-border-light lg:pr-6">
                    <h3 className="text-xl font-bold mb-4">Budget Periods</h3>

                    {/* Mobile Dropdown View */}
                    <div className="lg:hidden">
                        <select
                            value={activePeriodId || ''}
                            onChange={e => handleSelectPeriod(e.target.value === 'new' ? 'new' : Number(e.target.value))}
                            className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none mb-4"
                        >
                            {budgetPeriods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            <option value="new">✚ Create New Period...</option>
                        </select>
                    </div>

                    {/* Desktop List View */}
                    <div className="hidden lg:block">
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {budgetPeriods.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelectPeriod(p.id)}
                                    className={`w-full text-left p-3 rounded-xl transition-colors text-sm ${activePeriodId === p.id ? 'bg-primary/20 text-primary-light' : 'hover:bg-surface-light'}`}
                                >
                                    <p className="font-semibold">{p.name}</p>
                                    <p className={`text-xs ${activePeriodId === p.id ? 'text-primary-light/80' : 'text-text-muted'}`}>
                                        {new Date(p.startDate + 'T00:00:00').toLocaleDateString()} - {new Date(p.endDate + 'T00:00:00').toLocaleDateString()}
                                    </p>
                                </button>
                            ))}
                        </div>
                        <Button variant="secondary" onClick={() => handleSelectPeriod('new')} className="w-full mt-4 !py-2 text-sm"><Icons.Plus /> Create New Period</Button>
                    </div>
                </div>

                {/* Right Column: Editor */}
                <div className="lg:col-span-2">
                    {activePeriodId ? (
                        <div>
                            <h3 className="text-xl font-bold mb-4">{activePeriodId === 'new' ? 'Create New Period' : 'Edit Period'}</h3>
                            <div className="bg-surface-light p-4 rounded-2xl mb-6">
                                <FormInput label="Period Name" id="periodName" value={periodName} onChange={e => setPeriodName(e.target.value)} placeholder="e.g., January 2024" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Start Date" id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    <FormInput label="End Date" id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Category Budgets</h3>
                                {totalBudgeted > 0 && (
                                    <span className="text-sm text-text-muted">
                                        Total: <span className="font-semibold text-primary">${totalBudgeted.toFixed(2)}</span>
                                    </span>
                                )}
                            </div>

                            {budgetedCategories.length > 0 ? (
                                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                                    {budgetedCategories.map((cat: string) => (
                                        <div key={cat} className="flex items-center gap-3">
                                            <label htmlFor={`budget-${cat}`} className="text-sm font-medium text-text-primary flex-1 min-w-0">
                                                {cat}
                                            </label>
                                            <div className="flex-1 max-w-xs">
                                                <input
                                                    type="number"
                                                    id={`budget-${cat}`}
                                                    value={budgetValues[cat] || ''}
                                                    onChange={(e) => handleAmountChange(cat, e.target.value)}
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveCategory(cat)}
                                                className="text-text-muted hover:text-danger p-2 rounded-md transition-colors flex-shrink-0"
                                                title="Remove category"
                                            >
                                                <Icons.Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-text-muted bg-surface-light rounded-xl mb-4">
                                    <p className="mb-2">No categories budgeted yet</p>
                                    <p className="text-sm">Click "Add Budget Category" to get started</p>
                                </div>
                            )}

                            <Button
                                variant="secondary"
                                onClick={handleAddCategory}
                                className="w-full mb-6"
                                disabled={availableCategories.length === 0}
                            >
                                <Icons.Plus /> Add Budget Category
                            </Button>

                            <div className="flex justify-between items-center pt-4 border-t border-border-light">
                                {activePeriodId !== 'new' ? (
                                    <Button variant="danger" onClick={() => handleDelete(activePeriodId as number)} className="!py-2"><Icons.Trash /> Delete Period</Button>
                                ) : <div></div>}
                                <Button onClick={handleSave} className="!py-2">Save Changes</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-muted">
                            <p>Select a period to edit or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>

            <BudgetCategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onAddCategories={handleAddCategories}
                availableCategories={availableCategories}
            />
        </div>
    );
};
