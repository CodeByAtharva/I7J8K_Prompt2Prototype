const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// This is where you store your API key securely
const GEMINI_API_KEY = "AIzaSyAReylT81P9pEZ_ArKj2cNShRNixyKSBRk"; 
// CORRECTED URL: The URL is now properly formed with "?key="
const  GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" + GEMINI_API_KEY;



app.post('/generate-flashcards', async (req, res) => {
    try {
        const prompt = req.body.prompt;
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        // Check for a non-successful response from the Gemini API
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        res.json(data); // Pass the API response back to the front end
    } catch (error) {
        console.error('Error in proxy server:', error);
        res.status(500).json({ error: 'Failed to generate flashcards' });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
});