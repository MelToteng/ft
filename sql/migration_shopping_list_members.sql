-- Shopping List Members Table
CREATE TABLE IF NOT EXISTS shopping_list_members (
    id BIGSERIAL PRIMARY KEY,
    list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')) DEFAULT 'editor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, user_id)
);

-- Enable RLS
ALTER TABLE shopping_list_members ENABLE ROW LEVEL SECURITY;

-- Policies for shopping_list_members
CREATE POLICY "Users can view their memberships" ON shopping_list_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "List owners can manage members" ON shopping_list_members
    FOR ALL USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_members.list_id AND user_id = auth.uid()));

-- Update Shopping Lists Policies to include members
-- We need to drop existing policies first to avoid conflicts or just add new OR conditions.
-- Simpler to add a new policy for members.

CREATE POLICY "Members can view shared lists" ON shopping_lists
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM shopping_list_members WHERE list_id = shopping_lists.id AND user_id = auth.uid())
    );

CREATE POLICY "Members can update shared lists" ON shopping_lists
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM shopping_list_members WHERE list_id = shopping_lists.id AND user_id = auth.uid() AND role = 'editor')
    );

-- Update Shopping List Items Policies
CREATE POLICY "Members can view items in shared lists" ON shopping_list_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM shopping_list_members WHERE list_id = shopping_list_items.list_id AND user_id = auth.uid())
    );

CREATE POLICY "Members can insert items in shared lists" ON shopping_list_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM shopping_list_members WHERE list_id = shopping_list_items.list_id AND user_id = auth.uid() AND role = 'editor')
    );

CREATE POLICY "Members can update items in shared lists" ON shopping_list_items
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM shopping_list_members WHERE list_id = shopping_list_items.list_id AND user_id = auth.uid() AND role = 'editor')
    );

CREATE POLICY "Members can delete items in shared lists" ON shopping_list_items
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM shopping_list_members WHERE list_id = shopping_list_items.list_id AND user_id = auth.uid() AND role = 'editor')
    );

-- Function to join a list via token
CREATE OR REPLACE FUNCTION join_shopping_list(token_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_list_id BIGINT;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- 1. Verify token
    SELECT list_id INTO target_list_id
    FROM shopping_list_shares
    WHERE token = token_input
    AND (expires_at IS NULL OR expires_at > NOW());

    IF target_list_id IS NULL THEN
        RETURN FALSE; -- Invalid token
    END IF;

    -- 2. Check if already a member or owner
    IF EXISTS (SELECT 1 FROM shopping_lists WHERE id = target_list_id AND user_id = current_user_id) THEN
        RETURN TRUE; -- Already owner
    END IF;

    IF EXISTS (SELECT 1 FROM shopping_list_members WHERE list_id = target_list_id AND user_id = current_user_id) THEN
        RETURN TRUE; -- Already member
    END IF;

    -- 3. Add to members
    INSERT INTO shopping_list_members (list_id, user_id, role)
    VALUES (target_list_id, current_user_id, 'editor');

    RETURN TRUE;
END;
$$;
