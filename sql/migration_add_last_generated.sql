-- Add last_generated_date column to recurring_transactions table
ALTER TABLE recurring_transactions 
ADD COLUMN IF NOT EXISTS last_generated_date DATE;

-- Update existing rows to have last_generated_date equal to start_date (or NULL if preferred, but start_date is safer to avoid immediate double processing)
-- For this logic, we'll leave it NULL for now, and the service will handle the first run logic (using start_date).
