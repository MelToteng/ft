-- Function to update a shopping list item via a shared token
-- This allows unregistered users to mark items as purchased and enter costs
CREATE OR REPLACE FUNCTION update_shared_shopping_list_item(
    token_input TEXT,
    item_id_input BIGINT,
    is_purchased_input BOOLEAN,
    actual_cost_input DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_list_id BIGINT;
BEGIN
    -- 1. Verify token and get list_id
    SELECT list_id INTO target_list_id
    FROM shopping_list_shares
    WHERE token = token_input
    AND (expires_at IS NULL OR expires_at > NOW());

    IF target_list_id IS NULL THEN
        RETURN FALSE; -- Invalid or expired token
    END IF;

    -- 2. Verify item belongs to the list
    IF NOT EXISTS (
        SELECT 1 FROM shopping_list_items
        WHERE id = item_id_input AND list_id = target_list_id
    ) THEN
        RETURN FALSE; -- Item not found in this list
    END IF;

    -- 3. Update the item
    UPDATE shopping_list_items
    SET 
        is_purchased = is_purchased_input,
        actual_cost = actual_cost_input,
        updated_at = NOW()
    WHERE id = item_id_input;

    RETURN TRUE;
END;
$$;
