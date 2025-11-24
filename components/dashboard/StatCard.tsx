import React from 'react';

interface StatCardProps {
    label: string;
    value: string;
    colorClass: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, colorClass }) => (
    <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-custom-lg">
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorClass}`}></div>
        <p className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">{label}</p>
        <p className={`text-3xl font-bold ${colorClass.replace('bg-', 'text-')}`}>
            {value}
        </p>
    </div>
);
