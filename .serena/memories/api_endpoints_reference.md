# API Endpoints Reference - Weekly Planner

## Authentication Endpoints

### POST /api/register
Register a new user account.

**Request Body:**
```json
{
    "username": "string (required)",
    "password": "string (required, min 6 chars)"
}
```

**Response:**
```json
{
    "success": true,
    "message": "User registered successfully"
}
```

**Error Response:**
```json
{
    "error": "Username already exists" | "Registration failed"
}
```

### POST /api/login
Authenticate user and create session.

**Request Body:**
```json
{
    "username": "string (required)",
    "password": "string (required)"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Login successful",
    "user": {
        "id": "integer",
        "username": "string"
    }
}
```

**Error Response:**
```json
{
    "error": "Invalid credentials" | "Login failed"
}
```

### POST /api/logout
Terminate user session.

**Headers:** Requires valid session cookie

**Response:**
```json
{
    "success": true,
    "message": "Logout successful"
}
```

### GET /api/me
Get current authenticated user information.

**Headers:** Requires valid session cookie

**Response:**
```json
{
    "authenticated": true,
    "user": {
        "id": "integer",
        "username": "string"
    }
}
```

**Unauthenticated Response:**
```json
{
    "authenticated": false
}
```

## Task Management Endpoints

### GET /api/tasks
Fetch tasks for the authenticated user.

**Headers:** Requires valid session cookie

**Query Parameters:**
- `date` (optional): YYYY-MM-DD format to filter tasks by date

**Response:**
```json
[
    {
        "id": "integer",
        "user_id": "integer",
        "date": "YYYY-MM-DD",
        "text": "Task description",
        "emoji": "🎯",
        "time": "HH:MM" | null,
        "priority": "low" | "medium" | "high",
        "tags": "comma,separated,tags" | null,
        "completed": 0 | 1,
        "archived": 0 | 1
    }
]
```

### POST /api/tasks
Create a new task.

**Headers:** Requires valid session cookie

**Request Body:**
```json
{
    "date": "YYYY-MM-DD (required)",
    "text": "Task description (required)",
    "emoji": "🎯 (required)",
    "time": "HH:MM (optional)",
    "priority": "low|medium|high (required)",
    "tags": "comma,separated,tags (optional)"
}
```

**Response:**
```json
{
    "success": true,
    "id": "integer",
    "message": "Task created successfully"
}
```

### PUT /api/tasks/:id
Update an existing task.

**Headers:** Requires valid session cookie

**URL Parameters:**
- `id`: Task ID (integer)

**Request Body:** (all fields optional)
```json
{
    "date": "YYYY-MM-DD",
    "text": "Updated task description",
    "emoji": "🎯",
    "time": "HH:MM",
    "priority": "low|medium|high",
    "tags": "comma,separated,tags",
    "completed": 0 | 1
}
```

**Response:**
```json
{
    "success": true,
    "message": "Task updated successfully"
}
```

### DELETE /api/tasks/:id
Delete a specific task.

**Headers:** Requires valid session cookie

**URL Parameters:**
- `id`: Task ID (integer)

**Response:**
```json
{
    "success": true,
    "message": "Task deleted successfully"
}
```

### DELETE /api/tasks
Clear all tasks for the authenticated user.

**Headers:** Requires valid session cookie

**Response:**
```json
{
    "success": true,
    "message": "All tasks cleared successfully"
}
```

## Archive Management Endpoints

### POST /api/tasks/archive
Archive completed tasks for the authenticated user.

**Headers:** Requires valid session cookie

**Response:**
```json
{
    "success": true,
    "archivedCount": "integer",
    "message": "X tasks archived successfully"
}
```

### POST /api/tasks/unarchive
Restore archived tasks for the authenticated user.

**Headers:** Requires valid session cookie

**Response:**
```json
{
    "success": true,
    "restoredCount": "integer", 
    "message": "X tasks restored successfully"
}
```

## AI Integration Endpoint

### POST /api/gemini
Secure proxy for Google Gemini AI API calls.

**Headers:** Requires valid session cookie

**Request Body:**
```json
{
    "prompt": "string (required) - The prompt to send to Gemini AI"
}
```

**Response:**
```json
{
    "success": true,
    "data": "AI generated response text"
}
```

**Error Response:**
```json
{
    "error": "AI request failed" | "API key not configured"
}
```

## Error Handling

### Common HTTP Status Codes
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (task/user not found)
- `500`: Internal Server Error (database/server error)

### Authentication Errors
All authenticated endpoints return `401 Unauthorized` if:
- No session cookie is present
- Session is expired or invalid
- User ID from session doesn't exist in database

### Database Errors
Common database error responses:
```json
{
    "error": "Database operation failed"
}
```

### Input Validation Errors
```json
{
    "error": "Missing required field: fieldName"
}
```

## Session Management

### Session Configuration
- **Store**: SQLite database (`sessions.db`)
- **Duration**: 30 days
- **Cookie**: HTTP-only, secure in production
- **Cleanup**: Expired sessions cleared every 15 minutes

### Session Security
- Sessions are stored server-side in SQLite database
- Client only receives session ID cookie
- Sessions auto-expire after 30 days of inactivity
- Logout immediately destroys session