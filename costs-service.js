const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();

// Importing Mongoose models
const Cost = require('./models/costs');
const Report = require('./models/reports'); // Required for the 'Computed Pattern' (caching reports)
const Log = require('./models/logs');       // Required for saving audit logs

const app = express();
const PORT = process.env.PORT_COSTS || 3002;

// Initialize logger with pretty printing for better readability during development
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

app.use(express.json());

/**
 * Middleware: Request Logging
 * ---------------------------
 * Intercepts every incoming request to the Costs Service.
 * 1. Logs the HTTP method and URL to the console (via Pino).
 * 2. Persists the log entry to the MongoDB 'logs' collection for audit purposes.
 */
app.use(async (req, res, next) => {
    const msg = `[Costs Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try {
        // Save log asynchronously to database
        await new Log({ level: 'info', message: msg }).save();
    } catch (e) {
        console.error("Failed to save log to DB", e);
    }
    next();
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Costs DB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- Endpoints ---

/**
 * Endpoint: POST /api/add
 * Description: Adds a new cost item to the database.
 * Logic: Accepts cost details. If 'created_at' is not provided,
 * the model defaults to the current timestamp.
 */
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

/**
 * Endpoint: GET /api/report
 * Description: Retrieves a monthly report for a specific user.
 * Architecture: Implements the 'Computed Pattern' (Caching strategy).
 * * Flow:
 * 1. Check if a report for this specific month/year/user already exists in the 'reports' collection.
 * 2. Cache Hit: Return the existing report immediately (Performance Optimization).
 * 3. Cache Miss: Calculate the report from raw data in the 'costs' collection,
 * save it to 'reports' for future requests, and then return it.
 */
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        // --- Step 1: Check Cache (Optimization) ---
        const existingReport = await Report.findOne({ userid: id, year, month });
        if (existingReport) {
            return res.json(existingReport.costs);
        }

        // --- Step 2: Calculate Report (If not found in cache) ---

        // Date Calculation: JavaScript months are 0-indexed (0 = January).
        // We set the range from the 1st of the requested month to the 1st of the NEXT month.
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const costs = await Cost.find({
            userid: id,
            created_at: { $gte: startDate, $lt: endDate }
        });

        // Initialize report structure
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

        // --- Step 3: Save to Cache (Only if the month has passed) ---
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 1-12

        // Save to database only if the year is less than the current year,
// or if the year is the same but the month is less than the current month.
        if (year < currentYear || (year == currentYear && month < currentMonth)) {
            await new Report({ userid: id, year, month, costs: reportData }).save();
        }
        res.json(reportData);
    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

app.listen(PORT, () => console.log(`💰 Costs Service running on port ${PORT}`));