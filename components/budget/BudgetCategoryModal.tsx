import React, { useState, useEffect } from 'react';
import { Modal, Button, FormInput } from '../ui';

interface BudgetCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddCategories: (categories: string[]) => void;
    availableCategories: string[];
}

export const BudgetCategoryModal: React.FC<BudgetCategoryModalProps> = ({
    isOpen,
    onClose,
    onAddCategories,
    availableCategories,
}) => {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [customCategory, setCustomCategory] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedCategories([]);
            setCustomCategory('');
        }
    }, [isOpen]);

    const handleToggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleAddCustomCategory = () => {
        const trimmed = customCategory.trim();
        if (trimmed && !selectedCategories.includes(trimmed) && !availableCategories.includes(trimmed)) {
            setSelectedCategories(prev => [...prev, trimmed]);
            setCustomCategory('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCategories.length > 0) {
            onAddCategories(selectedCategories);
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Budget Categories"
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-sm text-text-secondary mb-3">
                    Select categories you want to budget for, or add your own custom category. You'll enter amounts on the next screen.
                </div>

                {/* Custom Category Input */}
                <div className="bg-surface-light p-4 rounded-xl border border-border">
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Add Custom Category</h4>
                    <div className="flex gap-2">
                        <FormInput
                            label=""
                            id="customCategory"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="e.g., Pet Care, Education, Savings..."
                            className="!mb-0 flex-1"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomCategory();
                                }
                            }}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddCustomCategory}
                            disabled={!customCategory.trim()}
                            className="!py-2 whitespace-nowrap"
                        >
                            Add Custom
                        </Button>
                    </div>
                </div>

                {/* Category Selection List */}
                <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Available Categories</h4>
                    <div className="max-h-80 overflow-y-auto space-y-2 border border-border rounded-xl p-3 bg-surface-light">
                        {availableCategories.length > 0 ? (
                            availableCategories.map((category) => (
                                <label
                                    key={category}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedCategories.includes(category)
                                            ? 'bg-primary/20 border-2 border-primary'
                                            : 'bg-surface hover:bg-surface-light border-2 border-transparent'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(category)}
                                        onChange={() => handleToggleCategory(category)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="font-medium text-text-primary">{category}</span>
                                </label>
                            ))
                        ) : (
                            <div className="text-center py-8 text-text-muted">
                                <p>All predefined categories have been added.</p>
                                <p className="text-sm mt-1">You can still add custom categories above.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Categories Display */}
                {selectedCategories.length > 0 && (
                    <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-primary">
                                {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'} selected
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedCategories.map(cat => (
                                <span
                                    key={cat}
                                    className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-lg text-sm"
                                >
                                    {cat}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategories(prev => prev.filter(c => c !== cat))}
                                        className="hover:text-danger transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={selectedCategories.length === 0}
                    >
                        Add {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                    </Button>
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
