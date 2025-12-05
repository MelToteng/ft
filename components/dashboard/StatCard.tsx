import React, { useState } from 'react';
import { Icons } from '../ui';

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    colorClass: string;
    description?: string;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
        label?: string;
    };
    subValue?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, colorClass, description, trend, subValue }) => {
    const [showInfo, setShowInfo] = useState(false);

    return (
        <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-custom-lg group flex flex-col justify-between h-full">
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

            <div className="relative min-h-[3rem] flex-grow flex flex-col justify-center">
                <div className={`transition-opacity duration-300 ${showInfo ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
                    <div className="flex items-baseline gap-2">
                        <div className={`text-3xl font-bold ${colorClass.replace('bg-', 'text-')}`}>
                            {value}
                        </div>
                        {trend && (
                            <div className={`flex items-center text-sm font-medium ${trend.direction === 'up' ? 'text-success' :
                                    trend.direction === 'down' ? 'text-danger' : 'text-text-muted'
                                }`}>
                                {trend.direction === 'up' ? <Icons.ChevronUp className="w-4 h-4" /> :
                                    trend.direction === 'down' ? <Icons.ChevronDown className="w-4 h-4" /> : null}
                                {Math.abs(trend.value).toFixed(1)}%
                                {trend.label && <span className="text-text-muted ml-1 text-xs font-normal">{trend.label}</span>}
                            </div>
                        )}
                    </div>
                    {subValue && (
                        <div className="mt-1 text-sm text-text-secondary">
                            {subValue}
                        </div>
                    )}
                </div>
                <div className={`transition-opacity duration-300 ${showInfo ? 'opacity-100' : 'opacity-0 pointer-events-none absolute top-0 left-0 w-full h-full bg-surface/95 backdrop-blur-md rounded-xl p-2 flex items-center'}`}>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};
