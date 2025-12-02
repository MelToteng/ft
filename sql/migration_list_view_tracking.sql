-- Add view tracking columns to shopping_list_shares
ALTER TABLE shopping_list_shares 
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE shopping_list_shares 
ADD COLUMN IF NOT EXISTS viewer_info JSONB;

-- Create RPC function to notify when list is viewed
CREATE OR REPLACE FUNCTION notify_list_viewed(
    token_input TEXT,
    viewer_details JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_list_id BIGINT;
    list_owner_id UUID;
    list_name_val TEXT;
    viewer_name TEXT;
BEGIN
    -- Update view timestamp and viewer info
    UPDATE shopping_list_shares
    SET last_viewed_at = NOW(),
        viewer_info = viewer_details
    WHERE token = token_input
    AND (expires_at IS NULL OR expires_at > NOW())
    RETURNING list_id INTO target_list_id;
    
    IF target_list_id IS NULL THEN
        RETURN FALSE; -- Invalid or expired token
    END IF;
    
    -- Get list owner
    SELECT l.user_id, l.name INTO list_owner_id, list_name_val
    FROM shopping_lists l
    WHERE l.id = target_list_id;
    
    -- Determine viewer name
    SELECT email INTO viewer_name FROM auth.users WHERE id = auth.uid();
    IF viewer_name IS NULL THEN
        viewer_name := COALESCE(
            viewer_details->>'location',
            viewer_details->>'browser',
            'Someone'
        );
    END IF;
    
    -- Only notify if not the owner viewing
    IF list_owner_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID) THEN
        INSERT INTO user_notifications (user_id, title, message, type, link)
        VALUES (
            list_owner_id,
            'Shared List Viewed',
            viewer_name || ' opened your shared list "' || list_name_val || '"',
            'list_viewed',
            '/shopping-lists/' || target_list_id
        );
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Create function to check and notify expired links (run via cron)
CREATE OR REPLACE FUNCTION check_expired_links()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Notify owners of expired, unviewed links
    INSERT INTO user_notifications (user_id, title, message, type, link)
    SELECT 
        l.user_id,
        'Share Link Expired',
        'Your share link for "' || l.name || '" expired without being opened',
        'link_expired',
        '/shopping-lists/' || l.id
    FROM shopping_list_shares s
    JOIN shopping_lists l ON s.list_id = l.id
    WHERE s.expires_at < NOW()
    AND s.last_viewed_at IS NULL
    AND s.expires_at > NOW() - INTERVAL '1 hour'; -- Only notify recent expirations
END;
$$;
