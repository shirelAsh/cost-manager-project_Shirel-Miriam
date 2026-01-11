const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // טעינת משתני סביבה מהקובץ .env

// ייבוא המודלים (טבלאות)
const Cost = require('./models/costs');
const Report = require('./models/reports');
const User = require('./models/users');
const Log = require('./models/logs');

// הגדרת ספריית Pino ללוגים
const pino = require('pino');
const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty'
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - מאפשר לשרת לקרוא JSON
app.use(express.json());

// Middleware: תיעוד אוטומטי של כל בקשה (לפי דרישות הפרויקט)
app.use(async (req, res, next) => {
    const logMessage = `New Request: ${req.method} ${req.originalUrl}`;

    // 1. הדפסה לקונסול
    logger.info(logMessage);

    // 2. שמירה לדאטה-בייס
    try {
        const logEntry = new Log({
            level: 'info',
            message: logMessage
        });
        await logEntry.save();
    } catch (err) {
        console.error("Error saving log:", err);
    }

    next(); // ממשיך לקוד הבא
});

// חיבור למסד הנתונים MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Database Connected Successfully!"))
    .catch(err => console.error("❌ Connection Error:", err));

// ---------------------------------------------------------
// 1. הוספת הוצאה חדשה (Add Cost)
// POST /api/add
// ---------------------------------------------------------
app.post('/api/add', async (req, res) => {
    try {
        const { description, category, userid, sum, created_at } = req.body;

        // בדיקת תקינות
        if (!description || !category || !userid || !sum) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newCost = new Cost({
            description,
            category,
            userid,
            sum,
            created_at: created_at ? new Date(created_at) : undefined
        });

        const savedCost = await newCost.save();
        res.status(201).json(savedCost);

    } catch (error) {
        res.status(500).json({ error: "Failed to add cost", details: error.message });
    }
});

// ---------------------------------------------------------
// 2. הפקת דוח חודשי (Monthly Report) - Computed Pattern
// GET /api/report
// ---------------------------------------------------------
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        if (!id || !year || !month) {
            return res.status(400).json({ error: "Missing parameters: id, year, month" });
        }

        const userId = parseInt(id);
        const reportYear = parseInt(year);
        const reportMonth = parseInt(month);

        // בדיקה אם הדוח כבר קיים (Cache)
        const existingReport = await Report.findOne({ userid: userId, year: reportYear, month: reportMonth });
        if (existingReport) {
            return res.json(existingReport.costs);
        }

        // חישוב הדוח אם לא קיים
        const startDate = new Date(reportYear, reportMonth - 1, 1);
        const endDate = new Date(reportYear, reportMonth, 1);

        const costs = await Cost.find({
            userid: userId,
            created_at: { $gte: startDate, $lt: endDate }
        });

        const reportData = {
            food: [], health: [], housing: [], sports: [], education: []
        };

        costs.forEach(cost => {
            const day = cost.created_at.getDate();
            const item = { day: day, description: cost.description, sum: cost.sum };
            if (reportData[cost.category]) {
                reportData[cost.category].push(item);
            }
        });

        // שמירת הדוח המחושב
        const newReport = new Report({
            userid: userId,
            year: reportYear,
            month: reportMonth,
            costs: reportData
        });
        await newReport.save();

        res.json(reportData);

    } catch (error) {
        res.status(500).json({ error: "Failed to generate report", details: error.message });
    }
});

// ---------------------------------------------------------
// 3. הוספת משתמש (Add User)
// POST /api/addusers
// ---------------------------------------------------------
app.post('/api/addusers', async (req, res) => {
    try {
        const { id, first_name, last_name, birthday } = req.body;

        if (!id || !first_name || !last_name || !birthday) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newUser = new User({
            id,
            first_name,
            last_name,
            birthday: new Date(birthday)
        });

        const savedUser = await newUser.save();
        res.status(201).json(savedUser);

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: "User ID already exists" });
        }
        res.status(500).json({ error: "Failed to add user", details: error.message });
    }
});

// ---------------------------------------------------------
// 4. פרטי משתמש ספציפי (User Details)
// GET /api/users/:id
// ---------------------------------------------------------
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // חישוב סך ההוצאות
        const costs = await Cost.find({ userid: userId });
        let totalCost = 0;
        costs.forEach(c => totalCost += c.sum);

        res.json({
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.id,
            birthday: user.birthday,
            total_costs: totalCost
        });

    } catch (error) {
        res.status(500).json({ error: "Failed to get user details", details: error.message });
    }
});

// ---------------------------------------------------------
// 5. קבלת כל המשתמשים (Users List) - נדרש במסמך
// GET /api/users
// ---------------------------------------------------------
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// ---------------------------------------------------------
// 6. אודות הצוות (About) - נדרש במסמך
// GET /api/about
// ---------------------------------------------------------
app.get('/api/about', (req, res) => {
    const team = [
        { first_name: "Shirel", last_name: "Ashtamker" },
        { first_name: "Miriam", last_name: "Lastname" } // עדכני את השם של מרים
    ];
    res.json(team);
});

// ---------------------------------------------------------
// 7. קבלת לוגים (Logs) - נדרש במסמך
// GET /api/logs
// ---------------------------------------------------------
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find({});
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// הפעלת השרת
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});