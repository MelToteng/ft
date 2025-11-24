import React, { useState, useEffect } from 'react';
import { BudgetPeriod, BudgetItem } from '../../types';
import { Button, FormInput, FormSelect, Icons } from '../../components/ui';

const DEFAULT_EXPENSE_CATEGORIES = ['Housing', 'Groceries', 'Transport', 'Utilities', 'Eating Out', 'Entertainment', 'Shopping', 'Health', 'Personal Care', 'Subscriptions', 'Gifts', 'Travel', 'Other'];

interface BudgetManagementViewProps {
    onClose: () => void;
    budgetPeriods: BudgetPeriod[];
    budgets: BudgetItem[];
    allCategories: string[];
    addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    onSavePeriod: (period: Omit<BudgetPeriod, 'id'> & { id: number | 'new' }, budgetsToSave: { category: string, amount: number }[]) => Promise<void>;
    onDeletePeriod: (id: number) => Promise<void>;
}

export const BudgetManagementView: React.FC<BudgetManagementViewProps> = ({ onClose, budgetPeriods, budgets, allCategories, addNotification, onSavePeriod, onDeletePeriod }) => {
    const [activePeriodId, setActivePeriodId] = useState<number | 'new' | null>(null);
    const [periodName, setPeriodName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [budgetValues, setBudgetValues] = useState<Record<string, string>>({});
    const [displayedCategories, setDisplayedCategories] = useState<string[]>([]);
    const [customCategory, setCustomCategory] = useState('');

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
                const initialValues: Record<string, string> = {};
                periodBudgets.forEach(b => {
                    initialValues[b.category] = String(b.amount);
                });
                setBudgetValues(initialValues);

                const budgetCats = new Set(periodBudgets.map(b => b.category));
                allCategories.forEach(c => budgetCats.add(c));
                setDisplayedCategories(Array.from(budgetCats).sort());
            }
        } else if (activePeriodId === 'new') {
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setDate(today.getDate() + 30);

            setPeriodName('');
            setStartDate(today.toISOString().slice(0, 10));
            setEndDate(nextMonth.toISOString().slice(0, 10));
            setBudgetValues({});
            setDisplayedCategories([...DEFAULT_EXPENSE_CATEGORIES].sort());
        }
    }, [activePeriodId, budgetPeriods, budgets, allCategories]);

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

        const budgetsToSave = displayedCategories
            .map(category => ({ category, amount: parseFloat(budgetValues[category]) || 0 }))
            .filter(b => b.amount >= 0);

        try {
            await onSavePeriod({ id: activePeriodId as number, name: periodName, startDate, endDate }, budgetsToSave);
            onClose(); // Go back to dashboard on success
        } catch (error: any) {
            addNotification('Failed to save budget: ' + error.message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this period and all its budgets? This cannot be undone.')) {
            try {
                await onDeletePeriod(id);
                setActivePeriodId(null);
                if (budgetPeriods.length <= 1) { // if last one was deleted
                    onClose();
                }
            } catch (error: any) {
                addNotification('Failed to delete period: ' + error.message, 'error');
            }
        }
    };

    const handleAddCustomCategory = () => {
        const trimmed = customCategory.trim();
        if (trimmed && !displayedCategories.includes(trimmed)) {
            setDisplayedCategories(prev => [...prev, trimmed].sort());
            setCustomCategory('');
        }
    };

    const handleRemoveCategory = (categoryToRemove: string) => {
        setDisplayedCategories(prev => prev.filter(c => c !== categoryToRemove));
        setBudgetValues(prev => {
            const newValues = { ...prev };
            delete newValues[categoryToRemove];
            return newValues;
        });
    };

    return (
        <div className="animate-fade-in py-12">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">Budget Management</h1>
                    <p className="text-text-secondary mt-1">Create custom periods and allocate your funds.</p>
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
                        <FormSelect
                            label=""
                            id="budget-period-select"
                            value={activePeriodId || ''}
                            onChange={e => handleSelectPeriod(e.target.value === 'new' ? 'new' : Number(e.target.value))}
                            className="!mb-4"
                        >
                            {budgetPeriods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            <option value="new">✚ Create New Period...</option>
                        </FormSelect>
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
                            <div className="bg-surface-light p-4 rounded-2xl">
                                <FormInput label="Period Name" id="periodName" value={periodName} onChange={e => setPeriodName(e.target.value)} placeholder="e.g., July Paycheck" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Start Date" id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    <FormInput label="End Date" id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mt-6 mb-4">Category Budgets</h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 mb-4">
                                {displayedCategories.map(cat => (
                                    <div key={cat} className="flex items-center gap-2">
                                        <label htmlFor={`budget-${cat}`} className="text-sm font-medium text-text-secondary flex-1 truncate w-1/3">{cat}</label>
                                        <div className="flex-1">
                                            <FormInput label="" id={`budget-${cat}`} type="number" value={budgetValues[cat] || ''} onChange={e => setBudgetValues({ ...budgetValues, [cat]: e.target.value })} placeholder="0.00" step="0.01" className="!mb-0" />
                                        </div>
                                        <button onClick={() => handleRemoveCategory(cat)} className="text-text-muted hover:text-danger p-2 rounded-md transition-colors"><Icons.Trash /></button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 border-t border-border-light pt-4">
                                <FormInput label="" id="customCategory" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Add new category..." className="!mb-0 flex-grow" />
                                <
                                    Button type="button" variant="secondary" onClick={handleAddCustomCategory} className="!py-2">Add</Button>
                            </div>
                            <div className="flex justify-between items-center mt-6">
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
        </div>
    );
};
