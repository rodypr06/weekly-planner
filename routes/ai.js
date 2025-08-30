// File: routes/ai.js
// Common AI/Gemini route handlers

const express = require('express');
const fetch = require('node-fetch');
const logger = require('../utils/logger');
const {
    handleValidationErrors,
    aiPromptValidationRules
} = require('../middleware/security');

/**
 * Create AI routes
 * @param {Object} authAdapter - Authentication adapter instance
 * @param {Object} rateLimiters - Rate limiting middlewares
 * @returns {Object} Express router
 */
function createAIRoutes(authAdapter, rateLimiters) {
    const router = express.Router();
    const requireAuth = authAdapter.requireAuth();

    // Gemini AI endpoint
    router.post('/gemini', aiPromptValidationRules(), handleValidationErrors, rateLimiters.aiLimiter, requireAuth, async (req, res) => {
        try {
            const { prompt } = req.body;
            
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                return res.status(500).json({ error: 'API key is not configured on the server.' });
            }
            
            if (!prompt) {
                return res.status(400).json({ error: 'Prompt is required.' });
            }
            
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };
            
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!apiResponse.ok) {
                const errorBody = await apiResponse.text();
                logger.error('Google AI API Error:', errorBody);
                return res.status(apiResponse.status).json({ error: 'Failed to get response from AI.' });
            }
            
            const data = await apiResponse.json();
            res.json(data);
            
        } catch (error) {
            logger.error('Server-side error:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    });

    // Smart Plan endpoint - AI-powered task scheduling
    router.post('/smart-plan', aiPromptValidationRules(), handleValidationErrors, rateLimiters.aiLimiter, requireAuth, async (req, res) => {
        try {
            const { tasks, date } = req.body;
            
            const apiKey = process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                return res.status(500).json({ error: 'API key is not configured on the server.' });
            }
            
            if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
                return res.status(400).json({ error: 'Tasks array is required.' });
            }
            
            // Build prompt for AI scheduling
            const taskDescriptions = tasks.map(t => `text: ${t.text}, priority: ${t.priority}`).join('; ');
            const prompt = `Here is a list of tasks for today with priorities: ${taskDescriptions}. Suggest a logical schedule starting from the current time. Assign a time (HH:mm format) for each task, considering the priority. Return a JSON object where keys are task descriptions and values are suggested times. Example: {"Task 1": "14:30", "Task 2": "16:00"}`;
            
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };
            
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!apiResponse.ok) {
                const errorBody = await apiResponse.text();
                logger.error('Google AI API Error:', errorBody);
                return res.status(apiResponse.status).json({ error: 'Failed to get response from AI.' });
            }
            
            const data = await apiResponse.json();
            
            // Extract the text response from Gemini's response format
            let aiResponse = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                aiResponse = data.candidates[0].content.parts[0].text;
            }
            
            // Clean and parse the AI response
            const cleanResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            
            try {
                const schedule = JSON.parse(cleanResponse);
                res.json({ schedule, rawResponse: aiResponse });
            } catch (parseError) {
                logger.error('Failed to parse AI schedule response:', parseError);
                res.json({ rawResponse: aiResponse, error: 'Could not parse AI response as JSON' });
            }
            
        } catch (error) {
            logger.error('Smart plan server-side error:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    });

    return router;
}

module.exports = { createAIRoutes };