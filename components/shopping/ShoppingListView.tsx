import React, { useState, useEffect } from 'react';
import { ShoppingList } from '../../types';
import { getShoppingLists, createShoppingList, deleteShoppingList } from '../../services/supabaseService';
import { Button, Icons, Modal, FormInput } from '../ui';

interface ShoppingListViewProps {
    onNavigate: (view: 'dashboard' | 'wish-list-detail', listId?: number) => void;
    formatCurrency: (value: number) => string;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({ onNavigate, formatCurrency }) => {
    const [lists, setLists] = useState<ShoppingList[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadLists();
    }, []);

    const loadLists = async () => {
        try {
            const data = await getShoppingLists();
            setLists(data);
        } catch (error) {
            console.error('Error loading shopping lists:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim()) return;

        setCreating(true);
        try {
            await createShoppingList({
                name: newListName,
                status: 'active'
            });
            setNewListName('');
            setIsCreateModalOpen(false);
            loadLists();
        } catch (error) {
            console.error('Error creating list:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteList = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this list?')) return;

        try {
            await deleteShoppingList(id);
            loadLists();
        } catch (error) {
            console.error('Error deleting list:', error);
        }
    };

    return (
        <div className="animate-fade-in py-8">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">Wish Lists</h1>
                    <p className="text-text-secondary mt-1">Plan your purchases and track spending.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => onNavigate('dashboard')}>
                        <Icons.ChevronLeft /> Back
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Icons.Plus /> New List
                    </Button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lists.map(list => {
                        const itemCount = list.items?.length || 0;
                        const totalEstimated = list.items?.reduce((sum, item) => sum + (item.estimated_cost || 0), 0) || 0;
                        const completedCount = list.items?.filter(i => i.is_purchased).length || 0;
                        const progress = itemCount > 0 ? (completedCount / itemCount) * 100 : 0;

                        return (
                            <div
                                key={list.id}
                                onClick={() => onNavigate('wish-list-detail', list.id)}
                                className="bg-surface border border-border rounded-2xl p-6 hover:shadow-custom-lg transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">{list.name}</h3>
                                    <button
                                        onClick={(e) => handleDeleteList(list.id, e)}
                                        className="text-text-muted hover:text-danger p-2 rounded-full hover:bg-surface-light transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Icons.Trash />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Items</span>
                                        <span className="font-medium">{completedCount}/{itemCount}</span>
                                    </div>

                                    <div className="w-full bg-surface-light rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-end pt-2">
                                        <div className="text-xs text-text-muted">
                                            {list.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1 text-success bg-success/10 px-2 py-1 rounded-full">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-text-secondary bg-surface-light px-2 py-1 rounded-full">
                                                    {list.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-text-secondary">Estimated</p>
                                            <p className="font-bold text-lg text-text-primary">{formatCurrency(totalEstimated)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {lists.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-surface-light/50 rounded-3xl border border-dashed border-border">
                            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Icons.Sparkles className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-text-primary mb-2">No wish lists yet</h3>
                            <p className="text-text-secondary mb-6">Create a list to start planning your purchases.</p>
                            <Button onClick={() => setIsCreateModalOpen(true)}>
                                Create First List
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New List"
            >
                <form onSubmit={handleCreateList}>
                    <FormInput
                        label="List Name"
                        id="listName"
                        value={newListName}
                        onChange={e => setNewListName(e.target.value)}
                        placeholder="e.g., Weekly Groceries"
                        autoFocus
                    />
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!newListName.trim() || creating}>
                            {creating ? 'Creating...' : 'Create List'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
