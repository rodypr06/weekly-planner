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

    return router;
}

module.exports = { createAIRoutes };