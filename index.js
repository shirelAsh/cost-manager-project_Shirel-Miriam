require('dotenv').config();
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
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});