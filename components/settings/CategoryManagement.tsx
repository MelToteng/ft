import React, { useState, useEffect } from 'react';
import { Modal, Button, Icons } from '../ui';
import { CustomCategory, TransactionType } from '../../types';
import {
    getCustomCategories,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
} from '../../services/supabaseService';

interface CategoryManagementProps {
    isOpen: boolean;
    onClose: () => void;
    addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PRESET_COLORS = [
    '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6366F1',
    '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#A855F7', '#06B6D4',
];

const PRESET_ICONS = ['💰', '🏠', '🚗', '🍔', '🎬', '🛒', '💊', '✈️', '📱', '⚡', '🎓', '🎁'];

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
    isOpen,
    onClose,
    addNotification,
}) => {
    const [categories, setCategories] = useState<CustomCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'expense' as TransactionType,
        color: PRESET_COLORS[0],
        icon: PRESET_ICONS[0],
    });

    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await getCustomCategories();
            setCategories(data);
        } catch (error: any) {
            addNotification(`Error loading categories: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            addNotification('Please enter a category name', 'error');
            return;
        }

        setIsLoading(true);
        try {
            if (editingCategory) {
                await updateCustomCategory(editingCategory.id, formData);
                addNotification('Category updated successfully', 'success');
            } else {
                await addCustomCategory(formData);
                addNotification('Category added successfully', 'success');
            }
            await loadCategories();
            handleCancelEdit();
        } catch (error: any) {
            addNotification(`Error saving category: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        setIsLoading(true);
        try {
            await deleteCustomCategory(id);
            addNotification('Category deleted successfully', 'success');
            await loadCategories();
        } catch (error: any) {
            addNotification(`Error deleting category: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (category: CustomCategory) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            type: category.type,
            color: category.color,
            icon: category.icon || PRESET_ICONS[0],
        });
        setIsAddingNew(true);
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setIsAddingNew(false);
        setFormData({
            name: '',
            type: 'expense',
            color: PRESET_COLORS[0],
            icon: PRESET_ICONS[0],
        });
    };

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories" className="max-w-3xl">
            <div className="space-y-6">
                {!isAddingNew && (
                    <Button onClick={() => setIsAddingNew(true)} className="w-full">
                        <Icons.Plus className="w-4 h-4 mr-2" />
                        Add New Category
                    </Button>
                )}

                {isAddingNew && (
                    <div className="bg-surface-light p-4 rounded-xl space-y-4">
                        <h4 className="font-semibold">
                            {editingCategory ? 'Edit Category' : 'New Category'}
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                                    placeholder="e.g., Groceries"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setFormData({ ...formData, color })}
                                        className={`w-10 h-10 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-primary scale-110' : ''
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Icon
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_ICONS.map(icon => (
                                    <button
                                        key={icon}
                                        onClick={() => setFormData({ ...formData, icon })}
                                        className={`w-10 h-10 rounded-lg bg-surface-light hover:bg-surface transition-all text-xl ${formData.icon === icon ? 'ring-2 ring-primary scale-110' : ''
                                            }`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                                {isLoading ? 'Saving...' : 'Save'}
                            </Button>
                            <Button variant="secondary" onClick={handleCancelEdit} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <span className="text-danger">💸</span> Expense Categories ({expenseCategories.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {expenseCategories.map(category => (
                                <div
                                    key={category.id}
                                    className="flex items-center justify-between bg-surface-light p-3 rounded-lg hover:bg-surface transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{category.icon}</span>
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: category.color }}
                                        />
                                        <span className="font-medium">{category.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="p-1.5 hover:bg-surface rounded-md transition-colors"
                                        >
                                            <Icons.Edit className="w-4 h-4 text-text-muted" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            className="p-1.5 hover:bg-danger/10 rounded-md transition-colors"
                                        >
                                            <Icons.Trash className="w-4 h-4 text-danger" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <span className="text-success">💰</span> Income Categories ({incomeCategories.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {incomeCategories.map(category => (
                                <div
                                    key={category.id}
                                    className="flex items-center justify-between bg-surface-light p-3 rounded-lg hover:bg-surface transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{category.icon}</span>
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: category.color }}
                                        />
                                        <span className="font-medium">{category.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="p-1.5 hover:bg-surface rounded-md transition-colors"
                                        >
                                            <Icons.Edit className="w-4 h-4 text-text-muted" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            className="p-1.5 hover:bg-danger/10 rounded-md transition-colors"
                                        >
                                            <Icons.Trash className="w-4 h-4 text-danger" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
