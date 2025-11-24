import { supabase } from './supabaseClient';
import { Transaction, BudgetItem, BudgetPeriod } from '../types';

// --- TRANSACTIONS ---

export const getTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

    if (error) throw error;
    return data as Transaction;
};

export const deleteTransaction = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- BUDGET PERIODS ---

export const getBudgetPeriods = async (): Promise<BudgetPeriod[]> => {
    // Select snake_case columns and map them to camelCase
    const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .order('start_date', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        startDate: item.start_date,
        endDate: item.end_date
    }));
};

export const addBudgetPeriod = async (period: Omit<BudgetPeriod, 'id'>): Promise<BudgetPeriod> => {
    const { data, error } = await supabase
        .from('budget_periods')
        .insert([{
            name: period.name,
            start_date: period.startDate,
            end_date: period.endDate
        }])
        .select()
        .single();

    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date
    };
};

export const updateBudgetPeriod = async (period: BudgetPeriod): Promise<void> => {
    const { error } = await supabase
        .from('budget_periods')
        .update({
            name: period.name,
            start_date: period.startDate,
            end_date: period.endDate
        })
        .eq('id', period.id);

    if (error) throw error;
};

export const deleteBudgetPeriod = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('budget_periods')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- BUDGET ITEMS ---

export const getBudgets = async (): Promise<BudgetItem[]> => {
    const { data, error } = await supabase
        .from('budgets')
        .select('*');

    if (error) throw error;
    return data.map((item: any) => ({
        id: item.id,
        budgetPeriodId: item.budget_period_id,
        category: item.category,
        amount: item.amount
    }));
};

export const saveBudgets = async (periodId: number, budgetsToSave: { category: string; amount: number }[]): Promise<void> => {
    // 1. Delete existing budgets for this period
    const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('budget_period_id', periodId);

    if (deleteError) throw deleteError;

    // 2. Insert new budgets
    if (budgetsToSave.length > 0) {
        const { error: insertError } = await supabase
            .from('budgets')
            .insert(budgetsToSave.map(b => ({
                budget_period_id: periodId,
                category: b.category,
                amount: b.amount
            })));

        if (insertError) throw insertError;
    }
};

// --- SETTINGS ---
export const getSetting = async (key: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .maybeSingle(); // Use maybeSingle() to avoid 406 error when no row is found

    if (error) {
        console.error('Error fetching setting:', error);
        return null;
    }
    return data ? data.value : null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
    const { error } = await supabase
        .from('settings')
        .upsert({ key, value });

    if (error) throw error;
};

// --- RECURRING TRANSACTIONS ---

export const getRecurringTransactions = async (): Promise<import('../types').RecurringTransaction[]> => {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
        id: item.id,
        description: item.description,
        amount: parseFloat(item.amount),
        type: item.type,
        category: item.category,
        frequency: item.frequency,
        dayOfPeriod: item.day_of_period,
        startDate: item.start_date,
        endDate: item.end_date,
        isActive: item.is_active,
    }));
};

export const addRecurringTransaction = async (
    transaction: Omit<import('../types').RecurringTransaction, 'id'>
): Promise<import('../types').RecurringTransaction> => {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .insert([{
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            frequency: transaction.frequency,
            day_of_period: transaction.dayOfPeriod,
            start_date: transaction.startDate,
            end_date: transaction.endDate,
            is_active: transaction.isActive,
        }])
        .select()
        .single();

    if (error) throw error;

    return {
        id: data.id,
        description: data.description,
        amount: parseFloat(data.amount),
        type: data.type,
        category: data.category,
        frequency: data.frequency,
        dayOfPeriod: data.day_of_period,
        startDate: data.start_date,
        endDate: data.end_date,
        isActive: data.is_active,
    };
};

export const updateRecurringTransaction = async (
    id: number,
    transaction: Partial<Omit<import('../types').RecurringTransaction, 'id'>>
): Promise<void> => {
    const updateData: any = {};
    if (transaction.description !== undefined) updateData.description = transaction.description;
    if (transaction.amount !== undefined) updateData.amount = transaction.amount;
    if (transaction.type !== undefined) updateData.type = transaction.type;
    if (transaction.category !== undefined) updateData.category = transaction.category;
    if (transaction.frequency !== undefined) updateData.frequency = transaction.frequency;
    if (transaction.dayOfPeriod !== undefined) updateData.day_of_period = transaction.dayOfPeriod;
    if (transaction.startDate !== undefined) updateData.start_date = transaction.startDate;
    if (transaction.endDate !== undefined) updateData.end_date = transaction.endDate;
    if (transaction.isActive !== undefined) updateData.is_active = transaction.isActive;

    const { error } = await supabase
        .from('recurring_transactions')
        .update(updateData)
        .eq('id', id);

    if (error) throw error;
};

export const deleteRecurringTransaction = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const generateRecurringTransactions = async (
    startDate: Date,
    endDate: Date
): Promise<Transaction[]> => {
    const recurring = await getRecurringTransactions();
    const generated: Omit<Transaction, 'id'>[] = [];

    for (const rule of recurring) {
        if (!rule.isActive) continue;

        const ruleStart = new Date(rule.startDate);
        const ruleEnd = rule.endDate ? new Date(rule.endDate) : endDate;

        let currentDate = new Date(Math.max(ruleStart.getTime(), startDate.getTime()));

        while (currentDate <= endDate && currentDate <= ruleEnd) {
            if (currentDate >= startDate) {
                generated.push({
                    description: rule.description,
                    amount: rule.amount,
                    type: rule.type,
                    category: rule.category,
                    date: currentDate.toISOString().split('T')[0],
                });
            }

            // Calculate next occurrence based on frequency
            switch (rule.frequency) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    if (rule.dayOfPeriod) {
                        currentDate.setDate(Math.min(rule.dayOfPeriod, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()));
                    }
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
            }
        }
    }

    return generated as Transaction[];
};

// --- CUSTOM CATEGORIES ---

export const getCustomCategories = async (type?: 'income' | 'expense'): Promise<import('../types').CustomCategory[]> => {
    let query = supabase
        .from('custom_categories')
        .select('*')
        .order('name', { ascending: true });

    if (type) {
        query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as import('../types').CustomCategory[];
};

export const addCustomCategory = async (
    category: Omit<import('../types').CustomCategory, 'id'>
): Promise<import('../types').CustomCategory> => {
    const { data, error } = await supabase
        .from('custom_categories')
        .insert([category])
        .select()
        .single();

    if (error) throw error;
    return data as import('../types').CustomCategory;
};

export const updateCustomCategory = async (
    id: number,
    category: Partial<Omit<import('../types').CustomCategory, 'id'>>
): Promise<void> => {
    const { error } = await supabase
        .from('custom_categories')
        .update(category)
        .eq('id', id);

    if (error) throw error;
};

export const deleteCustomCategory = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('custom_categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- IMPORT/EXPORT ---

export const exportTransactionsCSV = async (startDate?: string, endDate?: string): Promise<string> => {
    let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: true });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;

    const transactions = data as Transaction[];

    // Create CSV header
    const header = 'Date,Description,Amount,Type,Category\n';

    // Create CSV rows
    const rows = transactions.map(t =>
        `${t.date},"${t.description.replace(/"/g, '""')}",${t.amount},${t.type},${t.category}`
    ).join('\n');

    return header + rows;
};

export const importTransactionsCSV = async (
    csvData: string,
    columnMapping: import('../types').CSVColumnMapping
): Promise<import('../types').ParsedTransaction[]> => {
    const Papa = await import('papaparse');

    const result = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
    });

    const parsed: import('../types').ParsedTransaction[] = result.data.map((row: any) => {
        const amount = parseFloat(row[columnMapping.amount]);
        const type = columnMapping.type ? row[columnMapping.type]?.toLowerCase() as 'income' | 'expense' : undefined;

        return {
            date: row[columnMapping.date],
            description: row[columnMapping.description],
            amount: isNaN(amount) ? 0 : Math.abs(amount),
            type: type,
            category: columnMapping.category ? row[columnMapping.category] : undefined,
        };
    });

    return parsed.filter(t => t.description && t.amount > 0);
};

export const importTransactionsPDF = async (pdfFile: File): Promise<import('../types').ParsedTransaction[]> => {
    const pdfParse = await import('pdf-parse');
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdfParse.default(buffer);
    const text = data.text;

    // Simple pattern matching for common bank statement formats
    // This is a basic implementation - real-world usage would need bank-specific patterns
    const lines = text.split('\n');
    const transactions: import('../types').ParsedTransaction[] = [];

    // Pattern: Date Amount Description (very basic, needs customization per bank)
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const amountPattern = /[\$£€]?\s*(\d+[,.]?\d*\.?\d{2})/;

    for (const line of lines) {
        const dateMatch = line.match(datePattern);
        const amountMatch = line.match(amountPattern);

        if (dateMatch && amountMatch) {
            const dateStr = dateMatch[1];
            const amountStr = amountMatch[1].replace(/[,$]/g, '');
            const amount = parseFloat(amountStr);

            if (!isNaN(amount) && amount > 0) {
                // Extract description (text between date and amount)
                const description = line
                    .replace(dateMatch[0], '')
                    .replace(amountMatch[0], '')
                    .trim();

                if (description) {
                    transactions.push({
                        date: dateStr,
                        description,
                        amount,
                    });
                }
            }
        }
    }

    return transactions;
};
