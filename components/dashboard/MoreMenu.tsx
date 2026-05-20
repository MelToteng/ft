import React, { useState, useRef, useEffect } from 'react';
import { Button, Icons } from '../ui';

interface MoreMenuProps {
    onRecurring: () => void;
    onImportExport: () => void;
    onCategories: () => void;
    onGetInsight: () => void;
    onViewAllTransactions: () => void;
    isInsightLoading?: boolean;
    onSignOut: () => void;
    onWishLists: () => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({
    onRecurring,
    onImportExport,
    onCategories,
    onGetInsight,
    onViewAllTransactions,
    isInsightLoading = false,
    onSignOut,
    onWishLists,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMenuClick = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-surface-light transition-colors text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Menu"
            >
                <Icons.Menu className="w-6 h-6" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-down">
                    <div className="py-2">
                        <button
                            onClick={() => handleMenuClick(onRecurring)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-light transition-colors flex items-center gap-3 text-text-primary"
                        >
                            <span className="text-lg">🔄</span>
                            <span className="font-medium">Recurring Transactions</span>
                        </button>

                        <button
                            onClick={() => handleMenuClick(onWishLists)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-light transition-colors flex items-center gap-3 text-text-primary"
                        >
                            <span className="text-lg">🛒</span>
                            <span className="font-medium">Wish Lists</span>
                        </button>

                        <button disabled={true}
                            onClick={() => handleMenuClick(onImportExport)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-light transition-colors flex items-center gap-3 text-text-primary"
                        >
                            <span className="text-lg">📥</span>
                            <span className="font-medium">Import/Export</span>
                        </button>

                        <button
                            onClick={() => handleMenuClick(onCategories)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-light transition-colors flex items-center gap-3 text-text-primary"
                        >
                            <span className="text-lg">🏷️</span>
                            <span className="font-medium">Transaction Categories</span>
                        </button>

                        <div className="border-t border-border my-1"></div>

                        <button
                            onClick={() => handleMenuClick(onGetInsight)}
                            disabled={isInsightLoading}
                            className="w-full text-left px-4 py-3 hover:bg-surface-light transition-colors flex items-center gap-3 text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Sparkles className="w-5 h-5" />
                            <span className="font-medium">
                                {isInsightLoading ? 'Analyzing...' : 'Get AI Insight'}
                            </span>
                        </button>

                        <button
                            onClick={() => handleMenuClick(onViewAllTransactions)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-light transition-colors flex items-center gap-3 text-text-primary"
                        >
                            <span className="text-lg">📋</span>
                            <span className="font-medium">All Transactions</span>
                        </button>
                        <button
                            onClick={() => handleMenuClick(onSignOut)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-light transition-colors flex items-center gap-3 text-text-primary"
                        >
                            <span className="text-lg">🚪</span>
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
