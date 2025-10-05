-- Supabase Database Setup for Reminders
-- Run this SQL in Supabase SQL Editor to add reminder functionality

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for reminders table
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policy for reminders - users can only access their own reminders
CREATE POLICY "Users can manage their own reminders" ON reminders
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(reminder_time, notification_sent, enabled);

-- Create trigger for updated_at
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add reminder_settings column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE;

-- Create notification_preferences table for user settings
CREATE TABLE IF NOT EXISTS notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    default_reminder_minutes INTEGER DEFAULT 15, -- Default 15 minutes before task
    sound_enabled BOOLEAN DEFAULT TRUE,
    browser_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for notification_preferences table
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for notification_preferences
CREATE POLICY "Users can manage their own preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get upcoming reminders (for scheduled jobs)
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE(
    reminder_id BIGINT,
    task_id BIGINT,
    user_id UUID,
    task_text TEXT,
    task_emoji TEXT,
    task_time TEXT,
    reminder_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as reminder_id,
        r.task_id,
        r.user_id,
        t.text as task_text,
        t.emoji as task_emoji,
        t.time as task_time,
        r.reminder_time
    FROM reminders r
    JOIN tasks t ON r.task_id = t.id
    WHERE r.enabled = TRUE 
    AND r.notification_sent = FALSE
    AND r.reminder_time <= NOW() + INTERVAL '1 minute'
    AND t.completed = FALSE
    ORDER BY r.reminder_time;
END;
$$ LANGUAGE plpgsql;