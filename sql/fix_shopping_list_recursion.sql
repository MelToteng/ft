-- Fix infinite recursion in RLS policies

-- 1. Create a secure function to check ownership without triggering RLS
-- This function runs with the privileges of the creator (superuser), bypassing RLS on shopping_lists
CREATE OR REPLACE FUNCTION check_is_list_owner(lookup_list_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shopping_lists 
    WHERE id = lookup_list_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- 2. Drop the problematic policy
DROP POLICY IF EXISTS "List owners can manage members" ON shopping_list_members;

-- 3. Re-create the policy using the secure function
CREATE POLICY "List owners can manage members" ON shopping_list_members
    FOR ALL USING (check_is_list_owner(list_id));
