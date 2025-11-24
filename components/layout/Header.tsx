import React from 'react';

export const Header: React.FC = () => (
  <header className="text-center my-12 animate-slide-down relative">
    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text mb-2">
      Finance Tracker
    </h1>
    <p className="text-text-secondary text-lg">Modern budgeting with intelligent insights</p>
  </header>
);
