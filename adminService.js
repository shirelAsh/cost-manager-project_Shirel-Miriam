const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();
const Log = require('./models/logs');

const app = express();
const PORT = process.env.PORT || process.env.PORT_ADMIN || 3004;
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

// Database connection is mainly for logging purposes in this service
mongoose.connect(process.env.MONGO_URI);

// --- Middleware: Logging ---
app.use(async (req, res, next) => {
    const msg = `[Admin Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try { await new Log({ level: 'info', message: msg }).save(); } catch (e) {}
    next();
});

/**
 * Endpoint: GET /api/about
 * Purpose: Returns the team members' details.
 * Note: This returns static data as per project requirements.
 */
app.get('/api/about', (req, res) => {
    const team = [
        { first_name: "Shirel", last_name: "Ashtamker" },
        { first_name: "Miriam", last_name: "Ben David" }
    ];
    res.json(team);
});

app.listen(PORT, () => console.log(`👑 Admin Service running on port ${PORT}`));