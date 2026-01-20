const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
const axios = require('axios');
require('dotenv').config();

// Import Mongoose models
const Cost = require('./models/costs');
const Report = require('./models/reports');
const Log = require('./models/logs');

// Initialize Express app and logger
const app = express();
const PORT = process.env.PORT || process.env.PORT_COSTS || 3002;
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

// Middleware
app.use(express.json());

/* Centralized Logging Middleware */
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

// POST /api/add
app.post('/api/add', async (req, res) => {
    try {
        const { description, category, userid, sum, created_at } = req.body;

        // Validation 1: Required fields
        if (!description || !category || !userid || !sum) {
            return res.status(400).json({ id: 1, message: "Missing required fields" });
        }

        // Validation 2: Types (Must be numbers) - זה מתקן את הנפילה של "Cost Sum as String"
        if (isNaN(sum) || isNaN(userid)) {
            return res.status(400).json({ message: "Sum and UserID must be numbers" });
        }

        // Validation 3: Positive Sum
        if (sum < 0) {
            return res.status(400).json({ id: 1, message: "Sum cannot be negative" });
        }

        /* Check if user exists */
        try {
            await axios.get(`https://cost-manager-users-gcrb.onrender.com/api/users/${userid}`);
        } catch (err) {
            return res.status(400).json({ id: 1, message: "User does not exist." });
        }

        const newCost = new Cost({
            description,
            category,
            userid,
            sum,
            created_at: created_at ? new Date(created_at) : undefined
        });

        await newCost.save();
        res.status(201).json(newCost);

    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

// GET /api/report
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        // Validation 1: Missing parameters - זה מתקן את הנפילה של "Missing Query Parameters"
        if (!id || !year || !month) {
            return res.status(400).json({ error: "Missing required query parameters: id, year, month" });
        }

        // Validation 2: Types (Must be numbers) - זה מתקן את הנפילה של "Report Year as String"
        if (isNaN(id) || isNaN(year) || isNaN(month)) {
            return res.status(400).json({ error: "ID, Year, and Month must be numbers" });
        }

        const userId = parseInt(id);
        const reportYear = parseInt(year);
        const reportMonth = parseInt(month);

        const formatResponse = (uId, yr, mon, data) => {
            const costsArray = Object.keys(data).map(category => ({
                [category]: data[category]
            }));
            return { userid: uId, year: yr, month: mon, costs: costsArray };
        };

        // 1. Cache Lookup
        const existingReport = await Report.findOne({ userid: userId, year: reportYear, month: reportMonth });
        if (existingReport) {
            return res.json(formatResponse(userId, reportYear, reportMonth, existingReport.costs));
        }

        // 2. Cache Miss - Calculate
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 1);

        const costs = await Cost.find({
            userid: userId,
            created_at: { $gte: startDate, $lt: endDate }
        });

        const reportData = { food: [], health: [], housing: [], sports: [], education: [] };

        costs.forEach(cost => {
            if (reportData[cost.category]) {
                reportData[cost.category].push({
                    day: cost.created_at.getDate(),
                    description: cost.description,
                    sum: cost.sum
                });
            }
        });

        // 3. Save to Cache (if past month)
        const now = new Date();
        const isPastMonth = reportYear < now.getFullYear() ||
            (reportYear === now.getFullYear() && reportMonth < now.getMonth() + 1);

        if (isPastMonth) {
            await new Report({
                userid: userId,
                year: reportYear,
                month: reportMonth,
                costs: reportData
            }).save();
        }

        res.json(formatResponse(userId, reportYear, reportMonth, reportData));

    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

// Health Check
app.get('/', (req, res) => {
    res.send('Costs Service is UP');
});

// Start server
app.listen(PORT, () => console.log(`Costs Service running on port ${PORT}`));