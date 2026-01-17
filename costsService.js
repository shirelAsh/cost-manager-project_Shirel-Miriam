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

/* Centralized Logging Middleware:
   Logs every incoming request to both the console and the MongoDB 'logs' collection.
   This ensures traceability of actions within the Costs Service.
*/
app.use(async (req, res, next) => {
    const msg = `[Costs Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);

    try {
        // Save log entry to MongoDB
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
 */
app.post('/api/add', async (req, res) => {
    try {
        // Destructure fields from request body
        const { description, category, userid, sum, created_at } = req.body;

        // Input Validation: Ensure all required fields are present
        if (!description || !category || !userid || !sum) {
            return res.status(400).json({ id: 1, message: "Missing required fields" });
        }

        // Input Validation: Ensure sum is positive
        if (sum < 0) {
            return res.status(400).json({ id: 1, message: "Sum cannot be negative" });
        }

        /* Inter-Service Communication & Data Integrity:
           Before adding a cost, we must validate that the 'userid' exists.
           We perform a synchronous HTTP GET request to the Users Service (Microservices pattern).
        */
        try {
            // Making a GET request to the Users Service on Render
            await axios.get(`https://cost-manager-users-gcrb.onrender.com/api/users/${userid}`);
        } catch (err) {
            // If the user service returns 404, we deny the cost addition
            return res.status(400).json({ id: 1, message: "User does not exist." });
        }

        // Create a new Cost document
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
        res.status(500).json({ id: 1, message: error.message });
    }
});

/*
 * Computed Pattern Implementation:
 * To improve performance and reduce database load, the report logic works as follows:
 * 1. Check if a pre-calculated report exists in the 'reports' collection (Cache Hit).
 * 2. If found, return the cached data immediately.
 * 3. If not found (Cache Miss), query the 'costs' collection to aggregate data.
 * 4. If the requested month is in the past, save the result to cache for future use.
 */
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        // Parsing query parameters to integers
        const userId = parseInt(id);
        const reportYear = parseInt(year);
        const reportMonth = parseInt(month);

        // Helper function to format the response structure
        // Converts { food: [] } -> [ { food: [] } ] as per requirements
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

        // Step 1: Cache Lookup
        // Try to fetch the report from the 'reports' collection
        const existingReport = await Report.findOne({ userid: userId, year: reportYear, month: reportMonth });

        // If found in cache, return immediately
        if (existingReport) {
            return res.json(formatResponse(userId, reportYear, reportMonth, existingReport.costs));
        }

        // Step 2: Cache Miss - Calculate from raw data
        // Define the time range (start and end of the month)
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 1);

        // Query the 'costs' collection for matching documents
        const costs = await Cost.find({
            userid: userId,
            created_at: { $gte: startDate, $lt: endDate }
        });

        // Initialize the internal data structure
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

        // Step 3: Caching Logic
        // Check if the requested month is historically complete (in the past)
        const now = new Date();
        const isPastMonth = reportYear < now.getFullYear() ||
            (reportYear === now.getFullYear() && reportMonth < now.getMonth() + 1);

        // Only cache reports for past months
        if (isPastMonth) {
            await new Report({
                userid: userId,
                year: reportYear,
                month: reportMonth,
                costs: reportData
            }).save();
        }

        // Return the calculated report
        res.json(formatResponse(userId, reportYear, reportMonth, reportData));

    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Costs Service running on port ${PORT}`));