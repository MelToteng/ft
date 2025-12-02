-- Shopping Lists Table
CREATE TABLE IF NOT EXISTS shopping_lists (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
    budget_item_id BIGINT, -- Optional link to budget
    budget_sub_item_id BIGINT, -- Optional link to sub-budget
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping List Items Table
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id BIGSERIAL PRIMARY KEY,
    list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    estimated_cost DECIMAL(10, 2) DEFAULT 0,
    actual_cost DECIMAL(10, 2) DEFAULT 0,
    is_purchased BOOLEAN DEFAULT FALSE,
    purchased_by UUID, -- Can be NULL for unregistered users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping List Shares Table
CREATE TABLE IF NOT EXISTS shopping_list_shares (
    id BIGSERIAL PRIMARY KEY,
    list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    shared_with_email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id ON shopping_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_shares_token ON shopping_list_shares(token);

-- RLS Policies
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_shares ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Users can view their own shopping lists" ON shopping_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own shopping lists" ON shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shopping lists" ON shopping_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shopping lists" ON shopping_lists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view items in their lists" ON shopping_list_items FOR SELECT USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_items.list_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert items in their lists" ON shopping_list_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_items.list_id AND user_id = auth.uid()));
CREATE POLICY "Users can update items in their lists" ON shopping_list_items FOR UPDATE USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_items.list_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete items in their lists" ON shopping_list_items FOR DELETE USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_items.list_id AND user_id = auth.uid()));

CREATE POLICY "Users can view shares for their lists" ON shopping_list_shares FOR SELECT USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_shares.list_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert shares for their lists" ON shopping_list_shares FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_shares.list_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete shares for their lists" ON shopping_list_shares FOR DELETE USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_shares.list_id AND user_id = auth.uid()));

-- Trigger to automatically update updated_at for shopping_lists
CREATE TRIGGER update_shopping_lists_updated_at
    BEFORE UPDATE ON shopping_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for shopping_list_items
CREATE TRIGGER update_shopping_list_items_updated_at
    BEFORE UPDATE ON shopping_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to access shared list by token (Security Definer)
-- This allows unauthenticated access to specific lists via a valid token
CREATE OR REPLACE FUNCTION get_shared_shopping_list(token_input TEXT)
RETURNS TABLE (
    list_id BIGINT,
    list_name TEXT,
    list_status TEXT,
    items JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.id,
        sl.name,
        sl.status,
        json_agg(sli.*) as items
    FROM 
        shopping_list_shares sls
    JOIN 
        shopping_lists sl ON sl.id = sls.list_id
    LEFT JOIN 
        shopping_list_items sli ON sli.list_id = sl.id
    WHERE 
        sls.token = token_input
        AND (sls.expires_at IS NULL OR sls.expires_at > NOW())
    GROUP BY 
        sl.id, sl.name, sl.status;
END;
$$;
