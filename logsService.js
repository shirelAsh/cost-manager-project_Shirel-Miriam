const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino'); // Import Pino logger
require('dotenv').config();
const Log = require('./models/logs');

const app = express();
// Set port from environment variables or default to 3003
const PORT = process.env.PORT || process.env.PORT_LOGS || 3003;
// Initialize logger configuration
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Logs DB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// Middleware: Request Logging
// Log every incoming request to the database
app.use(async (req, res, next) => {
    const msg = `[Logs Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try {
        await new Log({ level: 'info', message: msg }).save();
    } catch (e) {
        console.error("Failed to save log to DB", e);
    }
    next();
});

// --- Endpoints ---

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find({});
        res.json(logs);
    } catch (error) {
        // Return error response with ID and message
        res.status(500).json({ id: 1, message: "Failed to fetch logs" });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Logs Service running on port ${PORT}`));