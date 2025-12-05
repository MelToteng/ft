import React from 'react';
import { MoreMenu } from '../dashboard/MoreMenu';
import { useTheme } from '../../context/ThemeContext';
import { Icons } from '../ui';
import { NotificationBell } from './NotificationBell';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

interface HeaderProps {
  onSignOut: () => void;
  onRecurring: () => void;
  onImportExport: () => void;
  onCategories: () => void;
  onGetInsight: () => void;
  onViewAllTransactions: () => void;
  onShoppingLists: () => void;
  isInsightLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSignOut,
  onRecurring,
  onImportExport,
  onCategories,
  onGetInsight,
  onViewAllTransactions,
  onShoppingLists,
  isInsightLoading = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { isInstallable, promptInstall } = useInstallPrompt();

  return (
    <header className="my-8 animate-slide-down relative px-4">
      <div className="flex items-center justify-between">
        <div className="w-10 md:w-12 flex justify-start">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-surface-light text-text-secondary hover:text-primary transition-colors hover:bg-surface border border-border-light shadow-custom"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Icons.Moon className="w-5 h-5" /> : <Icons.Sun className="w-5 h-5" />}
          </button>
        </div>
        <div className="w-10 md:w-12 flex justify-start">
          <NotificationBell />
        </div>
        {isInstallable && (
          <div className="w-10 md:w-12 flex justify-start">
            <button
              onClick={promptInstall}
              className="p-2 rounded-full bg-surface-light text-text-secondary hover:text-primary transition-colors hover:bg-surface border border-border-light shadow-custom"
              title="Install App"
            >
              <Icons.Download className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="text-center flex-1">
          <h1 className="text-3xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text mb-2">
            Finance Tracker
          </h1>
          <p className="text-text-secondary text-sm md:text-lg">Modern finance tracking with intelligent insights</p>
        </div>
        <div className="w-10 md:w-12 flex justify-end relative">
          <MoreMenu
            onRecurring={onRecurring}
            onImportExport={onImportExport}
            onCategories={onCategories}
            onGetInsight={onGetInsight}
            onViewAllTransactions={onViewAllTransactions}
            onSignOut={onSignOut}
            onShoppingLists={onShoppingLists}
            isInsightLoading={isInsightLoading}
          />
        </div>
      </div>
    </header>
  );
};
