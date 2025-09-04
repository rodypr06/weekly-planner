// Reminder UI Components for Weekly Planner
// Handles the UI for setting reminders on tasks

class ReminderUI {
    constructor(notificationManager) {
        this.notificationManager = notificationManager;
        this.currentTask = null;
    }

    // Create reminder icon for task element
    createReminderIcon(task) {
        const hasReminder = task.reminder_enabled && task.reminder_minutes !== null;
        const reminderClass = hasReminder ? 'text-indigo-400' : 'text-gray-400';
        const reminderTitle = hasReminder ? 
            `Reminder set for ${task.reminder_minutes} minutes before` : 
            'Set reminder';
        
        return `
            <button class="reminder-btn ${reminderClass} hover:text-indigo-400 transition" 
                    data-task-id="${task.id}"
                    title="${reminderTitle}">
                <i class="fas fa-bell${hasReminder ? '' : '-slash'}"></i>
            </button>
        `;
    }

    // Create reminder modal HTML
    createReminderModal() {
        const modal = document.createElement('div');
        modal.id = 'reminderModal';
        modal.className = 'fixed inset-0 z-50 hidden items-center justify-center p-4';
        modal.innerHTML = `
            <!-- Backdrop -->
            <div class="modal-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            
            <!-- Modal Content -->
            <div class="modal-content glass-pane rounded-2xl p-6 max-w-md w-full relative">
                <h2 class="text-2xl font-bold mb-4 text-gray-100">
                    <i class="fas fa-bell mr-2 text-indigo-400"></i>
                    Set Task Reminder
                </h2>
                
                <!-- Notification Permission Banner -->
                <div id="notificationPermissionBanner" class="hidden mb-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/40">
                    <p class="text-sm text-yellow-200 mb-2">
                        <i class="fas fa-exclamation-triangle mr-1"></i>
                        Notifications are not enabled
                    </p>
                    <button id="requestPermissionBtn" class="btn-primary text-sm py-1 px-3">
                        Enable Notifications
                    </button>
                </div>
                
                <!-- Task Info -->
                <div class="mb-4 p-3 rounded-lg bg-white/5">
                    <div class="flex items-center gap-2">
                        <span id="taskEmoji" class="text-2xl"></span>
                        <span id="taskText" class="text-gray-200"></span>
                    </div>
                    <div id="taskTime" class="text-sm text-gray-400 mt-1">
                        <i class="far fa-clock mr-1"></i>
                        <span id="taskTimeText"></span>
                    </div>
                </div>
                
                <!-- Reminder Options -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-300 mb-2">
                        Remind me before task:
                    </label>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="reminder-option glass-card p-3 rounded-lg text-center hover:bg-indigo-500/20 transition" data-minutes="5">
                            5 minutes
                        </button>
                        <button class="reminder-option glass-card p-3 rounded-lg text-center hover:bg-indigo-500/20 transition" data-minutes="10">
                            10 minutes
                        </button>
                        <button class="reminder-option glass-card p-3 rounded-lg text-center hover:bg-indigo-500/20 transition selected" data-minutes="15">
                            15 minutes
                        </button>
                        <button class="reminder-option glass-card p-3 rounded-lg text-center hover:bg-indigo-500/20 transition" data-minutes="30">
                            30 minutes
                        </button>
                        <button class="reminder-option glass-card p-3 rounded-lg text-center hover:bg-indigo-500/20 transition" data-minutes="60">
                            1 hour
                        </button>
                        <button class="reminder-option glass-card p-3 rounded-lg text-center hover:bg-indigo-500/20 transition" data-minutes="120">
                            2 hours
                        </button>
                    </div>
                    
                    <!-- Custom time input -->
                    <div class="mt-3 flex items-center gap-2">
                        <label class="text-sm text-gray-400">Custom:</label>
                        <input type="number" id="customMinutes" class="glass-input w-20 px-2 py-1" min="1" max="1440" placeholder="min">
                        <span class="text-sm text-gray-400">minutes</span>
                    </div>
                </div>
                
                <!-- Current Reminder Status -->
                <div id="currentReminderStatus" class="hidden mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/40">
                    <p class="text-sm text-green-200">
                        <i class="fas fa-check-circle mr-1"></i>
                        Reminder is currently set for <span id="currentReminderTime"></span> minutes before
                    </p>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex gap-3 justify-end">
                    <button id="removeReminderBtn" class="btn-secondary hidden">
                        <i class="fas fa-bell-slash mr-1"></i>
                        Remove Reminder
                    </button>
                    <button id="cancelReminderBtn" class="btn-secondary">
                        Cancel
                    </button>
                    <button id="setReminderBtn" class="btn-primary">
                        <i class="fas fa-bell mr-1"></i>
                        Set Reminder
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    // Create notification settings panel
    createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'notificationSettings';
        panel.className = 'glass-pane rounded-xl p-4 mb-4';
        panel.innerHTML = `
            <h3 class="text-lg font-semibold mb-3 text-gray-100">
                <i class="fas fa-bell mr-2 text-indigo-400"></i>
                Notification Settings
            </h3>
            
            <div class="space-y-3">
                <!-- Enable Notifications Toggle -->
                <div class="flex items-center justify-between">
                    <label class="text-sm text-gray-300">Enable Notifications</label>
                    <label class="switch">
                        <input type="checkbox" id="enableNotifications" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <!-- Default Reminder Time -->
                <div class="flex items-center justify-between">
                    <label class="text-sm text-gray-300">Default Reminder</label>
                    <select id="defaultReminderTime" class="glass-input px-3 py-1 text-sm">
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15" selected>15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                    </select>
                </div>
                
                <!-- Sound Notifications -->
                <div class="flex items-center justify-between">
                    <label class="text-sm text-gray-300">Sound Alerts</label>
                    <label class="switch">
                        <input type="checkbox" id="soundAlerts" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                
                <!-- Browser Notifications Status -->
                <div id="browserNotificationStatus" class="p-2 rounded-lg bg-white/5">
                    <p class="text-xs text-gray-400">
                        <i class="fas fa-info-circle mr-1"></i>
                        <span id="notificationStatusText">Checking notification status...</span>
                    </p>
                </div>
                
                <!-- Test Notification Button -->
                <button id="testNotificationBtn" class="btn-secondary w-full text-sm">
                    <i class="fas fa-bell mr-1"></i>
                    Test Notification
                </button>
            </div>
        `;
        
        return panel;
    }

    // Initialize reminder UI
    init() {
        // Add modal to body
        if (!document.getElementById('reminderModal')) {
            document.body.appendChild(this.createReminderModal());
        }
        
        // Add event listeners
        this.attachEventListeners();
        
        // Update notification status
        this.updateNotificationStatus();
        
        // Load user preferences
        this.loadUserPreferences();
    }

    // Attach event listeners
    attachEventListeners() {
        const modal = document.getElementById('reminderModal');
        
        // Modal backdrop click
        modal.querySelector('.modal-backdrop').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Cancel button
        document.getElementById('cancelReminderBtn').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Set reminder button
        document.getElementById('setReminderBtn').addEventListener('click', () => {
            this.setReminder();
        });
        
        // Remove reminder button
        document.getElementById('removeReminderBtn').addEventListener('click', () => {
            this.removeReminder();
        });
        
        // Request permission button
        document.getElementById('requestPermissionBtn')?.addEventListener('click', async () => {
            const granted = await this.notificationManager.requestPermission();
            if (granted) {
                this.updateNotificationStatus();
                document.getElementById('notificationPermissionBanner').classList.add('hidden');
            }
        });
        
        // Reminder option buttons
        modal.querySelectorAll('.reminder-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove selected class from all
                modal.querySelectorAll('.reminder-option').forEach(b => {
                    b.classList.remove('selected', 'bg-indigo-500/20');
                });
                // Add selected class to clicked
                e.target.classList.add('selected', 'bg-indigo-500/20');
                // Clear custom input
                document.getElementById('customMinutes').value = '';
            });
        });
        
        // Custom minutes input
        document.getElementById('customMinutes').addEventListener('input', (e) => {
            if (e.target.value) {
                // Remove selected class from preset options
                modal.querySelectorAll('.reminder-option').forEach(b => {
                    b.classList.remove('selected', 'bg-indigo-500/20');
                });
            }
        });
    }

    // Open modal for a task
    openModal(task) {
        this.currentTask = task;
        const modal = document.getElementById('reminderModal');
        
        // Update task info
        document.getElementById('taskEmoji').textContent = task.emoji;
        document.getElementById('taskText').textContent = task.text;
        
        if (task.time) {
            document.getElementById('taskTime').classList.remove('hidden');
            document.getElementById('taskTimeText').textContent = this.formatTime(task.time);
        } else {
            document.getElementById('taskTime').classList.add('hidden');
        }
        
        // Check notification permission
        if (this.notificationManager.permission !== 'granted') {
            document.getElementById('notificationPermissionBanner').classList.remove('hidden');
        } else {
            document.getElementById('notificationPermissionBanner').classList.add('hidden');
        }
        
        // Show current reminder if exists
        if (task.reminder_enabled && task.reminder_minutes) {
            document.getElementById('currentReminderStatus').classList.remove('hidden');
            document.getElementById('currentReminderTime').textContent = task.reminder_minutes;
            document.getElementById('removeReminderBtn').classList.remove('hidden');
            
            // Select the current reminder time
            const option = modal.querySelector(`.reminder-option[data-minutes="${task.reminder_minutes}"]`);
            if (option) {
                modal.querySelectorAll('.reminder-option').forEach(b => {
                    b.classList.remove('selected', 'bg-indigo-500/20');
                });
                option.classList.add('selected', 'bg-indigo-500/20');
            } else {
                document.getElementById('customMinutes').value = task.reminder_minutes;
            }
        } else {
            document.getElementById('currentReminderStatus').classList.add('hidden');
            document.getElementById('removeReminderBtn').classList.add('hidden');
        }
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('reminderModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        this.currentTask = null;
    }

    // Set reminder
    async setReminder() {
        if (!this.currentTask) return;
        
        // Get selected minutes
        let minutes;
        const customValue = document.getElementById('customMinutes').value;
        if (customValue) {
            minutes = parseInt(customValue);
        } else {
            const selected = document.querySelector('.reminder-option.selected');
            if (!selected) {
                alert('Please select a reminder time');
                return;
            }
            minutes = parseInt(selected.dataset.minutes);
        }
        
        // Validate time
        if (!this.currentTask.time) {
            alert('Cannot set reminder for task without a specific time');
            return;
        }
        
        // Schedule reminder
        const success = await this.notificationManager.scheduleReminder(this.currentTask, minutes);
        
        if (success) {
            // Update task object
            this.currentTask.reminder_enabled = true;
            this.currentTask.reminder_minutes = minutes;
            
            // Update UI
            this.updateTaskReminderIcon(this.currentTask);
            
            // Close modal
            this.closeModal();
            
            // Show success message
            this.showToast('Reminder set successfully', 'success');
        } else {
            this.showToast('Failed to set reminder', 'error');
        }
    }

    // Remove reminder
    async removeReminder() {
        if (!this.currentTask) return;
        
        // Cancel reminder
        this.notificationManager.cancelReminder(this.currentTask.id);
        
        // Update task object
        this.currentTask.reminder_enabled = false;
        this.currentTask.reminder_minutes = null;
        
        // Update UI
        this.updateTaskReminderIcon(this.currentTask);
        
        // Close modal
        this.closeModal();
        
        // Show success message
        this.showToast('Reminder removed', 'success');
    }

    // Update task reminder icon in the UI
    updateTaskReminderIcon(task) {
        const taskElement = document.querySelector(`[data-id="${task.id}"]`);
        if (taskElement) {
            const reminderBtn = taskElement.querySelector('.reminder-btn');
            if (reminderBtn) {
                const hasReminder = task.reminder_enabled && task.reminder_minutes !== null;
                reminderBtn.className = `reminder-btn ${hasReminder ? 'text-indigo-400' : 'text-gray-400'} hover:text-indigo-400 transition`;
                reminderBtn.innerHTML = `<i class="fas fa-bell${hasReminder ? '' : '-slash'}"></i>`;
                reminderBtn.title = hasReminder ? 
                    `Reminder set for ${task.reminder_minutes} minutes before` : 
                    'Set reminder';
            }
        }
    }

    // Update notification status display
    updateNotificationStatus() {
        const statusText = document.getElementById('notificationStatusText');
        if (!statusText) return;
        
        const permission = NotificationManager.getPermissionStatus();
        
        switch (permission) {
            case 'granted':
                statusText.innerHTML = '<i class="fas fa-check-circle text-green-400 mr-1"></i> Notifications enabled';
                break;
            case 'denied':
                statusText.innerHTML = '<i class="fas fa-times-circle text-red-400 mr-1"></i> Notifications blocked';
                break;
            case 'default':
                statusText.innerHTML = '<i class="fas fa-question-circle text-yellow-400 mr-1"></i> Notifications not enabled';
                break;
            case 'unsupported':
                statusText.innerHTML = '<i class="fas fa-exclamation-circle text-gray-400 mr-1"></i> Notifications not supported';
                break;
        }
    }

    // Load user preferences
    async loadUserPreferences() {
        const prefs = await this.notificationManager.loadPreferences();
        
        if (document.getElementById('enableNotifications')) {
            document.getElementById('enableNotifications').checked = prefs.notifications_enabled;
        }
        if (document.getElementById('defaultReminderTime')) {
            document.getElementById('defaultReminderTime').value = prefs.default_reminder_minutes;
        }
        if (document.getElementById('soundAlerts')) {
            document.getElementById('soundAlerts').checked = prefs.sound_enabled;
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 glass-pane px-4 py-3 rounded-lg z-50 transform transition-all duration-300 translate-y-full`;
        
        const icons = {
            success: 'fas fa-check-circle text-green-400',
            error: 'fas fa-exclamation-circle text-red-400',
            info: 'fas fa-info-circle text-blue-400',
            warning: 'fas fa-exclamation-triangle text-yellow-400'
        };
        
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="${icons[type]}"></i>
                <span class="text-gray-200">${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-y-full');
            toast.classList.add('translate-y-0');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-y-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
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
}

// Export for use in main app
window.ReminderUI = ReminderUI;