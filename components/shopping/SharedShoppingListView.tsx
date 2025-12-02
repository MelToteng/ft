import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingList, ShoppingListItem } from '../../types';
import { getSharedShoppingList, updateSharedShoppingListItem, joinShoppingList, notifyListCompletion, notifyListViewed } from '../../services/supabaseService';
import { supabase } from '../../services/supabaseClient';
import { Icons, Button, Modal } from '../ui';
import { Auth } from '../Auth';

interface SharedShoppingListViewProps {
    token: string;
}

export const SharedShoppingListView: React.FC<SharedShoppingListViewProps> = ({ token }) => {
    const [list, setList] = useState<ShoppingList | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [joining, setJoining] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setIsAuthModalOpen(false);
            }
        });

        loadList();

        // Notify owner that list was viewed
        notifyListViewed(token).catch(err =>
            console.error('Failed to notify view:', err)
        );

        return () => subscription.unsubscribe();
    }, [token]);

    const loadList = async () => {
        try {
            const data = await getSharedShoppingList(token);
            if (data) {
                setList(data);
            } else {
                setError('List not found or expired.');
            }
        } catch (err) {
            console.error('Error loading shared list:', err);
            setError('Failed to load list.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleItem = async (item: ShoppingListItem, isPurchased: boolean) => {
        // Optimistic update
        if (!list) return;

        const updatedItems = list.items?.map(i =>
            i.id === item.id ? { ...i, is_purchased: isPurchased } : i
        );
        setList({ ...list, items: updatedItems });

        try {
            await updateSharedShoppingListItem(token, item.id, isPurchased, item.actual_cost);
        } catch (err) {
            console.error('Error updating item:', err);
            // Revert on error
            loadList();
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

        try {
            await updateSharedShoppingListItem(token, item.id, item.is_purchased, cost);
        } catch (err) {
            console.error('Error updating cost:', err);
        }
    };

    const handleJoinList = async () => {
        setJoining(true);
        try {
            await joinShoppingList(token);
            // Redirect to main app
            window.location.href = '/';
        } catch (err) {
            console.error('Error joining list:', err);
            alert('Failed to join list.');
        } finally {
            setJoining(false);
        }
    };

    const totals = useMemo(() => {
        if (!list?.items) return { estimated: 0, actual: 0 };
        const estimated = list.items.reduce((sum, i) => sum + i.estimated_cost, 0);
        const actual = list.items.reduce((sum, i) => sum + (i.is_purchased ? i.actual_cost : 0), 0);
        return { estimated, actual };
    }, [list]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD', // Default for shared view
        }).format(value);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary p-4">
            <div className="text-center p-8 bg-surface rounded-2xl border border-border shadow-lg max-w-md">
                <Icons.AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Link Expired</h2>
                <p className="text-text-secondary mb-4">{error}</p>
                <p className="text-sm text-text-muted">This share link has expired or is no longer valid. Please ask the list owner to generate a new link.</p>
            </div>
        </div>
    );

    if (!list) return null;

    return (
        <div className="min-h-screen bg-background text-text-primary p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text mb-2">
                        {list.name}
                    </h1>
                    <p className="text-text-secondary mb-4">Shared Shopping List</p>
                </header>

                {/* Stats & Actions */}
                <div className="bg-surface/50 backdrop-blur-xl rounded-3xl p-6 border border-border mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        {user ? (
                            <Button onClick={handleJoinList} disabled={joining}>
                                {joining ? 'Joining...' : 'Add to My Lists'}
                            </Button>
                        ) : (
                            <Button onClick={() => setIsAuthModalOpen(true)} variant="secondary">
                                Add more items to the list...
                            </Button>
                        )}
                    </div>

                    <Button
                        onClick={async () => {
                            try {
                                await notifyListCompletion(token);
                                alert('Owner notified that shopping is complete!');
                            } catch (err) {
                                alert('Error notifying owner.');
                            }
                        }}
                        className="w-full md:w-auto"
                    >
                        I'm Done Shopping
                    </Button>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6 shadow-custom-lg mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-sm text-text-secondary">Total Estimated</p>
                            <p className="text-xl font-bold">{formatCurrency(totals.estimated)}</p>
                            <p className="text-sm text-text-secondary">{list.items?.length || 0} Items</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-text-secondary">Current Total</p>
                            <p className={`text-xl font-bold ${totals.actual > totals.estimated ? 'text-danger' : 'text-success'}`}>
                                {formatCurrency(totals.actual)}
                            </p>
                            <p className="text-sm text-text-secondary">{list.items?.filter(i => i.is_purchased).length || 0} Items</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {list.items?.map(item => (
                            <div
                                key={item.id}
                                className={`bg-surface-light border ${item.is_purchased ? 'border-success/30 bg-success/5' : 'border-border'} rounded-xl p-4 transition-all flex items-center gap-4`}
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
                                    <p className="text-xs text-text-secondary">Est: {formatCurrency(item.estimated_cost)}</p>
                                </div>

                                <div className="w-24">
                                    {item.is_purchased && (
                                        <input
                                            type="number"
                                            value={item.actual_cost || ''}
                                            onChange={(e) => handleUpdateActualCost(item, e.target.value)}
                                            placeholder="Actual"
                                            className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-sm text-right focus:ring-1 focus:ring-primary focus:outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center text-sm text-text-muted">
                    <p>Powered by Finance Tracker</p>
                </div>
            </div>
            <Modal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                title="Log In or Sign Up"
            >
                <Auth viewMode="embedded" onSuccess={() => setIsAuthModalOpen(false)} />
            </Modal>
        </div>
    );
};
