
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, TransactionType, Budget, Budgets, BudgetPeriod, GeminiInsightData, Notification } from './types';
import { getFinancialInsight } from './services/geminiService';
import {
  getTransactions,
  addTransaction as dbAddTransaction,
  deleteTransaction as dbDeleteTransaction,
  getBudgets,
  upsertBudget as dbUpsertBudget,
  deleteBudget as dbDeleteBudget,
} from './services/sqliteService';
import { Button, Modal, FormInput, FormSelect, Icons } from './components/ui';


// --- UTILITY FUNCTIONS ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'BWP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const calculateCurrentPeriod = (budget: Budget, today: Date): { start: Date; end: Date } => {
    const { period, startDay = 1 } = budget;
    let startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);

    switch (period) {
        case 'monthly':
            const relevantMonth = today.getDate() >= startDay ? today.getMonth() : today.getMonth() - 1;
            startDate = new Date(today.getFullYear(), relevantMonth, startDay);
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDay - 1);
            break;
        case 'weekly':
            const weekStartDay = startDay > 6 ? 1 : startDay; // Default to Monday if invalid
            const currentDayOfWeek = today.getDay();
            let dayDifference = currentDayOfWeek - weekStartDay;
            if (dayDifference < 0) dayDifference += 7;
            startDate.setDate(today.getDate() - dayDifference);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
        case 'yearly':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
        case 'quarterly':
            const currentQuarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0);
            break;
    }
    endDate.setHours(23, 59, 59, 999);
    return { start: startDate, end: endDate };
};


// --- UI COMPONENTS ---

const BackgroundShapes = () => (
  <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
    <div className="absolute w-52 h-52 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 top-[10%] right-[10%] animate-[float_8s_ease-in-out_infinite]"></div>
    <div className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 bottom-[20%] left-[5%] animate-[float_10s_ease-in-out_2s_infinite]"></div>
    <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 top-[50%] right-[20%] animate-[float_6s_ease-in-out_4s_infinite]"></div>
    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
        50% { transform: translateY(-25px) rotate(180deg) scale(1.05); }
      }
    `}</style>
  </div>
);

const Header: React.FC = () => (
  <header className="text-center my-12 animate-slide-down relative">
    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text mb-2">
      Finance Tracker
    </h1>
    <p className="text-text-secondary text-lg">Modern budgeting with intelligent insights</p>
  </header>
);

interface StatCardProps {
  label: string;
  value: string | number;
  colorClass: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, colorClass }) => (
    <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border relative overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-custom-lg">
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorClass}`}></div>
        <p className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">{label}</p>
        <p className={`text-3xl font-bold ${colorClass.replace('bg-','text-')}`}>
            {typeof value === 'number' ? formatCurrency(value) : value}
        </p>
    </div>
);


// --- MAIN APP COMPONENT ---
export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budgets>({});
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [insight, setInsight] = useState<GeminiInsightData | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState({
      type: 'all' as 'all' | 'income' | 'expense',
      categories: [] as string[],
      startDate: '',
      endDate: '',
      description: ''
  });

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [transactionsData, budgetsData] = await Promise.all([
          getTransactions(),
          getBudgets()
        ]);
        setTransactions(transactionsData);
        setBudgets(budgetsData);
      } catch (error: any) {
        addNotification(error.message || 'Failed to load data from database.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [addNotification]);
  
  const filteredTransactions = useMemo(() => {
      return transactions
          .filter(t => {
              if (filters.type === 'all') return true;
              return t.type === filters.type;
          })
          .filter(t => {
              if (filters.categories.length === 0) return true;
              return filters.categories.includes(t.category);
          })
          .filter(t => {
              if (!filters.startDate) return true;
              return new Date(t.date) >= new Date(filters.startDate);
          })
          .filter(t => {
              if (!filters.endDate) return true;
              const endDate = new Date(filters.endDate);
              endDate.setHours(23, 59, 59, 999);
              return new Date(t.date) <= endDate;
          })
          .filter(t => {
              if (!filters.description) return true;
              return t.description.toLowerCase().includes(filters.description.toLowerCase());
          })
          .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filters]);

  const { totalIncome, totalExpenses, balance } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome: income, totalExpenses: expenses, balance: income - expenses };
  }, [transactions]);

  const financialRunway = useMemo(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentExpenses = transactions
          .filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo)
          .reduce((sum, t) => sum + t.amount, 0);
      
      if (recentExpenses <= 0) return '∞';
      
      const avgDailyExpense = recentExpenses / 30;
      if (balance <= 0) return '0 days';
      
      return `${Math.floor(balance / avgDailyExpense)} days`;
  }, [transactions, balance]);
  
  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
        const newTransaction = await dbAddTransaction(transaction);
        setTransactions(prev => [newTransaction, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setActiveModal(null);
        addNotification(`${transaction.type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
    } catch(error: any) {
        addNotification(error.message, 'error');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await dbDeleteTransaction(id);
        setTransactions(transactions.filter(t => t.id !== id));
        addNotification('Transaction deleted.', 'info');
      } catch(error: any) {
        addNotification(error.message, 'error');
      }
    }
  };

  const handleAddBudget = async (category: string, budgetData: Budget) => {
      if (!category || budgetData.amount <= 0) {
        addNotification('Please enter a valid category and amount.', 'error');
        return;
      }
      try {
        await dbUpsertBudget(category, budgetData);
        setBudgets(prev => ({ ...prev, [category]: budgetData }));
        addNotification('Budget category saved!', 'success');
      } catch(error: any) {
        addNotification(error.message, 'error');
      }
  };

  const handleDeleteBudget = async (category: string) => {
    if(window.confirm(`Are you sure you want to delete the "${category}" budget?`)) {
        try {
            await dbDeleteBudget(category);
            const newBudgets = { ...budgets };
            delete newBudgets[category];
            setBudgets(newBudgets);
            addNotification('Budget category removed.', 'info');
        } catch(error: any) {
            addNotification(error.message, 'error');
        }
    }
  };
  
  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = 0;
    const data = sorted.map(t => {
      runningBalance += t.type === 'income' ? t.amount : -t.amount;
      return {
        date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: runningBalance
      };
    });
    return [{date: 'Start', balance: 0}, ...data];
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryMap = new Map<string, number>();
    expenses.forEach(t => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
    });
    
    const sorted = Array.from(categoryMap.entries())
                        .map(([name, value]) => ({ name, value }))
                        .sort((a, b) => b.value - a.value);

    const topN = 5;
    if (sorted.length > topN) {
      const top = sorted.slice(0, topN);
      const otherValue = sorted.slice(topN).reduce((acc, curr) => acc + curr.value, 0);
      return [...top, { name: 'Other', value: otherValue }];
    }
    return sorted;

  }, [transactions]);

  const handleGetInsight = async () => {
    if (transactions.length < 5) {
        addNotification('Need at least 5 transactions for a meaningful insight.', 'info');
        return;
    }
    setIsInsightLoading(true);
    setInsightError(null);
    try {
        const result = await getFinancialInsight(transactions);
        setInsight(result);
        setActiveModal('insight');
    } catch (error: any) {
        setInsightError(error.message || 'An unknown error occurred.');
        addNotification(error.message || 'An unknown error occurred.', 'error');
    } finally {
        setIsInsightLoading(false);
    }
  };
  
  const allCategories = useMemo(() => {
      const categories = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category));
      Object.keys(budgets).forEach(cat => categories.add(cat));
      if (!categories.has('Other')) categories.add('Other');
      return Array.from(categories);
  }, [transactions, budgets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-text-secondary">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  const PIE_CHART_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6366F1'];


  return (
    <>
      <BackgroundShapes />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen relative z-10">
        <Header />
        
        <section className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up">
            <Button onClick={() => setActiveModal('income')}>💰 Add Income</Button>
            <Button onClick={() => setActiveModal('expense')}>💸 Add Expense</Button>
            <Button variant="secondary" onClick={() => setActiveModal('budget')}>📊 Manage Budgets</Button>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-in">
            <StatCard label="Total Income" value={totalIncome} colorClass="bg-success" />
            <StatCard label="Total Expenses" value={totalExpenses} colorClass="bg-danger" />
            <StatCard label="Current Balance" value={balance} colorClass="bg-primary" />
            <StatCard label="Financial Runway" value={financialRunway} colorClass="bg-warning" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96">
                <h3 className="text-xl font-bold mb-4">Balance Trend</h3>
                {transactions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#71717A" tick={{fontSize: 12}} dy={10} />
                            <YAxis stroke="#71717A" tickFormatter={formatCurrency} tick={{fontSize: 12}} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                            <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #27272A', borderRadius: '1rem' }} />
                            <Area type="monotone" dataKey="balance" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-text-muted">Add transactions to see your balance trend.</div>}
            </div>
            <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96">
                <h3 className="text-xl font-bold mb-4">Spending Breakdown</h3>
                {spendingByCategory.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={spendingByCategory}
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="80%"
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                            >
                                {spendingByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => `${formatCurrency(value)} (${((value / totalExpenses) * 100).toFixed(1)}%)`}
                                contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #27272A', borderRadius: '1rem' }}
                            />
                            <Legend iconSize={10} wrapperStyle={{bottom: 25, fontSize: '12px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-text-muted">Add expenses to see your spending breakdown.</div>}
            </div>
            <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border h-96 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Budget Progress</h3>
                {Object.keys(budgets).length > 0 ? Object.entries(budgets).map(([category, budget]) => {
                  const period = calculateCurrentPeriod(budget, new Date());
                  const spent = transactions.filter(t => t.type === 'expense' && t.category === category && new Date(t.date) >= period.start && new Date(t.date) <= period.end)
                                            .reduce((sum, t) => sum + t.amount, 0);
                  const percentage = Math.min((spent / budget.amount) * 100, 100);
                  const progressClass = percentage > 90 ? 'bg-danger' : percentage > 70 ? 'bg-warning' : 'bg-success';
                  return (
                      <div key={category} className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="font-semibold">{category}</span>
                              <span className="text-text-muted">{formatCurrency(spent)} / {formatCurrency(budget.amount)}</span>
                          </div>
                          <div className="w-full bg-surface-light rounded-full h-2.5">
                              <div className={`${progressClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                          </div>
                      </div>
                  )
                }) : <div className="flex items-center justify-center h-full text-text-muted">Set budgets to track your spending.</div>}
            </div>
        </section>
        
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border lg:col-span-2">
                 <TransactionFilters
                    allCategories={allCategories}
                    filters={filters}
                    onFilterChange={setFilters}
                />
                <div className="space-y-3 h-96 overflow-y-auto pr-2 mt-4">
                {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-light/50 transition-colors">
                        <div>
                            <p className="font-semibold">{t.description}</p>
                            <p className="text-xs text-text-muted">{t.category} &middot; {new Date(t.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className={`font-bold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </p>
                            <button onClick={() => handleDeleteTransaction(t.id)} className="text-text-muted hover:text-danger transition-colors p-1.5 rounded-md hover:bg-danger/10">
                                <Icons.Trash />
                            </button>
                        </div>
                    </div>
                )) : <div className="text-center py-10 text-text-muted">No transactions match the current filters.</div>}
                </div>
            </div>

            <div className="bg-surface/50 backdrop-blur-xl p-6 rounded-4xl border border-border flex flex-col justify-center items-center text-center">
                 <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
                    <Icons.Sparkles className="w-8 h-8 text-primary-light"/>
                 </div>
                <h3 className="text-xl font-bold mb-2">Intelligent Insights</h3>
                <p className="text-text-secondary mb-6 max-w-sm">Let Gemini analyze your spending and provide personalized financial advice.</p>
                 <Button onClick={handleGetInsight} disabled={isInsightLoading}>
                     {isInsightLoading ? 'Analyzing...' : <><Icons.Sparkles/> Get AI Insight</>}
                </Button>
                {insightError && <p className="text-danger text-sm mt-4">{insightError}</p>}
            </div>
        </section>

      </div>

      <TransactionFormModal
        isOpen={activeModal === 'income' || activeModal === 'expense'}
        onClose={() => setActiveModal(null)}
        type={activeModal as TransactionType}
        onSubmit={handleAddTransaction}
        budgetedCategories={Object.keys(budgets)}
      />
      
      <BudgetModal
        isOpen={activeModal === 'budget'}
        onClose={() => setActiveModal(null)}
        budgets={budgets}
        onAddBudget={handleAddBudget}
        onDeleteBudget={handleDeleteBudget}
      />

       <Modal isOpen={activeModal === 'insight'} onClose={() => setActiveModal(null)} title="Your Financial Insight">
            {insight && (
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-primary-light mb-2">Summary</h4>
                        <p className="text-text-secondary">{insight.summary}</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-primary-light mb-2">Suggestions</h4>
                        <ul className="list-disc list-inside space-y-2 text-text-secondary">
                            {insight.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-primary-light mb-2">Top Spending Habits</h4>
                        <div className="space-y-3">
                            {insight.spendingHabits.map((habit) => (
                                <div key={habit.category}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold">{habit.category}</span>
                                        <span className="text-text-muted">{habit.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-surface-light rounded-full h-2.5">
                                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${habit.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Modal>

      <div className="fixed top-5 right-5 z-[100] space-y-3">
        {notifications.map(n => (
          <div key={n.id} className={`px-6 py-3 rounded-xl shadow-lg text-white font-semibold text-sm animate-slide-in-right ${n.type === 'success' ? 'bg-success' : n.type === 'error' ? 'bg-danger' : 'bg-primary'}`}>
            {n.message}
          </div>
        ))}
      </div>
       <style>{`
          @keyframes slide-in-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
          @keyframes slide-down { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slide-down { animation: slide-down 0.5s ease-out; }
          @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slide-up { animation: slide-up 0.5s ease-out 0.2s both; }
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fade-in 0.5s ease-out 0.4s both; }
       `}</style>
    </>
  );
}


// --- FORM & FILTER COMPONENTS ---

interface TransactionFiltersProps {
    allCategories: string[];
    filters: {
        type: 'all' | 'income' | 'expense';
        categories: string[];
        startDate: string;
        endDate: string;
        description: string;
    };
    onFilterChange: React.Dispatch<React.SetStateAction<any>>;
}
const TransactionFilters: React.FC<TransactionFiltersProps> = ({ allCategories, filters, onFilterChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);

    const handleFilterChange = (field: string, value: any) => {
        onFilterChange((prev: any) => ({ ...prev, [field]: value }));
    };
    
    const handleCategoryChange = (category: string) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...filters.categories, category];
        handleFilterChange('categories', newCategories);
    };

    const resetFilters = () => {
        onFilterChange({ type: 'all', categories: [], startDate: '', endDate: '', description: '' });
    };

    const categoryButtonText = () => {
        const count = filters.categories.length;
        if (count === 0) return 'Select categories';
        if (count === 1) return filters.categories[0];
        return `${count} categories selected`;
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold">Recent Transactions</h3>
                <Button variant="secondary" onClick={() => setIsOpen(!isOpen)}>
                    <Icons.Filter />
                    <span>Filters</span>
                    <Icons.ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </Button>
            </div>
             {isOpen && (
                <div className="mt-4 p-4 bg-surface rounded-2xl border border-border-light">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 rounded-xl bg-surface-light p-1">
                            {(['all', 'income', 'expense'] as const).map(type => (
                                <button key={type} onClick={() => handleFilterChange('type', type)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${filters.type === type ? 'bg-primary text-white' : 'text-text-secondary hover:bg-border-light'}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                         <Button variant="ghost" onClick={resetFilters} className="text-sm">Reset</Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="description-search" className="block text-sm font-medium text-text-secondary mb-2">Search Description</label>
                            <input 
                                id="description-search"
                                type="text"
                                placeholder="e.g., Coffee, Salary..."
                                value={filters.description}
                                onChange={e => handleFilterChange('description', e.target.value)}
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="relative" ref={categoryDropdownRef}>
                           <label className="block text-sm font-medium text-text-secondary mb-2">Categories</label>
                           <button onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-left text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors flex justify-between items-center">
                               <span className="truncate">{categoryButtonText()}</span>
                               <Icons.ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                           </button>
                           {isCategoryDropdownOpen && (
                               <div className="absolute z-10 top-full mt-2 w-full bg-surface border border-border-light rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                   {allCategories.map(cat => (
                                       <label key={cat} className="flex items-center px-4 py-2 hover:bg-surface-light cursor-pointer">
                                           <input type="checkbox" checked={filters.categories.includes(cat)} onChange={() => handleCategoryChange(cat)} className="h-4 w-4 rounded bg-surface-light border-border text-primary focus:ring-primary"/>
                                           <span className="ml-3 text-text-primary">{cat}</span>
                                       </label>
                                   ))}
                               </div>
                           )}
                       </div>
                       <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Start Date</label>
                            <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors"/>
                       </div>
                       <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">End Date</label>
                            <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors"/>
                       </div>
                   </div>
                </div>
            )}
        </div>
    );
};


interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: TransactionType | null;
    onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
    budgetedCategories: string[];
}
const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose, type, onSubmit, budgetedCategories }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('Other');
    
    useEffect(() => {
        if(isOpen) {
            setDescription('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setCategory(type === 'income' ? 'Income' : 'Other');
        }
    }, [isOpen, type]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!type) return;
        onSubmit({ description, amount: parseFloat(amount), date, category, type });
    };

    if (!type) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={type === 'income' ? 'Add Income' : 'Add Expense'}>
            <form onSubmit={handleSubmit}>
                <FormInput label="Description" id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'income' ? 'e.g., Salary' : 'e.g., Groceries'} required />
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Amount" id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" required />
                    {type === 'expense' ? (
                        <FormSelect label="Category" id="category" value={category} onChange={e => setCategory(e.target.value)}>
                            <option>Other</option>
                            {budgetedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </FormSelect>
                    ) : <FormInput label="Category" id="category" type="text" value="Income" disabled />}
                </div>
                 <FormInput label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                <Button type="submit" className="w-full mt-4">{type === 'income' ? 'Add Income' : 'Add Expense'}</Button>
            </form>
        </Modal>
    );
};

interface BudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgets: Budgets;
    onAddBudget: (category: string, budgetData: Budget) => void;
    onDeleteBudget: (category: string) => void;
}
const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, budgets, onAddBudget, onDeleteBudget }) => {
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState<BudgetPeriod>('monthly');
    const [startDay, setStartDay] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddBudget(category, {
            amount: parseFloat(amount), 
            period, 
            startDay: startDay ? parseInt(startDay) : undefined
        });
        setCategory('');
        setAmount('');
        setStartDay('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Budgets">
            <form onSubmit={handleSubmit} className="mb-6">
                 <FormInput label="Category Name" id="budgetCategory" type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Groceries" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Budget Amount" id="budgetAmount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    <FormSelect label="Period" id="budgetPeriod" value={period} onChange={e => setPeriod(e.target.value as BudgetPeriod)}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </FormSelect>
                </div>
                <FormInput label="Start Day (optional)" id="startDay" type="number" value={startDay} onChange={e => setStartDay(e.target.value)} placeholder={period === 'weekly' ? '1 for Mon, 7 for Sun' : 'e.g., 15 for 15th'} />
                <Button type="submit" className="w-full">Add/Update Budget</Button>
            </form>
            <div className="space-y-3 max-h-60 overflow-y-auto">
                <h3 className="text-lg font-semibold text-text-secondary">Existing Budgets</h3>
                {Object.keys(budgets).length > 0 ? Object.entries(budgets).map(([cat, budget]) => (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-surface-light">
                        <div>
                            <p className="font-semibold">{cat}</p>
                            <p className="text-xs text-text-muted capitalize">{budget.period} (Starts day {budget.startDay || 1})</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="font-medium">{formatCurrency(budget.amount)}</p>
                             <button onClick={() => onDeleteBudget(cat)} className="text-text-muted hover:text-danger transition-colors p-1.5 rounded-md hover:bg-danger/10">
                                <Icons.Trash />
                            </button>
                        </div>
                    </div>
                )) : <p className="text-text-muted text-center py-4">No budgets have been set.</p>}
            </div>
        </Modal>
    );
};
