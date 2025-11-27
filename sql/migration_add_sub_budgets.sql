-- Migration: Add Sub-Budgeting Support
-- This migration adds support for breaking down budget categories into sub-items

-- 1. Create budget_sub_items table
CREATE TABLE IF NOT EXISTS budget_sub_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_id BIGINT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add budget_sub_item_id to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS budget_sub_item_id BIGINT REFERENCES budget_sub_items(id) ON DELETE SET NULL;

-- 3. Enable Row Level Security on budget_sub_items
ALTER TABLE budget_sub_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for budget_sub_items
CREATE POLICY "Users can view their own budget sub-items" ON budget_sub_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget sub-items" ON budget_sub_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget sub-items" ON budget_sub_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget sub-items" ON budget_sub_items
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_sub_items_budget_id ON budget_sub_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_transactions_budget_sub_item_id ON transactions(budget_sub_item_id);
