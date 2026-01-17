const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();
const Log = require('./models/logs');

const app = express();
const PORT = process.env.PORT || process.env.PORT_ADMIN || 3004;
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Admin DB Connected"))
    .catch(err => console.error("❌ Admin DB Connection Error:", err));

// Request logging middleware
app.use(async (req, res, next) => {
    const msg = `[Admin Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try { await new Log({ level: 'info', message: msg }).save(); } catch (e) {}
    next();
});

// GET /api/about - Return team members details
app.get('/api/about', (req, res) => {
    const team = [
        { first_name: "Shirel", last_name: "Ashtamker" },
        { first_name: "Miriam", last_name: "Ben David" }
    ];
    res.json(team);
});

app.listen(PORT, () => console.log(`👑 Admin Service running on port ${PORT}`));