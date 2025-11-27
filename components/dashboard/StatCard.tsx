import React, { useState } from 'react';
import { Icons } from '../ui';

interface StatCardProps {
    label: string;
    value: string;
    colorClass: string;
    description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, colorClass, description }) => {
    const [showInfo, setShowInfo] = useState(false);

    return (
        <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-custom-lg group">
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorClass}`}></div>
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-text-secondary uppercase tracking-wider">{label}</p>
                {description && (
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-full hover:bg-surface-light"
                        title="More info"
                    >
                        <Icons.Info className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="relative min-h-[2.5rem] flex items-center">
                <div className={`transition-opacity duration-300 ${showInfo ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
                    <p className={`text-3xl font-bold ${colorClass.replace('bg-', 'text-')}`}>
                        {value}
                    </p>
                </div>
                <div className={`transition-opacity duration-300 ${showInfo ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};
