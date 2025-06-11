AI-Powered Weekly Planner by Rodytech

Welcome to the AI-Powered Weekly Planner, a beautiful and intelligent task management application designed to help you organize your week with ease. This single-file web application uses a sleek "liquid glass" interface and leverages the power of Google's Gemini AI to make your planning smarter and more intuitive.


(Suggestion: You can take a screenshot of the app and upload it to a service like Imgur to get a link for this image)
✨ Features

    Weekly View & Navigation: Easily view your entire week at a glance. Navigate between past and future weeks with a single click.

    AI Smart Emoji: Forget manually choosing icons. Gemini automatically assigns a relevant emoji based on the context of your task.

    AI Task Suggestions: Feeling stuck? Provide a high-level goal (e.g., "Learn a new skill"), and the AI will generate a list of actionable sub-tasks for you.

    AI Smart Scheduling: For any day with unscheduled tasks, the "Smart Plan" button will intelligently assign a logical time for each task based on its priority.

    Full Task Management:

        Create: Add tasks with a description, optional time, priority, and tags.

        Edit: Modify any aspect of a task after it's been created.

        Delete: Remove single tasks or clear all tasks at once with a confirmation.

    Priorities & Filtering: Assign a Low, Medium, or High priority to tasks, visually distinguished by color. Click on any tag to instantly filter your task list.

    Persistent Storage: Your tasks are automatically saved to your browser's localStorage, so your weekly plan is always there when you return.

    Stunning UI/UX:

        Liquid Glass Design: A modern, beautiful interface with a frosted glass look and animated gradient background.

        Celebratory Animations: Enjoy a burst of confetti and a subtle sound effect every time you complete a task for positive reinforcement.

🚀 Installation & Usage

This is a self-contained single-file web application. No complex setup is required.

1. Download the Code:

    Copy the complete HTML code from the index.html file.

    Save it on your computer in a new file named index.html.

2. Get a Gemini API Key:

    The AI features of this app are powered by the Google Gemini API.

    Go to Google AI Studio to get a free API key.

3. Add Your API Key:

    Open the index.html file in a text editor.

    Find the following line in the <script> section (around line 430):

    const apiKey = ""; 

    Paste your API key inside the quotes:

    const apiKey = "YOUR_API_KEY_HERE"; 

    Save the file.

4. Run the App:

    Simply open the index.html file in your web browser (like Chrome, Firefox, or Edge) to start using your planner!

🛠️ Key Technologies

    HTML5: The core structure of the application.

    Tailwind CSS: For modern, utility-first styling.

    JavaScript (ES6+): Powers all the application logic, interactivity, and API calls.

    Google Gemini API: Used for all intelligent features, including emoji assignment, task suggestions, and smart scheduling.

    Tone.js: For generating the in-browser sound effects.

    canvas-confetti: For the fun and celebratory completion animations.

⚙️ How It Works

    Local Persistence: The application uses the browser's localStorage to save all tasks. This is a key-value store where the entire allTasks array is converted to a JSON string and saved. When the page loads, it checks for this data and loads it back into the app, ensuring your schedule persists between sessions.

    AI Integration: The callGemini function is the heart of the AI features. It securely sends a specifically crafted prompt to the Gemini API and processes the text-based response. For suggestions, it parses a JSON array, and for emojis, it expects a single character, making the AI integration seamless.

📄 License & Copyright

© 2024 Rodytech. All Rights Reserved.
