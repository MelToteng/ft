-- User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type TEXT NOT NULL, -- 'list_completed', 'system', etc.
    link TEXT, -- Optional link to resource
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" ON user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON user_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- RPC to notify list completion
-- This needs to be SECURITY DEFINER to allow unregistered users (via token) to insert notifications for registered users
CREATE OR REPLACE FUNCTION notify_list_completion(token_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_list_id BIGINT;
    list_owner_id UUID;
    list_name_val TEXT;
BEGIN
    -- 1. Verify token and get list details
    SELECT l.id, l.user_id, l.name INTO target_list_id, list_owner_id, list_name_val
    FROM shopping_list_shares s
    JOIN shopping_lists l ON s.list_id = l.id
    WHERE s.token = token_input
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

    IF target_list_id IS NULL THEN
        RETURN FALSE; -- Invalid token
    END IF;

    -- 2. Notify Owner
    INSERT INTO user_notifications (user_id, title, message, type, link)
    VALUES (
        list_owner_id,
        'Shopping List Completed',
        'The shared list "' || list_name_val || '" has been marked as completed.',
        'list_completed',
        '/shopping-lists/' || target_list_id
    );

    -- 3. Notify Members
    INSERT INTO user_notifications (user_id, title, message, type, link)
    SELECT 
        user_id,
        'Shopping List Completed',
        'The shared list "' || list_name_val || '" has been marked as completed.',
        'list_completed',
        '/shopping-lists/' || target_list_id
    FROM shopping_list_members
    WHERE list_id = target_list_id;

    -- 4. Optionally mark list as completed? 
    -- The user said "allow for an update of their list". 
    -- Let's update the status to 'completed' if it's not already.
    UPDATE shopping_lists
    SET status = 'completed'
    WHERE id = target_list_id;

    RETURN TRUE;
END;
$$;

-- Trigger function to notify members when items are added
CREATE OR REPLACE FUNCTION notify_item_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    list_owner_id UUID;
    list_name_val TEXT;
    adder_email TEXT;
BEGIN
    -- Get list details
    SELECT l.user_id, l.name INTO list_owner_id, list_name_val
    FROM shopping_lists l
    WHERE l.id = NEW.list_id;

    -- Get the email of the user who added the item (if authenticated)
    SELECT email INTO adder_email
    FROM auth.users
    WHERE id = auth.uid();

    -- Notify owner (if not the one adding)
    IF list_owner_id != auth.uid() OR auth.uid() IS NULL THEN
        INSERT INTO user_notifications (user_id, title, message, type, link)
        VALUES (
            list_owner_id,
            'New Item Added',
            COALESCE(adder_email, 'Someone') || ' added "' || NEW.name || '" to "' || list_name_val || '"',
            'item_added',
            '/shopping-lists/' || NEW.list_id
        );
    END IF;

    -- Notify members (except the one adding)
    INSERT INTO user_notifications (user_id, title, message, type, link)
    SELECT 
        user_id,
        'New Item Added',
        COALESCE(adder_email, 'Someone') || ' added "' || NEW.name || '" to "' || list_name_val || '"',
        'item_added',
        '/shopping-lists/' || NEW.list_id
    FROM shopping_list_members
    WHERE list_id = NEW.list_id
    AND user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);

    RETURN NEW;
END;
$$;

-- Create trigger on shopping_list_items
DROP TRIGGER IF EXISTS on_item_added ON shopping_list_items;
CREATE TRIGGER on_item_added
    AFTER INSERT ON shopping_list_items
    FOR EACH ROW
    EXECUTE FUNCTION notify_item_added();
