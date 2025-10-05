
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initDb } from './services/sqliteService';

const AppContainer = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeDatabase = async () => {
            try {
                await initDb();
                setLoading(false);
            } catch (e: any) {
                console.error("Database initialization failed:", e);
                setError(e.message || 'Failed to initialize the local database.');
                setLoading(false);
            }
        };

        initializeDatabase();
    }, []);

    if (loading) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-text-secondary">Initializing Local Database...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-danger p-4">
                <div className="text-center bg-surface p-8 rounded-2xl border border-danger max-w-lg">
                    <h2 className="text-2xl font-bold mb-4 text-white">Database Error</h2>
                    <p className="font-mono bg-surface-light p-4 rounded-lg text-sm">{error}</p>
                    <p className="mt-4 text-sm text-text-muted">Could not start the application. Please ensure your browser supports WebAssembly and IndexedDB.</p>
                </div>
            </div>
        )
    }

    return <App />;
};


const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <AppContainer />
    </React.StrictMode>
);
