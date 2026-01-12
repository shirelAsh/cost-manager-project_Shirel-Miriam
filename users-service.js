const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();

// Import models
const User = require('./models/users');
const Cost = require('./models/costs'); // Required to calculate total costs for a specific user
const Log = require('./models/logs');   // Required for saving audit logs

const app = express();
const PORT = 3001; // Unique port for the Users Service

const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });
app.use(express.json());

// --- Middleware: Logging ---
// Logs every request to the console and saves it to the 'logs' collection in MongoDB
app.use(async (req, res, next) => {
    const msg = `[Users Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try { await new Log({ level: 'info', message: msg }).save(); } catch (e) {}
    next();
});

// Connect to the shared MongoDB database
mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ Users DB Connected"));

// --- Endpoints ---

/**
 * Endpoint: POST /api/addusers
 * Purpose: Registers a new user in the system.
 */
app.post('/api/addusers', async (req, res) => {
    try {
        const { id, first_name, last_name, birthday } = req.body;

        // Creating a new user instance based on the Mongoose model
        const newUser = new User({ id, first_name, last_name, birthday: new Date(birthday) });

        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint: GET /api/users/:id
 * Purpose: Retrieves user details AND their total costs.
 * Logic: Fetches the user first, then queries the 'costs' collection to sum up their expenses.
 */
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // 1. Find the user
        const user = await User.findOne({ id: userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. Find all costs associated with this user ID
        const costs = await Cost.find({ userid: userId });

        // 3. Calculate total sum of costs
        let totalCost = 0;
        costs.forEach(c => totalCost += c.sum);

        // Return combined data (User details + Calculated Total)
        res.json({
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.id,
            total_costs: totalCost
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Simple endpoint to list all users (for debugging/admin)
app.get('/api/users', async (req, res) => {
    const users = await User.find({});
    res.json(users);
});

app.listen(PORT, () => console.log(`👤 Users Service running on port ${PORT}`));