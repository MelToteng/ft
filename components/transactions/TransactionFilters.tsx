import React, { useState, useRef, useEffect } from 'react';
import { BudgetPeriod } from '../../types';
import { Button, FormSelect, Icons } from '../../components/ui';

interface TransactionFiltersProps {
    allCategories: string[];
    filters: {
        type: 'all' | 'income' | 'expense';
        categories: string[];
        startDate: string;
        endDate: string;
        periodId: number | 'all';
    };
    onFilterChange: React.Dispatch<React.SetStateAction<any>>;
    budgetPeriods: BudgetPeriod[];
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({ allCategories = [], filters, onFilterChange, budgetPeriods = [] }) => {
    const [isOpen, setIsOpen] = useState(true); // Default open on this page
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);

    const handleFilterChange = (field: string, value: any) => {
        onFilterChange((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (category: string) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...filters.categories, category];
        handleFilterChange('categories', newCategories);
    };

    const resetFilters = () => {
        onFilterChange({ type: 'all', categories: [], startDate: '', endDate: '', periodId: 'all' });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Filters</h3>
                <Button variant="ghost" onClick={resetFilters} className="text-sm">Reset All</Button>
            </div>
            {isOpen && (
                <div className="mt-4">
                    <div className="flex items-center gap-2 rounded-xl bg-surface-light p-1 mb-4 w-fit">
                        {(['all', 'income', 'expense'] as const).map(type => (
                            <button key={type} onClick={() => handleFilterChange('type', type)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${filters.type === type ? 'bg-primary text-white' : 'text-text-secondary hover:bg-border-light'}`}>
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormSelect label="Budget Period" id="period-filter" value={String(filters.periodId)} onChange={e => handleFilterChange('periodId', e.target.value === 'all' ? 'all' : Number(e.target.value))} className="!mb-0">
                            <option value="all">All Time</option>
                            {budgetPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </FormSelect>
                        <div className="relative" ref={categoryDropdownRef}>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Categories</label>
                            <button onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-left text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors flex justify-between items-center">
                                <span className="truncate">{filters.categories.length > 0 ? filters.categories.join(', ') : 'Select categories'}</span>
                                <Icons.ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isCategoryDropdownOpen && (
                                <div className="absolute z-10 top-full mt-2 w-full bg-surface border border-border-light rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {allCategories.map(cat => (
                                        <label key={cat} className="flex items-center px-4 py-2 hover:bg-surface-light cursor-pointer">
                                            <input type="checkbox" checked={filters.categories.includes(cat)} onChange={() => handleCategoryChange(cat)} className="h-4 w-4 rounded bg-surface-light border-border text-primary focus:ring-primary" />
                                            <span className="ml-3 text-text-primary">{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Start Date</label>
                            <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">End Date</label>
                            <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
