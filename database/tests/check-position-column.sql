-- SQL script to check if position column exists in tasks table
-- Run this in the Supabase SQL Editor to verify the current schema

SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if position column specifically exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
              AND column_name = 'position'
              AND table_schema = 'public'
        ) THEN 'Position column EXISTS'
        ELSE 'Position column MISSING - migration required'
    END AS position_column_status;

-- Check indexes on tasks table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tasks' 
  AND schemaname = 'public'
ORDER BY indexname;