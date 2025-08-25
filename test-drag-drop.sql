-- Test script to verify drag-and-drop functionality after migration
-- Run this in Supabase SQL Editor to test the position column

-- 1. Check if position column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
              AND column_name = 'position'
              AND table_schema = 'public'
        ) THEN '✅ Position column EXISTS'
        ELSE '❌ Position column MISSING'
    END AS position_status;

-- 2. Check if index exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'tasks' 
              AND indexname LIKE '%position%'
              AND schemaname = 'public'
        ) THEN '✅ Position index EXISTS'
        ELSE '❌ Position index MISSING'
    END AS index_status;

-- 3. Sample data check - show tasks with their positions
SELECT 
    date,
    text,
    position,
    created_at
FROM public.tasks 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date, position
LIMIT 10;

-- 4. Check for any tasks with NULL positions
SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN position IS NOT NULL THEN 1 END) as tasks_with_position,
    COUNT(CASE WHEN position IS NULL THEN 1 END) as tasks_without_position
FROM public.tasks;

-- 5. Verify unique constraints are working
SELECT 
    date,
    position,
    COUNT(*) as duplicate_count
FROM public.tasks 
GROUP BY date, position, user_id
HAVING COUNT(*) > 1
LIMIT 5;

-- 6. Performance test - check query speed with position ordering
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.tasks 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND date = CURRENT_DATE::text
ORDER BY position;

-- Summary report
SELECT 
    '=== DRAG & DROP READINESS REPORT ===' as report_title
UNION ALL
SELECT 
    CASE 
        WHEN position_exists AND index_exists AND no_null_positions THEN 
            '✅ READY: Drag & Drop should work perfectly!'
        WHEN position_exists AND NOT no_null_positions THEN
            '⚠️  PARTIAL: Position column exists but has NULL values'
        WHEN NOT position_exists THEN
            '❌ NOT READY: Position column missing - run migration'
        ELSE
            '⚠️  CHECK: Some issues detected - review above results'
    END
FROM (
    SELECT 
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'position'
        ) as position_exists,
        EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'tasks' AND indexname LIKE '%position%'
        ) as index_exists,
        NOT EXISTS (
            SELECT 1 FROM public.tasks WHERE position IS NULL
        ) as no_null_positions
) AS status_check;