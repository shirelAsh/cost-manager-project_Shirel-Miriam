const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino'); // לוגים
require('dotenv').config();

// ייבוא מודלים
const User = require('./models/users');
const Cost = require('./models/costs'); // נדרש לחישוב סך הוצאות למשתמש
const Log = require('./models/logs');   // נדרש לשמירת הלוג

const app = express();
const PORT = 3001; // פורט ייחודי לשירות זה

const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });
app.use(express.json());

// Middleware לתיעוד (חובה בכל שירות)
app.use(async (req, res, next) => {
    const msg = `[Users Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try { await new Log({ level: 'info', message: msg }).save(); } catch (e) {}
    next();
});

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ Users DB Connected"));

// --- Endpoints ---

// הוספת משתמש
app.post('/api/addusers', async (req, res) => {
    try {
        const { id, first_name, last_name, birthday } = req.body;
        const newUser = new User({ id, first_name, last_name, birthday: new Date(birthday) });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// קבלת פרטי משתמש (כולל סך הוצאות)
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await User.findOne({ id: userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        // גישה לטבלת ההוצאות (מאותו דאטה-בייס)
        const costs = await Cost.find({ userid: userId });
        let totalCost = 0;
        costs.forEach(c => totalCost += c.sum);

        res.json({ first_name: user.first_name, last_name: user.last_name, id: user.id, total_costs: totalCost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// קבלת רשימת כל המשתמשים
app.get('/api/users', async (req, res) => {
    const users = await User.find({});
    res.json(users);
});

app.listen(PORT, () => console.log(`👤 Users Service running on port ${PORT}`));
