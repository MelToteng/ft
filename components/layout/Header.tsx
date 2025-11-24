import React from 'react';
import { MoreMenu } from '../dashboard/MoreMenu';

interface HeaderProps {
  onSignOut: () => void;
  onRecurring: () => void;
  onImportExport: () => void;
  onCategories: () => void;
  onGetInsight: () => void;
  onViewAllTransactions: () => void;
  isInsightLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSignOut,
  onRecurring,
  onImportExport,
  onCategories,
  onGetInsight,
  onViewAllTransactions,
  isInsightLoading = false,
}) => {
  return (
    <header className="my-8 animate-slide-down relative px-4">
      <div className="flex items-center justify-between">
        <div className="w-10 md:w-12"></div> {/* Spacer to balance the menu icon */}
        <div className="text-center flex-1">
          <h1 className="text-3xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text mb-2">
            Finance Tracker
          </h1>
          <p className="text-text-secondary text-sm md:text-lg">Modern budgeting with intelligent insights</p>
        </div>
        <div className="w-10 md:w-12 flex justify-end relative">
          <MoreMenu
            onRecurring={onRecurring}
            onImportExport={onImportExport}
            onCategories={onCategories}
            onGetInsight={onGetInsight}
            onViewAllTransactions={onViewAllTransactions}
            onSignOut={onSignOut}
            isInsightLoading={isInsightLoading}
          />
        </div>
      </div>
    </header>
  );
};
