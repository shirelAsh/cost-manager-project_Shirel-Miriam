const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();

// Import Mongoose models
const User = require('./models/users');
const Cost = require('./models/costs'); // Access to Costs for aggregation
const Log = require('./models/logs');

// Initialize Express
const app = express();
const PORT = process.env.PORT || process.env.PORT_USERS || 3001;
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

// Middleware to parse JSON
app.use(express.json());

/* Centralized Logging Middleware:
   Logs requests to console and MongoDB.
*/
app.use(async (req, res, next) => {
    const msg = `[Users Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try { await new Log({ level: 'info', message: msg }).save(); } catch (e) {}
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Users DB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- Endpoints ---

// POST /api/add - Create new user
app.post('/api/add', async (req, res) => {
    try {
        // Parse user details from body
        const { id, first_name, last_name, birthday } = req.body;

        if (!id || !first_name || !last_name || !birthday) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (isNaN(id)) {
            return res.status(400).json({ error: "ID must be a number" });
        }

        // Create new User document
        const newUser = new User({
            id,
            first_name,
            last_name,
            birthday: new Date(birthday)
        });

        // Save to database
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

/* GET /api/users/:id
   Retrieves user details and calculates the total costs.
   Note: This service aggregates data from the 'costs' collection to enrich the user profile.
*/
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Find the user in the database
        const user = await User.findOne({ id: userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Aggregation: Fetch all costs associated with this user
        const costs = await Cost.find({ userid: userId });

        // Calculate the total sum of costs
        let totalCost = 0;
        costs.forEach(c => totalCost += c.sum);

        // Return the combined result
        res.json({
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.id,
            total: totalCost
        });
    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

// GET /api/users - List all users
app.get('/api/users', async (req, res) => {
    // Retrieve all users from DB
    const users = await User.find({});
    res.json(users);
});

app.get('/', (req, res) => {
    res.send('Users Service is UP');
});

// Start the server
app.listen(PORT, () => console.log(`Users Service running on port ${PORT}`));