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

export const updateTransaction = async (id: number, transaction: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> => {
    const { data, error } = await supabase
        .from('transactions')
        .update(transaction)
        .eq('id', id)
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

export const getBudgets = async (periodId?: number): Promise<BudgetItem[]> => {
    let query = supabase
        .from('budgets')
        .select(`
            *,
            subItems:budget_sub_items(*)
        `);

    if (periodId !== undefined) {
        query = query.eq('budget_period_id', periodId);
    }

    const { data: budgets, error } = await query;

    if (error) throw error;

    // Transform snake_case to camelCase for subItems
    return budgets.map((b: any) => ({
        id: b.id,
        budgetPeriodId: b.budget_period_id,
        category: b.category,
        amount: b.amount,
        subItems: b.subItems?.map((s: any) => ({
            id: s.id,
            budgetItemId: s.budget_id,
            name: s.name,
            amount: s.amount
        })) || []
    }));
};

export const saveBudgets = async (
    periodId: number,
    budgetsToSave: { category: string; amount: number; subItems?: { name: string; amount: number }[] }[]
): Promise<void> => {
    // 1. Delete existing budgets for this period (cascades to sub-items)
    const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('budget_period_id', periodId);

    if (deleteError) throw deleteError;

    // 2. Insert new budgets
    if (budgetsToSave.length > 0) {
        // Insert budgets one by one to get their IDs for sub-items
        // (Bulk insert doesn't easily return mapped IDs in a way we can correlate without more logic)
        // For simplicity and safety, we'll loop. Performance impact is negligible for typical budget size.

        for (const budget of budgetsToSave) {
            const { data: insertedBudget, error: insertError } = await supabase
                .from('budgets')
                .insert({
                    budget_period_id: periodId,
                    category: budget.category,
                    amount: budget.amount
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // 3. Insert sub-items if any
            if (budget.subItems && budget.subItems.length > 0) {
                const { error: subItemError } = await supabase
                    .from('budget_sub_items')
                    .insert(budget.subItems.map(sub => ({
                        budget_id: insertedBudget.id,
                        name: sub.name,
                        amount: sub.amount,
                        user_id: insertedBudget.user_id // Assuming user_id is on budget_items or we get it from context
                    })));

                // Note: user_id is required on budget_sub_items. 
                // budget_items might not have user_id returned if RLS handles it, but we need it for sub_items.
                // Actually, let's get user first to be safe.
            }
        }
    }
};

export const addBudgetSubItem = async (subItem: Omit<import('../types').BudgetSubItem, 'id'>): Promise<import('../types').BudgetSubItem> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('budget_sub_items')
        .insert([{
            budget_id: subItem.budgetItemId,
            name: subItem.name,
            amount: subItem.amount,
            user_id: user.id
        }])
        .select()
        .single();

    if (error) throw error;
    return {
        id: data.id,
        budgetItemId: data.budget_id,
        name: data.name,
        amount: data.amount
    };
};

export const deleteBudgetSubItem = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('budget_sub_items')
        .delete()
        .eq('id', id);

    if (error) throw error;
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
        lastGeneratedDate: item.last_generated_date,
    }));
};

export const addRecurringTransaction = async (
    transaction: Omit<import('../types').RecurringTransaction, 'id'>
): Promise<import('../types').RecurringTransaction> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('recurring_transactions')
        .insert([{
            user_id: user.id,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            frequency: transaction.frequency,
            day_of_period: transaction.dayOfPeriod,
            start_date: transaction.startDate,
            end_date: transaction.endDate,
            is_active: transaction.isActive,
            last_generated_date: transaction.lastGeneratedDate,
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
        lastGeneratedDate: data.last_generated_date,
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
    if (transaction.lastGeneratedDate !== undefined) updateData.last_generated_date = transaction.lastGeneratedDate;

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

export const processRecurringTransactions = async (): Promise<{ generatedCount: number, message: string }> => {
    const recurring = await getRecurringTransactions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let generatedCount = 0;

    for (const rule of recurring) {
        if (!rule.isActive) continue;

        const ruleStart = new Date(rule.startDate);
        const ruleEnd = rule.endDate ? new Date(rule.endDate) : null;

        // Determine the next due date based on last generated date or start date
        let nextDueDate: Date;
        if (rule.lastGeneratedDate) {
            nextDueDate = new Date(rule.lastGeneratedDate);
            // Advance by one period from the last generated date
            switch (rule.frequency) {
                case 'daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
                case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
                case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
                case 'yearly': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
            }
        } else {
            nextDueDate = new Date(ruleStart);
        }

        // If monthly/yearly, ensure day of period is respected if possible
        if (rule.frequency === 'monthly' && rule.dayOfPeriod) {
            // Logic to snap to the correct day of month if we drifted or if it's the first run
            // But simple addition above usually works for standard dates. 
            // Let's refine for end-of-month edge cases if needed, but for now simple increment is okay.
            // Actually, let's be more precise:
            const currentMonth = nextDueDate.getMonth();
            const targetDay = Math.min(rule.dayOfPeriod, new Date(nextDueDate.getFullYear(), currentMonth + 1, 0).getDate());
            nextDueDate.setDate(targetDay);
        }

        // Check if due
        // We might need to generate MULTIPLE transactions if the app hasn't been opened in a while
        // But to be safe and avoid flooding, let's generate up to 'today'.

        let lastProcessedDate: Date | null = null;

        while (nextDueDate <= today) {
            if (ruleEnd && nextDueDate > ruleEnd) break;

            // Generate Transaction
            await addTransaction({
                description: rule.description,
                amount: rule.amount,
                type: rule.type,
                category: rule.category,
                date: nextDueDate.toISOString().split('T')[0],
            });

            generatedCount++;
            lastProcessedDate = new Date(nextDueDate);

            // Advance to next period
            switch (rule.frequency) {
                case 'daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
                case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
                case 'monthly':
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                    if (rule.dayOfPeriod) {
                        const targetDay = Math.min(rule.dayOfPeriod, new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 0).getDate());
                        nextDueDate.setDate(targetDay);
                    }
                    break;
                case 'yearly': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
            }
        }

        // Update rule if we generated something
        if (lastProcessedDate) {
            await updateRecurringTransaction(rule.id, {
                lastGeneratedDate: lastProcessedDate.toISOString().split('T')[0]
            });
        }
    }

    return {
        generatedCount,
        message: generatedCount > 0 ? `${generatedCount} recurring transactions were automatically added.` : ''
    };
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('custom_categories')
        .insert([{ ...category, user_id: user.id }])
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
    // Dynamic import to avoid loading PDF.js unless needed
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source to CDN to avoid build issues with Vite
    // Use the version from the imported library
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // Join items with space, but try to respect newlines if items are far apart vertically?
        // For simplicity, we'll join with space and rely on the fact that usually lines are separate items or we can just split by common delimiters later if needed.
        // However, pdf-parse often returns a big string.
        // Let's join with space for now.
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += pageText + '\n';
    }

    // Simple pattern matching for common bank statement formats
    // Note: PDF text extraction can be messy. This regex might need adjustment based on how pdfjs-dist outputs text.
    // Often it outputs "Date Description Amount" or similar.
    // We'll try to match patterns in the full text or split by newlines if we added them.
    // Since we added \n per page, and joined items with space, we effectively have one line per page? 
    // No, that's bad. 
    // Better approach: Check item transforms to guess newlines.
    // But for a quick fix, let's just assume the user's PDF is simple.

    // Actually, let's try to be a bit smarter. If items have significantly different Y coordinates, insert newline.
    // But that's complex.
    // Let's stick to the previous logic but apply it to the text we got.
    // The previous logic split by \n.
    // If we join everything with space, we lose structure.
    // Let's try to join with ' ' but if the item has 'EOL' equivalent? No.

    // Alternative: Join with ' ' and then regex search globally?
    // The previous regex was `const lines = text.split('\n');`

    // Let's try to preserve some structure.
    // pdfjs-dist textContent items don't have explicit newlines usually.
    // We can try to just join with '  ' (double space) to separate columns.

    // Let's try this:
    const lines = fullText.split('\n'); // This will only be pages.
    // We might need to split by regex looking for date patterns if we lost line breaks.

    const transactions: import('../types').ParsedTransaction[] = [];

    // Improved Regex to find transactions in a stream of text
    // Look for Date ... Amount
    const transactionPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\$£€]?\s*\d+[,.]?\d*\.?\d{2})/g;

    let match;
    while ((match = transactionPattern.exec(fullText)) !== null) {
        const dateStr = match[1];
        const description = match[2].trim();
        const amountStr = match[3].replace(/[,$]/g, '');
        const amount = parseFloat(amountStr);

        if (!isNaN(amount) && amount > 0) {
            transactions.push({
                date: dateStr,
                description,
                amount,
            });
        }
    }

    return transactions;
};

// --- SHOPPING LISTS ---

export const getShoppingLists = async (): Promise<import('../types').ShoppingList[]> => {
    const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
            *,
            items:shopping_list_items(*)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as import('../types').ShoppingList[];
};

export const createShoppingList = async (
    list: Omit<import('../types').ShoppingList, 'id' | 'created_at' | 'updated_at'>
): Promise<import('../types').ShoppingList> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('shopping_lists')
        .insert([{ ...list, user_id: user.id }])
        .select()
        .single();

    if (error) throw error;
    return data as import('../types').ShoppingList;
};

export const updateShoppingList = async (
    id: number,
    updates: Partial<Omit<import('../types').ShoppingList, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> => {
    const { error } = await supabase
        .from('shopping_lists')
        .update(updates)
        .eq('id', id);

    if (error) throw error;
};

export const deleteShoppingList = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- SHOPPING LIST ITEMS ---

export const addShoppingListItem = async (
    item: Omit<import('../types').ShoppingListItem, 'id' | 'created_at' | 'updated_at'>
): Promise<import('../types').ShoppingListItem> => {
    const { data, error } = await supabase
        .from('shopping_list_items')
        .insert([item])
        .select()
        .single();

    if (error) throw error;
    return data as import('../types').ShoppingListItem;
};

export const updateShoppingListItem = async (
    id: number,
    updates: Partial<Omit<import('../types').ShoppingListItem, 'id' | 'list_id' | 'created_at' | 'updated_at'>>
): Promise<void> => {
    const { error } = await supabase
        .from('shopping_list_items')
        .update(updates)
        .eq('id', id);

    if (error) throw error;
};

export const deleteShoppingListItem = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- SHOPPING LIST SHARING ---

export const shareShoppingList = async (listId: number, email?: string): Promise<string> => {
    // Generate a unique token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Set expiration to 7 days from now (configurable)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase
        .from('shopping_list_shares')
        .insert([{
            list_id: listId,
            token: token,
            shared_with_email: email,
            expires_at: expiresAt.toISOString()
        }]);

    if (error) throw error;
    return token;
};

export const getSharedShoppingList = async (token: string): Promise<import('../types').ShoppingList | null> => {
    const { data, error } = await supabase
        .rpc('get_shared_shopping_list', { token_input: token });

    if (error) {
        console.error('Error fetching shared list:', error);
        return null;
    }

    if (!data || data.length === 0) return null;

    const result = data[0];
    return {
        id: result.list_id,
        name: result.list_name,
        status: result.list_status,
        items: result.items || [],
        user_id: '', // Not exposed
        created_at: '', // Not exposed
        updated_at: '' // Not exposed
    } as import('../types').ShoppingList;
};

export const updateSharedShoppingListItem = async (
    token: string,
    itemId: number,
    isPurchased: boolean,
    actualCost: number
): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('update_shared_shopping_list_item', {
            token_input: token,
            item_id_input: itemId,
            is_purchased_input: isPurchased,
            actual_cost_input: actualCost
        });

    if (error) {
        console.error('Error updating shared item:', error);
        throw error;
    }

    return data as boolean;
};

export const joinShoppingList = async (token: string): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('join_shopping_list', { token_input: token });

    if (error) {
        console.error('Error joining list:', error);
        throw error;
    }

    return data as boolean;
};

export const notifyListCompletion = async (token: string): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('notify_list_completion', { token_input: token });

    if (error) {
        console.error('Error notifying completion:', error);
        throw error;
    }
    return data as boolean;
};

// --- USER NOTIFICATIONS ---

export const getUserNotifications = async (): Promise<import('../types').UserNotification[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as import('../types').UserNotification[];
};

export const markNotificationRead = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', id);

    if (error) throw error;
};
