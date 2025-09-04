// Notification Manager for Weekly Planner
// Handles browser notifications, reminders, and permission requests

class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
        this.reminders = new Map(); // Store active reminders
        this.timeouts = new Map(); // Store timeout IDs for scheduled notifications
        this.initMessageHandlers();
    }

    // Initialize message handlers for service worker communication
    initMessageHandlers() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });
        }
    }

    // Handle messages from service worker
    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'complete-task':
                this.handleCompleteTask(data.taskId);
                break;
            case 'snooze-reminder':
                this.snoozeReminder(data.taskId, data.minutes);
                break;
        }
    }

    // Request notification permission
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        if (this.permission === 'default') {
            const result = await Notification.requestPermission();
            this.permission = result;
            return result === 'granted';
        }

        return false;
    }

    // Check if notifications are enabled
    isEnabled() {
        return this.permission === 'granted' && 'Notification' in window;
    }

    // Schedule a reminder for a task
    async scheduleReminder(task, reminderMinutes = 15) {
        if (!task.time || !task.date) {
            console.warn('Cannot schedule reminder for task without date/time');
            return false;
        }

        // Cancel existing reminder if any
        this.cancelReminder(task.id);

        // Calculate reminder time
        const taskDateTime = new Date(`${task.date}T${task.time}`);
        const reminderTime = new Date(taskDateTime.getTime() - reminderMinutes * 60 * 1000);
        const now = new Date();

        // Don't schedule if reminder time has passed
        if (reminderTime <= now) {
            console.warn('Reminder time has already passed');
            return false;
        }

        // Store reminder info
        this.reminders.set(task.id, {
            taskId: task.id,
            taskText: task.text,
            taskEmoji: task.emoji,
            taskTime: task.time,
            reminderTime: reminderTime,
            reminderMinutes: reminderMinutes
        });

        // Schedule the notification
        const timeDiff = reminderTime.getTime() - now.getTime();
        
        if (timeDiff < 24 * 60 * 60 * 1000) { // Within 24 hours
            const timeoutId = setTimeout(() => {
                this.showNotification(task, reminderMinutes);
            }, timeDiff);
            
            this.timeouts.set(task.id, timeoutId);
        }

        // Save to backend
        await this.saveReminderToBackend(task.id, reminderTime, reminderMinutes);

        return true;
    }

    // Show notification
    async showNotification(task, reminderMinutes) {
        if (!this.isEnabled()) {
            console.warn('Notifications not enabled');
            return;
        }

        const title = `${task.emoji} Task Reminder`;
        const body = `${task.text} - scheduled for ${this.formatTime(task.time)}`;
        
        const options = {
            body: body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            tag: `task-${task.id}`,
            requireInteraction: true,
            actions: [
                { action: 'complete', title: 'Mark Complete' },
                { action: 'snooze', title: 'Snooze 10 min' }
            ],
            data: {
                taskId: task.id,
                url: window.location.href
            }
        };

        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                // Use service worker to show notification
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, options);
            } else {
                // Fallback to browser notification
                new Notification(title, options);
            }
            
            // Play notification sound if enabled
            this.playNotificationSound();
        } catch (error) {
            console.error('Failed to show notification:', error);
        }
    }

    // Cancel a reminder
    cancelReminder(taskId) {
        // Clear timeout if exists
        if (this.timeouts.has(taskId)) {
            clearTimeout(this.timeouts.get(taskId));
            this.timeouts.delete(taskId);
        }
        
        // Remove from reminders map
        this.reminders.delete(taskId);
        
        // Delete from backend
        this.deleteReminderFromBackend(taskId);
    }

    // Snooze reminder
    async snoozeReminder(taskId, minutes = 10) {
        const task = await this.getTaskById(taskId);
        if (!task) return;

        // Calculate new reminder time
        const newReminderTime = new Date(Date.now() + minutes * 60 * 1000);
        
        // Cancel current reminder
        this.cancelReminder(taskId);
        
        // Create temporary task object with adjusted time
        const adjustedTask = {
            ...task,
            time: this.formatTimeForTask(newReminderTime)
        };
        
        // Schedule new reminder
        await this.scheduleReminder(adjustedTask, 0);
    }

    // Handle complete task from notification
    async handleCompleteTask(taskId) {
        // This will be called by the main app to mark task as complete
        if (window.taskManager && typeof window.taskManager.toggleComplete === 'function') {
            await window.taskManager.toggleComplete(taskId);
        }
    }

    // Save reminder to backend
    async saveReminderToBackend(taskId, reminderTime, reminderMinutes) {
        try {
            const response = await fetch('/api/reminders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    taskId: taskId,
                    reminderTime: reminderTime.toISOString(),
                    reminderMinutes: reminderMinutes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save reminder');
            }
        } catch (error) {
            console.error('Failed to save reminder to backend:', error);
        }
    }

    // Delete reminder from backend
    async deleteReminderFromBackend(taskId) {
        try {
            await fetch(`/api/reminders/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
        } catch (error) {
            console.error('Failed to delete reminder from backend:', error);
        }
    }

    // Get task by ID (placeholder - will be connected to main app)
    async getTaskById(taskId) {
        // This should be connected to the main task management system
        if (window.taskManager && window.taskManager.allTasks) {
            return window.taskManager.allTasks.find(t => t.id === taskId);
        }
        return null;
    }

    // Load user notification preferences
    async loadPreferences() {
        try {
            const response = await fetch('/api/notification-preferences', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const preferences = await response.json();
                return preferences;
            }
        } catch (error) {
            console.error('Failed to load notification preferences:', error);
        }
        
        // Return defaults
        return {
            notifications_enabled: true,
            default_reminder_minutes: 15,
            sound_enabled: true,
            browser_notifications: true
        };
    }

    // Save user notification preferences
    async savePreferences(preferences) {
        try {
            const response = await fetch('/api/notification-preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(preferences)
            });

            return response.ok;
        } catch (error) {
            console.error('Failed to save notification preferences:', error);
            return false;
        }
    }

    // Sync reminders with backend
    async syncReminders() {
        try {
            const response = await fetch('/api/reminders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const reminders = await response.json();
                
                // Clear existing reminders
                this.reminders.clear();
                this.timeouts.forEach(timeout => clearTimeout(timeout));
                this.timeouts.clear();
                
                // Reschedule all reminders
                for (const reminder of reminders) {
                    if (!reminder.notification_sent && reminder.enabled) {
                        const task = await this.getTaskById(reminder.task_id);
                        if (task && !task.completed) {
                            const reminderTime = new Date(reminder.reminder_time);
                            const now = new Date();
                            
                            if (reminderTime > now) {
                                // Store reminder info
                                this.reminders.set(reminder.task_id, {
                                    ...reminder,
                                    taskText: task.text,
                                    taskEmoji: task.emoji,
                                    taskTime: task.time
                                });
                                
                                // Schedule notification
                                const timeDiff = reminderTime.getTime() - now.getTime();
                                if (timeDiff < 24 * 60 * 60 * 1000) { // Within 24 hours
                                    const timeoutId = setTimeout(() => {
                                        this.showNotification(task, reminder.reminder_minutes || 15);
                                    }, timeDiff);
                                    
                                    this.timeouts.set(reminder.task_id, timeoutId);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to sync reminders:', error);
        }
    }

    // Play notification sound
    playNotificationSound() {
        try {
            // Use existing Tone.js if available
            if (window.Tone && window.synth) {
                const now = window.Tone.now();
                window.synth.triggerAttackRelease('G4', '8n', now);
                window.synth.triggerAttackRelease('B4', '8n', now + 0.1);
                window.synth.triggerAttackRelease('D5', '8n', now + 0.2);
            } else {
                // Fallback to Audio API
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            }
        } catch (error) {
            console.warn('Failed to play notification sound:', error);
        }
    }

    // Format time for display
    formatTime(timeStr) {
        if (!timeStr) return '';
        try {
            const date = new Date(`1970-01-01T${timeStr}`);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return timeStr;
        }
    }

    // Format time for task object
    formatTimeForTask(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Check if browser supports notifications
    static isSupported() {
        return 'Notification' in window && 'serviceWorker' in navigator;
    }

    // Get permission status
    static getPermissionStatus() {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission;
    }
}

// Export for use in main app
window.NotificationManager = NotificationManager;