-- Feedback Table Setup for Weekly Planner
-- Run this SQL in Supabase SQL Editor to create the feedback table

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: feedback can be anonymous
    name TEXT, -- Optional: for anonymous users
    email TEXT, -- Optional: for anonymous users
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'other')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    user_agent TEXT, -- Browser/device info
    page_url TEXT, -- Which page the feedback was submitted from
    app_version TEXT, -- App version if available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can insert feedback (including anonymous users)
CREATE POLICY "Anyone can submit feedback" ON feedback
    FOR INSERT WITH CHECK (true);

-- Policy 2: Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON feedback
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'admin@example.com' -- Replace with your admin email
        ))
    );

-- Policy 3: Only admins can update feedback
CREATE POLICY "Only admins can update feedback" ON feedback
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'admin@example.com' -- Replace with your admin email
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Create trigger for updated_at (reuse existing function)
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for feedback summary (useful for admin dashboard)
CREATE OR REPLACE VIEW feedback_summary AS
SELECT 
    feedback_type,
    status,
    priority,
    COUNT(*) as count,
    DATE(created_at) as date
FROM feedback
GROUP BY feedback_type, status, priority, DATE(created_at)
ORDER BY date DESC;

-- Grant access to the view
GRANT SELECT ON feedback_summary TO authenticated;