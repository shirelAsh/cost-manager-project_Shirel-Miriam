const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file
const Log = require('./models/logs'); // Import the Log model to access the logs collection

const app = express();
const PORT = 3003; // Unique port for the Logs Microservice

// Connect to the shared MongoDB database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Logs DB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- Endpoints ---

/**
 * Endpoint: GET /api/logs
 * Purpose: Retrieves the entire audit trail of the system.
 * Usage: This endpoint is primarily for administrators to monitor system activity
 * and debug issues by viewing the history of requests recorded by other services.
 */
app.get('/api/logs', async (req, res) => {
    try {
        // Fetch all documents from the 'logs' collection
        const logs = await Log.find({});
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// Start the server
app.listen(PORT, () => console.log(`📜 Logs Service running on port ${PORT}`));