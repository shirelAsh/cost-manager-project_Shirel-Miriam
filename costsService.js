const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();

// Import models
const Cost = require('./models/costs');
const Report = require('./models/reports');
const Log = require('./models/logs');

const app = express();
const PORT = process.env.PORT || process.env.PORT_COSTS || 3002;
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

app.use(express.json());

// Request logging middleware
app.use(async (req, res, next) => {
    const msg = `[Costs Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try { await new Log({ level: 'info', message: msg }).save(); } catch (e) {}
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Costs DB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- Endpoints ---

// POST /api/add - Add a new cost
app.post('/api/add', async (req, res) => {
    try {
        const { description, category, userid, sum, created_at } = req.body;

        const newCost = new Cost({
            description, category, userid, sum,
            created_at: created_at ? new Date(created_at) : undefined
        });

        await newCost.save();
        res.status(201).json(newCost);
    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

// GET /api/report - Get monthly report (uses Computed Pattern caching)
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;
        const userId = parseInt(id);
        const reportYear = parseInt(year);
        const reportMonth = parseInt(month);

        // 1. Try to fetch from cache
        const existingReport = await Report.findOne({ userid: userId, year: reportYear, month: reportMonth });
        if (existingReport) return res.json(existingReport.costs);

        // 2. If not in cache, calculate from raw costs
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 1);

        const costs = await Cost.find({
            userid: userId,
            created_at: { $gte: startDate, $lt: endDate }
        });

        const reportData = { food: [], health: [], housing: [], sports: [], education: [] };

        // Group costs by category
        costs.forEach(cost => {
            if (reportData[cost.category]) {
                reportData[cost.category].push({
                    day: cost.created_at.getDate(),
                    description: cost.description,
                    sum: cost.sum
                });
            }
        });

        // 3. Save to cache only if the month has ended
        const now = new Date();
        if (reportYear < now.getFullYear() || (reportYear === now.getFullYear() && reportMonth < now.getMonth() + 1)) {
            await new Report({ userid: userId, year: reportYear, month: reportMonth, costs: reportData }).save();
        }

        res.json(reportData);
    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

app.listen(PORT, () => console.log(`💰 Costs Service running on port ${PORT}`));