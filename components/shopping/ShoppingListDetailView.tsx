import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingList, ShoppingListItem, BudgetItem, BudgetPeriod } from '../../types';
import {
    getShoppingLists, updateShoppingList,
    addShoppingListItem, updateShoppingListItem, deleteShoppingListItem,
    shareShoppingList, addTransaction
} from '../../services/supabaseService';
import { Button, Icons, Modal, FormInput, FormSelect } from '../ui';
import { findSimilarItems } from '../../utils/fuzzyMatch';

interface ShoppingListDetailViewProps {
    listId: number;
    onBack: () => void;
    formatCurrency: (value: number) => string;
    budgets: BudgetItem[];
    budgetPeriods: BudgetPeriod[];
}

export const ShoppingListDetailView: React.FC<ShoppingListDetailViewProps> = ({
    listId, onBack, formatCurrency, budgets, budgetPeriods
}) => {
    const [list, setList] = useState<ShoppingList | null>(null);
    const [loading, setLoading] = useState(true);
    const [shoppingMode, setShoppingMode] = useState(false);

    // Item management modal
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
    const [itemName, setItemName] = useState('');
    const [itemQuantity, setItemQuantity] = useState('1');
    const [itemEstimate, setItemEstimate] = useState('');
    const [similarItems, setSimilarItems] = useState<ShoppingListItem[]>([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

    // Sharing
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareToken, setShareToken] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    const [shareExpiration, setShareExpiration] = useState('1'); // Default 1 hour

    // Completion
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

    useEffect(() => {
        loadList();
    }, [listId]);

    const loadList = async () => {
        try {
            const lists = await getShoppingLists();
            const currentList = lists.find(l => l.id === listId);
            if (currentList) setList(currentList);
        } catch (error) {
            console.error('Error loading list:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddItemModal = () => {
        setEditingItem(null);
        setItemName('');
        setItemQuantity('1');
        setItemEstimate('');
        setIsItemModalOpen(true);
        setSimilarItems([]);
        setShowDuplicateWarning(false);
    };

    const openEditItemModal = (item: ShoppingListItem) => {
        setEditingItem(item);
        setItemName(item.name);
        setItemQuantity(item.quantity.toString());
        setItemEstimate(item.estimated_cost.toString());
        setIsItemModalOpen(true);
        setSimilarItems([]);
        setShowDuplicateWarning(false);
    };

    const handleItemNameChange = (name: string) => {
        setItemName(name);

        if (!editingItem && name.trim().length > 2 && list?.items) {
            const similar = findSimilarItems(name, list.items);
            if (similar.length > 0 && similar[0].distance <= 2) {
                setSimilarItems(similar.map(s => s.item));
                setShowDuplicateWarning(true);
            } else {
                setSimilarItems([]);
                setShowDuplicateWarning(false);
            }
        } else {
            setSimilarItems([]);
            setShowDuplicateWarning(false);
        }
    };

    const handleMergeWithExisting = async (existingItem: ShoppingListItem) => {
        try {
            await updateShoppingListItem(existingItem.id, {
                quantity: existingItem.quantity + (parseInt(itemQuantity) || 1)
            });
            setIsItemModalOpen(false);
            loadList();
        } catch (error) {
            console.error('Error merging items:', error);
        }
    };

    const handleFixSpelling = async (existingItem: ShoppingListItem) => {
        try {
            await updateShoppingListItem(existingItem.id, {
                name: itemName // Update to new spelling
            });
            setIsItemModalOpen(false);
            loadList();
        } catch (error) {
            console.error('Error fixing spelling:', error);
        }
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim() || !list) return;

        try {
            if (editingItem) {
                // Update existing item
                await updateShoppingListItem(editingItem.id, {
                    name: itemName,
                    quantity: parseInt(itemQuantity) || 1,
                    estimated_cost: parseFloat(itemEstimate) || 0
                });
            } else {
                // Add new item
                await addShoppingListItem({
                    list_id: list.id,
                    name: itemName,
                    quantity: parseInt(itemQuantity) || 1,
                    estimated_cost: parseFloat(itemEstimate) || 0,
                    actual_cost: 0,
                    is_purchased: false
                });
            }
            setIsItemModalOpen(false);
            loadList();
        } catch (error) {
            console.error('Error saving item:', error);
        }
    };

    const handleToggleItem = async (item: ShoppingListItem, isPurchased: boolean) => {
        // Optimistic update
        if (!list) return;
        const previousItems = list.items;
        const updatedItems = list.items?.map(i =>
            i.id === item.id ? { ...i, is_purchased: isPurchased } : i
        );
        setList({ ...list, items: updatedItems });

        try {
            await updateShoppingListItem(item.id, { is_purchased: isPurchased });
            // No need to reload list, we already have the state
        } catch (error) {
            console.error('Error updating item:', error);
            // Revert on error
            setList({ ...list, items: previousItems });
        }
    };

    const handleUpdateActualCost = async (item: ShoppingListItem, costStr: string) => {
        const cost = parseFloat(costStr) || 0;

        // Optimistic update
        if (!list) return;
        const updatedItems = list.items?.map(i =>
            i.id === item.id ? { ...i, actual_cost: cost } : i
        );
        setList({ ...list, items: updatedItems });

        // Debounce the API call (simple implementation)
        // In a real app, use lodash.debounce or a custom hook. 
        // Here we'll just fire it. For true debouncing we'd need a ref/effect.
        // Given the requirement, let's just do optimistic update + background save.
        // The user won't feel the delay.

        try {
            await updateShoppingListItem(item.id, { actual_cost: cost });
        } catch (error) {
            console.error('Error updating cost:', error);
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (!window.confirm('Remove this item?')) return;
        try {
            await deleteShoppingListItem(id);
            loadList();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    const handleShare = async () => {
        if (!list) return;
        try {
            const expiresInHours = shareExpiration === 'never'
                ? 0 // 0 = never expires
                : parseInt(shareExpiration);
            const token = await shareShoppingList(list.id, shareEmail || undefined, expiresInHours);
            setShareToken(token);
        } catch (error) {
            console.error('Error sharing list:', error);
        }
    };

    const handleCompleteShopping = async () => {
        if (!list) return;

        const totalActual = list.items?.reduce((sum, item) => sum + (item.is_purchased ? item.actual_cost : 0), 0) || 0;

        if (window.confirm(`Complete shopping? This will create a transaction for ${formatCurrency(totalActual)}.`)) {
            try {
                // Create transaction
                await addTransaction({
                    description: `Shopping: ${list.name}`,
                    amount: totalActual,
                    type: 'expense',
                    category: 'Shopping', // Default, could be linked to budget
                    date: new Date().toISOString().split('T')[0],
                    budget_sub_item_id: list.budget_sub_item_id
                });

                // Mark list as completed
                await updateShoppingList(list.id, { status: 'completed' });
                onBack();
            } catch (error) {
                console.error('Error completing shopping:', error);
            }
        }
    };

    const totals = useMemo(() => {
        if (!list?.items) return { estimated: 0, actual: 0, remaining: 0 };
        const estimated = list.items.reduce((sum, i) => sum + i.estimated_cost, 0);
        const actual = list.items.reduce((sum, i) => sum + (i.is_purchased ? i.actual_cost : 0), 0);
        return { estimated, actual };
    }, [list]);

    if (loading || !list) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="animate-fade-in py-8 max-w-4xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Button variant="ghost" onClick={onBack} className="!p-2 -ml-2">
                            <Icons.ChevronLeft />
                        </Button>
                        <h1 className="text-3xl font-bold text-text-primary">{list.name}</h1>
                    </div>
                    <div className="flex gap-4 text-sm text-text-secondary">
                        <span>Estimated: <span className="font-semibold text-text-primary">{formatCurrency(totals.estimated)} | {list.items.length} items</span></span>
                        <span>Actual: <span className={`font-semibold ${totals.actual > totals.estimated ? 'text-danger' : 'text-success'}`}>{formatCurrency(totals.actual)} | {list.items.filter(i => i.is_purchased).length} items</span></span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setIsShareModalOpen(true)}>
                        Share
                    </Button>
                    <Button
                        variant={shoppingMode ? 'primary' : 'secondary'}
                        onClick={() => setShoppingMode(!shoppingMode)}
                    >
                        {shoppingMode ? 'Edit List' : 'Start Shopping'}
                    </Button>
                    {shoppingMode && (
                        <Button onClick={handleCompleteShopping} className="bg-success hover:bg-success-dark text-white">
                            Finish
                        </Button>
                    )}
                </div>
            </header>

            {!shoppingMode && (
                <div className="mb-8">
                    <Button onClick={openAddItemModal} className="w-full md:w-auto">
                        <Icons.Plus /> Add Item
                    </Button>
                </div>
            )}

            <div className="space-y-3">
                {list.items?.map(item => (
                    <div
                        key={item.id}
                        className={`bg-surface border ${item.is_purchased ? 'border-success/30 bg-success/5' : 'border-border'} rounded-xl p-4 transition-all flex items-center gap-4`}
                    >
                        <div className="flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={item.is_purchased}
                                onChange={(e) => handleToggleItem(item, e.target.checked)}
                                className="w-6 h-6 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
                            />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className={`font-medium ${item.is_purchased ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                                    {item.name}
                                </p>
                                {item.quantity > 1 && (
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-semibold">
                                        ×{item.quantity}
                                    </span>
                                )}
                            </div>
                            {!shoppingMode && (
                                <p className="text-xs text-text-secondary">Est: {formatCurrency(item.estimated_cost)}</p>
                            )}
                        </div>

                        {shoppingMode ? (
                            <div className="w-24">
                                {item.is_purchased && (
                                    <input
                                        type="number"
                                        value={item.actual_cost || ''}
                                        onChange={(e) => handleUpdateActualCost(item, e.target.value)}
                                        placeholder="Actual"
                                        className="w-full bg-surface-light border border-border rounded-lg px-2 py-1 text-sm text-right"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditItemModal(item)}
                                    className="text-text-muted hover:text-primary p-2"
                                    title="Edit item"
                                >
                                    <Icons.Edit />
                                </button>
                                <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="text-text-muted hover:text-danger p-2"
                                    title="Delete item"
                                >
                                    <Icons.Trash />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {list.items?.length === 0 && (
                    <div className="text-center py-12 text-text-secondary">
                        List is empty. Add some items above!
                    </div>
                )}
            </div>

            <Modal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                title={editingItem ? 'Edit Item' : 'Add Item'}
            >
                <form onSubmit={handleSaveItem} className="space-y-4">
                    <FormInput
                        label="Item Name"
                        id="modalItemName"
                        value={itemName}
                        onChange={e => handleItemNameChange(e.target.value)}
                        placeholder="What do you need?"
                        required
                        autoFocus
                    />

                    {showDuplicateWarning && similarItems.length > 0 && (
                        <div className="bg-warning/10 border border-warning rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Icons.AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-warning mb-1">
                                        Similar item found
                                    </p>
                                    <p className="text-xs text-text-secondary mb-2">
                                        "{similarItems[0].name}" is already in your list (×{similarItems[0].quantity})
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleMergeWithExisting(similarItems[0])}
                                        >
                                            Increase Quantity
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleFixSpelling(similarItems[0])}
                                        >
                                            Fix Spelling
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowDuplicateWarning(false)}
                                        >
                                            Add Anyway
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <FormInput
                            label="Quantity"
                            id="modalItemQuantity"
                            type="number"
                            min="1"
                            value={itemQuantity}
                            onChange={e => setItemQuantity(e.target.value)}
                            placeholder="1"
                        />

                        <FormInput
                            label="Estimated Cost"
                            id="modalItemCost"
                            type="number"
                            step="0.01"
                            min="0"
                            value={itemEstimate}
                            onChange={e => setItemEstimate(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex gap-3 justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsItemModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!itemName.trim()}>
                            {editingItem ? 'Save Changes' : 'Add Item'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title="Share List"
            >
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Share this list with others to collaborate or let them view it.</p>

                    {!shareToken ? (
                        <>
                            <FormSelect
                                label="Link Expires In"
                                id="shareExpiration"
                                value={shareExpiration}
                                onChange={e => setShareExpiration(e.target.value)}
                            >
                                <option value="1">1 Hour (Default)</option>
                                <option value="6">6 Hours</option>
                                <option value="24">24 Hours</option>
                                <option value="168">7 Days</option>
                                <option value="0">Never</option>
                            </FormSelect>

                            <Button onClick={handleShare} className="w-full">
                                Generate Share Link
                            </Button>
                        </>
                    ) : (
                        <div className="bg-surface-light p-4 rounded-xl border border-border break-all">
                            <p className="text-xs text-text-muted mb-1">Share Link:</p>
                            <p className="font-mono text-sm select-all">
                                {window.location.origin}/share/list/{shareToken}
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
