-- Advanced Transaction Management Schema
-- This extends the base schema with recurring transactions and custom categories

-- Recurring transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    day_of_period INTEGER, -- day of month (1-31) for monthly, day of week (0-6) for weekly
    start_date DATE NOT NULL,
    end_date DATE, -- NULL means indefinite
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom categories table
CREATE TABLE IF NOT EXISTS custom_categories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    color TEXT NOT NULL, -- hex color code
    icon TEXT, -- emoji or icon name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name, type)
);

-- Enable Row Level Security
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_transactions
CREATE POLICY "Users can view their own recurring transactions" ON recurring_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring transactions" ON recurring_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions" ON recurring_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions" ON recurring_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for custom_categories
CREATE POLICY "Users can view their own custom categories" ON custom_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom categories" ON custom_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom categories" ON custom_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom categories" ON custom_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_is_active ON recurring_transactions(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_categories_user_id ON custom_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_type ON custom_categories(type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_recurring_transactions_updated_at
    BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
