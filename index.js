require('dotenv').config();
const Report = require('./models/reports');
const express = require('express');
const mongoose = require('mongoose');
// ייבוא המודל של ההוצאות שיצרת קודם
const Cost = require('./models/costs');

const app = express();
app.use(express.json()); // מאפשר לשרת לקרוא JSON

// חיבור למסד הנתונים
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Database Connected Successfully!"))
    .catch(err => console.error("❌ Connection Error:", err));

// ---------------------------------------------------------
// נקודת קצה 1: הוספת הוצאה חדשה
// POST /api/add
// ---------------------------------------------------------
app.post('/api/add', async (req, res) => {
    try {
        // שליפת הנתונים מהבקשה
        const { description, category, userid, sum, created_at } = req.body;

        // יצירת הוצאה חדשה לפי המודל
        const newCost = new Cost({
            description,
            category,
            userid,
            sum,
            // אם נשלח תאריך נשתמש בו, אחרת ברירת המחדל (עכשיו) תיכנס לפעולה
            created_at: created_at ? new Date(created_at) : undefined
        });

        // שמירה במסד הנתונים
        const savedCost = await newCost.save();

        // החזרת תשובה ללקוח (הפריט שנוסף)
        res.status(201).json(savedCost);

    } catch (error) {
        // טיפול בשגיאות (למשל: חסר שדה חובה או קטגוריה לא חוקית)
        console.error("Error adding cost:", error);
        res.status(500).json({ error: "Failed to add cost", details: error.message });
    }
});

// הפעלת השרת
const PORT = 3000;
// ---------------------------------------------------------
// נקודת קצה 2: הפקת דוח חודשי (Computed Pattern)
// GET /api/report?id=123&year=2024&month=1
// ---------------------------------------------------------
app.get('/api/report', async (req, res) => {
    try {
        // 1. שליפת הפרמטרים מהבקשה
        const { id, year, month } = req.query;

        // בדיקה שכל הפרמטרים נשלחו
        if (!id || !year || !month) {
            return res.status(400).json({ error: "Missing parameters: id, year, and month are required" });
        }

        const userId = parseInt(id);
        const reportYear = parseInt(year);
        const reportMonth = parseInt(month);

        // 2. בדיקה האם הדוח כבר קיים (Computed Pattern)
        // אם הדוח קיים בטבלת reports - נחזיר אותו ונחסוך חישוב
        const existingReport = await Report.findOne({ userid: userId, year: reportYear, month: reportMonth });
        if (existingReport) {
            console.log("📄 Returning existing report from cache");
            return res.json(existingReport.costs); // מחזירים רק את חלק ה-costs
        }

        // 3. אם הדוח לא קיים - צריך לחשב אותו
        console.log("⚙️ Computing new report...");

        // חישוב טווח התאריכים של החודש המבוקש
        const startDate = new Date(reportYear, reportMonth - 1, 1); // 1 לחודש הנוכחי
        const endDate = new Date(reportYear, reportMonth, 1); // 1 לחודש הבא

        // שליפת כל ההוצאות של המשתמש בחודש הזה
        const costs = await Cost.find({
            userid: userId,
            created_at: { $gte: startDate, $lt: endDate }
        });

        // 4. ארגון ההוצאות לפי קטגוריות
        const reportData = {
            food: [],
            health: [],
            housing: [],
            sports: [],
            education: []
        };

        // סידור כל הוצאה במקום הנכון
        costs.forEach(cost => {
            const day = cost.created_at.getDate();
            const item = { day: day, description: cost.description, sum: cost.sum };

            // בדיקה שהקטגוריה חוקית לפני שמכניסים
            if (reportData[cost.category]) {
                reportData[cost.category].push(item);
            }
        });

        // 5. שמירת הדוח המוכן במסד הנתונים (לשימוש עתידי)
        const newReport = new Report({
            userid: userId,
            year: reportYear,
            month: reportMonth,
            costs: reportData
        });
        await newReport.save();

        // 6. החזרת התשובה ללקוח
        res.json(reportData);

    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Failed to generate report", details: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});