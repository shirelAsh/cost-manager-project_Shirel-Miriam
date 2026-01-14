const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();

// Import models
const User = require('./models/users');
const Cost = require('./models/costs');
const Log = require('./models/logs');

const app = express();
const PORT = process.env.PORT || process.env.PORT_USERS || 3001;
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

app.use(express.json());

// Request logging middleware
app.use(async (req, res, next) => {
    const msg = `[Users Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try { await new Log({ level: 'info', message: msg }).save(); } catch (e) {}
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ Users DB Connected"));

// --- Endpoints ---

// POST /api/add - Create new user
app.post('/api/add', async (req, res) => {
    try {
        const { id, first_name, last_name, birthday } = req.body;
        const newUser = new User({ id, first_name, last_name, birthday: new Date(birthday) });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ id: 1, message: error.message });
    }
});

// GET /api/users/:id - Get user details with total cost calculation
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const user = await User.findOne({ id: userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Calculate total costs for this user
        const costs = await Cost.find({ userid: userId });
        let totalCost = 0;
        costs.forEach(c => totalCost += c.sum);

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
    const users = await User.find({});
    res.json(users);
});

app.listen(PORT, () => console.log(`👤 Users Service running on port ${PORT}`));