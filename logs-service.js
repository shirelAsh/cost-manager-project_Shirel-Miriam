const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino'); // <--- הנה השורה שהייתה חסרה לך!
require('dotenv').config();
const Log = require('./models/logs');

const app = express();
// שימוש בפורט מה-env או ברירת מחדל 3003
const PORT = process.env.PORT_LOGS || 3003;

// הגדרת הלוגר
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

// --- חיבור למסד הנתונים ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Logs DB Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- Middleware: תיעוד בקשות ---
// חובה להוסיף את זה כדי שגם פניות לשירות הלוגים יתועדו
app.use(async (req, res, next) => {
    const msg = `[Logs Service] ${req.method} ${req.originalUrl}`;
    logger.info(msg);
    try {
        await new Log({ level: 'info', message: msg }).save();
    } catch (e) {
        console.error("Failed to save log to DB", e);
    }
    next();
});

// --- Endpoints ---

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find({});
        res.json(logs);
    } catch (error) {
        // החזרת שגיאה בפורמט התקין
        res.status(500).json({ id: 1, message: "Failed to fetch logs" });
    }
});

// Start the server
app.listen(PORT, () => console.log(`📜 Logs Service running on port ${PORT}`));