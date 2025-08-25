-- Quick fix script for position column
-- This is a simplified version that can be run directly in Supabase SQL Editor
-- Use this if the main migration script doesn't work

-- 1. Add position column if it doesn't exist
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 2. Update existing tasks with sequential positions
-- This ensures all existing tasks have proper position values
UPDATE public.tasks 
SET position = subquery.new_position
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY created_at) - 1 as new_position
    FROM public.tasks
    WHERE position IS NULL OR position = 0
) AS subquery
WHERE tasks.id = subquery.id;

-- 3. Add composite index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_date_position 
ON public.tasks(user_id, date, position);

-- 4. Verify the changes
SELECT 
    'Position column fix completed' as status,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN position IS NOT NULL THEN 1 END) as tasks_with_position
FROM public.tasks;