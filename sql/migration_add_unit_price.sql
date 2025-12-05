-- Add unit_price column to shopping_list_items table
-- This allows tracking the price per unit for better price capture during shopping

ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0;

-- Update existing records to calculate unit_price from actual_cost and quantity
-- unit_price = actual_cost / quantity (to get price per unit from total)
UPDATE shopping_list_items 
SET unit_price = CASE 
    WHEN quantity > 0 THEN actual_cost * quantity 
    ELSE 0 
END
WHERE unit_price = 0 AND actual_cost > 0;
