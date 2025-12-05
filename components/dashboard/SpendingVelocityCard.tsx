import React, { useState } from 'react';
import { Icons } from '../ui';

interface SpendingVelocityCardProps {
    dailyAverage: string;
    projectedSpend: string;
    onTrackStatus: 'on-track' | 'warning' | 'danger';
    savingsRate: number;
    description?: string;
}

export const SpendingVelocityCard: React.FC<SpendingVelocityCardProps> = ({
    dailyAverage,
    projectedSpend,
    onTrackStatus,
    savingsRate,
    description
}) => {
    const [showInfo, setShowInfo] = useState(false);

    const statusColor =
        onTrackStatus === 'on-track' ? 'text-success' :
            onTrackStatus === 'warning' ? 'text-warning' : 'text-danger';

    const savingsColor =
        savingsRate >= 20 ? 'text-success' :
            savingsRate > 0 ? 'text-warning' : 'text-danger';

    return (
        <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-custom-lg group flex flex-col justify-between h-full">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>

            <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-text-secondary uppercase tracking-wider">Spending Velocity</p>
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

            <div className="relative flex-grow flex flex-col justify-end">
                <div className={`transition-opacity duration-300 ${showInfo ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'} space-y-3`}>

                    {/* Daily Average */}
                    <div>
                        <p className="text-3xl font-bold text-text-primary">{dailyAverage}<span className="text-sm font-normal text-text-muted">/day</span></p>
                    </div>

                    {/* Projected & Savings */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                        <div>
                            <p className="text-xs text-text-secondary mb-0.5">Projected</p>
                            <p className={`text-sm font-semibold ${statusColor}`}>{projectedSpend}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary mb-0.5">Savings Rate</p>
                            <p className={`text-sm font-semibold ${savingsColor}`}>{savingsRate.toFixed(1)}%</p>
                        </div>
                    </div>

                </div>

                <div className={`transition-opacity duration-300 ${showInfo ? 'opacity-100' : 'opacity-0 pointer-events-none absolute top-0 left-0 w-full h-full bg-surface/95 backdrop-blur-md rounded-xl p-2 flex items-center'}`}>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        {description || "Tracks your daily spending average and projects your total monthly spend based on current velocity."}
                    </p>
                </div>
            </div>
        </div>
    );
};
