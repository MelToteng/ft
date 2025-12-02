import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button, FormInput, Icons } from './ui';

interface AuthProps {
    viewMode?: 'full' | 'embedded';
    onSuccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ viewMode = 'full', onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (onSuccess) onSuccess();
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ text: 'Check your email for the login link!', type: 'success' });
                // Don't call onSuccess for signup as they need to verify email usually, 
                // unless auto-confirm is on. But 'Check email' implies wait.
            }
        } catch (error: any) {
            setMessage({ text: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const containerClasses = viewMode === 'full'
        ? "flex flex-col items-center justify-center min-h-screen bg-background p-4"
        : "w-full";

    const cardClasses = viewMode === 'full'
        ? "w-full max-w-md bg-surface/50 backdrop-blur-xl p-8 rounded-4xl border border-border shadow-2xl animate-fade-in"
        : "w-full animate-fade-in";

    return (
        <div className={containerClasses}>
            <div className={cardClasses}>
                <div className="text-center mb-8">
                    {viewMode === 'full' && (
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-4">
                            <Icons.Sparkles className="w-8 h-8" />
                        </div>
                    )}
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-text-secondary mt-2">
                        {isLogin ? 'Sign in to access your finances' : 'Start your journey to financial freedom'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <FormInput
                        label="Email"
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                    <FormInput
                        label="Password"
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    {message && (
                        <div className={`p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                            {message.text}
                        </div>
                    )}

                    <Button type="submit" className="w-full py-3 text-lg" disabled={loading}>
                        {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => { setIsLogin(!isLogin); setMessage(null); }}
                        className="text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
};
