const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();

const Cost = require('./models/costs');
const Report = require('./models/reports');
const Log = require('./models/logs');

const app = express();
const PORT = 3002;

const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });
app.use(express.json());

app.use(async (req, res, next) => {
    const msg = `[Costs Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try { await new Log({ level: 'info', message: msg }).save(); } catch (e) {}
    next();
});

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ Costs DB Connected"));

// --- Endpoints ---

// הוספת הוצאה
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
        res.status(500).json({ error: error.message });
    }
});

// הפקת דוח
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;
        // בדיקת Cache
        const existingReport = await Report.findOne({ userid: id, year, month });
        if (existingReport) return res.json(existingReport.costs);

        // חישוב
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        const costs = await Cost.find({ userid: id, created_at: { $gte: startDate, $lt: endDate } });

        const reportData = { food: [], health: [], housing: [], sports: [], education: [] };
        costs.forEach(cost => {
            if (reportData[cost.category]) {
                reportData[cost.category].push({ day: cost.created_at.getDate(), description: cost.description, sum: cost.sum });
            }
        });

        await new Report({ userid: id, year, month, costs: reportData }).save();
        res.json(reportData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`💰 Costs Service running on port ${PORT}`));
