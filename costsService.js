const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
const axios = require('axios'); // Required for inter-service communication
require('dotenv').config();

// Import Mongoose models
const Cost = require('./models/costs');
const Report = require('./models/reports');
const Log = require('./models/logs');

// Initialize Express app and logger
const app = express();
const PORT = process.env.PORT || process.env.PORT_COSTS || 3002;
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

// Middleware to parse JSON bodies
app.use(express.json());

// Request logging middleware
// Logs every incoming request to both the console and the MongoDB 'logs' collection
app.use(async (req, res, next) => {
    const msg = `[Costs Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try {
        await new Log({ level: 'info', message: msg }).save();
    } catch (e) {
        console.error("Failed to save log:", e.message);
    }
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Costs DB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- Endpoints ---

/**
 * POST /api/add
 * Adds a new cost item to the database.
 * Performs input validation and checks if the user exists via the Users Service.
 */
app.post('/api/add', async (req, res) => {
    try {
        const { description, category, userid, sum, created_at } = req.body;

        // Input Validation: Ensure all required fields are present
        if (!description || !category || !userid || !sum) {
            return res.status(400).json({ id: 1, message: "Missing required fields (description, category, userid, sum)" });
        }

        // Input Validation: Ensure sum is positive
        if (sum < 0) {
            return res.status(400).json({ id: 1, message: "Sum cannot be negative" });
        }

        // Check if the user exists by communicating with the Users Service.
        // This is required to maintain data integrity across microservices.
        // We assume the Users Service is running on localhost:3001.
        try {
            // Making a GET request to the Users Service
            await axios.get(`https://cost-manager-users-gcrb.onrender.com/api/users/${userid}`);
        } catch (err) {
            // If the user service returns 404 or fails, we deny the cost addition
            return res.status(400).json({ id: 1, message: "User does not exist. Cannot add cost." });
        }

        // Create a new Cost document
        // If 'created_at' is not provided, it defaults to now (handled by Schema or logic below)
        const newCost = new Cost({
            description,
            category,
            userid,
            sum,
            created_at: created_at ? new Date(created_at) : undefined
        });

        // Save the new cost to the 'costs' collection
        await newCost.save();
        res.status(201).json(newCost);

    } catch (error) {
        // Return a generic error message with the required ID format
        res.status(500).json({ id: 1, message: error.message });
    }
});

/*
 * Computed Pattern Implementation:
 * To improve performance and reduce database load, the report logic works as follows:
 * 1. Check if a pre-calculated report exists in the 'reports' collection (Cache).
 * 2. If found, return the cached data immediately.
 * 3. If not found, query the 'costs' collection to aggregate data and calculate the report.
 * 4. If the requested month has already passed (is in the past), save the calculated report
 * to the 'reports' collection for future requests.
 */
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        // Parsing query parameters to integers for accurate comparison
        const userId = parseInt(id);
        const reportYear = parseInt(year);
        const reportMonth = parseInt(month);

        // Helper function to format the response according to project requirements.
        // It converts the internal object structure { food: [] } into the required array structure [ { food: [] } ].
        const formatResponse = (uId, yr, mon, data) => {
            const costsArray = Object.keys(data).map(category => ({
                [category]: data[category]
            }));

            return {
                userid: uId,
                year: yr,
                month: mon,
                costs: costsArray
            };
        };

        // Step 1: Try to fetch the report from the cache (MongoDB 'reports' collection)
        const existingReport = await Report.findOne({ userid: userId, year: reportYear, month: reportMonth });

        // If the report exists in cache, return it immediately (formatted)
        if (existingReport) {
            return res.json(formatResponse(userId, reportYear, reportMonth, existingReport.costs));
        }

        // Step 2: If not in cache, calculate the report from raw data.
        // Define the time range for the requested month.
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 1);

        // Query the 'costs' collection for all costs matching the user and date range
        const costs = await Cost.find({
            userid: userId,
            created_at: { $gte: startDate, $lt: endDate }
        });

        // Initialize the internal data structure (grouped by category)
        const reportData = { food: [], health: [], housing: [], sports: [], education: [] };

        // Iterate over the fetched costs and group them into the corresponding categories
        costs.forEach(cost => {
            if (reportData[cost.category]) {
                reportData[cost.category].push({
                    day: cost.created_at.getDate(),
                    description: cost.description,
                    sum: cost.sum
                });
            }
        });

        // Step 3: Save the calculated report to cache only if the month has ended.
        // We compare the requested date against the current date.
        const now = new Date();
        const isPastMonth = reportYear < now.getFullYear() ||
            (reportYear === now.getFullYear() && reportMonth < now.getMonth() + 1);

        if (isPastMonth) {
            // Save to DB as an object (more efficient for internal storage)
            await new Report({
                userid: userId,
                year: reportYear,
                month: reportMonth,
                costs: reportData
            }).save();
        }

        // Return the freshly calculated (and possibly cached) report to the client
        res.json(formatResponse(userId, reportYear, reportMonth, reportData));

    } catch (error) {
        // Handle any potential errors during the process
        res.status(500).json({ id: 1, message: error.message });
    }
});

// Start the server
app.listen(PORT, () => console.log(`💰 Costs Service running on port ${PORT}`));