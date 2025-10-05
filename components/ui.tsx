import React from 'react';

// --- ICONS ---
export const Icons = {
  Plus: ({ className = 'w-5 h-5 flex-shrink-0' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  ),
  X: ({ className = 'w-6 h-6 flex-shrink-0' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  ),
  Trash: ({ className = 'w-4 h-4 flex-shrink-0' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
  ),
  Sparkles: ({ className = 'w-5 h-5 flex-shrink-0' }) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3L9.5 8.5 4 11l5.5 2.5L12 19l2.5-5.5L20 11l-5.5-2.5z"/></svg>
  ),
  Filter: ({ className = 'w-5 h-5 flex-shrink-0' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
  ),
  ChevronDown: ({ className = 'w-5 h-5 flex-shrink-0' }) => (
    <svg xmlns="http://www.w.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 12 15 18 9"></polyline></svg>
  ),
  Google: ({ className = 'w-5 h-5 flex-shrink-0' }) => (
    <svg className={className} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-5.993 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .333 5.393.333 12.16s5.534 12.16 12.147 12.16c3.2 0 5.64-1.12 7.627-3.453 2.04-2.387 2.6-5.64 2.6-8.32 0-.64-.053-1.28-.187-1.84H12.48z" fill="currentColor"/></svg>
  ),
  GitHub: ({ className = 'w-5 h-5 flex-shrink-0' }) => (
    <svg className={className} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="currentColor"/></svg>
  ),
};

// --- REUSABLE UI COMPONENTS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-custom hover:-translate-y-0.5 hover:shadow-custom-lg focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-custom';
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary to-primary-dark text-white',
    secondary: 'bg-surface-light border border-border-light text-text-primary hover:bg-surface-light/80',
    ghost: 'bg-transparent shadow-none text-text-secondary hover:text-text-primary hover:bg-surface-light/50',
  };
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-surface border border-border-light rounded-4xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto relative shadow-custom-lg animate-slide-up-modal"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-secondary rounded-t-4xl"></div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors rounded-full p-2 -mr-2">
                        <Icons.X />
                    </button>
                </div>
                {children}
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up-modal { from { transform: translateY(20px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .animate-slide-up-modal { animation: slide-up-modal 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            `}</style>
        </div>
    );
};

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
export const FormInput: React.FC<FormInputProps> = ({ label, id, ...props }) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
        <input id={id} {...props} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors disabled:opacity-50" />
    </div>
);

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label: string; }
export const FormSelect: React.FC<FormSelectProps> = ({ label, id, children, ...props }) => (
    <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
        <select id={id} {...props} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors appearance-none bg-no-repeat bg-right-4" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A1A1AA' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundSize: '1.5em 1.5em'}}>
            {children}
        </select>
    </div>
);
