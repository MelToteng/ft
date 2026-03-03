-- Migration to allow 'transfer' type in transactions and recurring_transactions

-- 1. Update transactions table check constraint
-- Drop the existing constraint if it exists (might need to check the actual name if it's not default)
DO $$
BEGIN
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
END $$;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));

-- 2. Update recurring_transactions table check constraint
DO $$
BEGIN
    ALTER TABLE recurring_transactions DROP CONSTRAINT IF EXISTS recurring_transactions_type_check;
END $$;

ALTER TABLE recurring_transactions ADD CONSTRAINT recurring_transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));

-- 3. Update custom_categories table check constraint
DO $$
BEGIN
    ALTER TABLE custom_categories DROP CONSTRAINT IF EXISTS custom_categories_type_check;
END $$;

ALTER TABLE custom_categories ADD CONSTRAINT custom_categories_type_check CHECK (type IN ('income', 'expense', 'transfer'));
