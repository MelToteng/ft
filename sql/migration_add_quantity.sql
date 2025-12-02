-- Add quantity field to shopping_list_items
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1 CHECK (quantity > 0);

-- Update existing items to have quantity = 1
UPDATE shopping_list_items 
SET quantity = 1 
WHERE quantity IS NULL;
