-- Migration script to add position column to tasks table for drag-and-drop functionality
-- Run this in the Supabase SQL Editor

-- Add the position column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'position'
    ) THEN
        ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0;
        
        -- Update existing tasks to have sequential positions based on creation order
        WITH numbered_tasks AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY created_at) - 1 as new_position
            FROM tasks
        )
        UPDATE tasks 
        SET position = numbered_tasks.new_position
        FROM numbered_tasks
        WHERE tasks.id = numbered_tasks.id;
        
        -- Add index for better performance
        CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(user_id, date, position);
        
        RAISE NOTICE 'Position column added successfully and existing tasks updated';
    ELSE
        RAISE NOTICE 'Position column already exists';
    END IF;
END $$;