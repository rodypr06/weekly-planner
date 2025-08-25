-- SQL script to create the RPC function for adding position column
-- Run this in the Supabase SQL Editor

-- Create RPC function to add position column if it doesn't exist
CREATE OR REPLACE FUNCTION add_position_column_if_not_exists()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if position column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'position'
        AND table_schema = 'public'
    ) THEN
        -- Add the position column
        ALTER TABLE public.tasks ADD COLUMN position INTEGER DEFAULT 0;
        
        -- Update existing tasks to have sequential positions based on creation order
        WITH numbered_tasks AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY created_at) - 1 as new_position
            FROM public.tasks
        )
        UPDATE public.tasks 
        SET position = numbered_tasks.new_position
        FROM numbered_tasks
        WHERE tasks.id = numbered_tasks.id;
        
        -- Add index for better performance
        CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(user_id, date, position);
        
        RETURN 'Position column added successfully and existing tasks updated';
    ELSE
        RETURN 'Position column already exists';
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_position_column_if_not_exists() TO authenticated;