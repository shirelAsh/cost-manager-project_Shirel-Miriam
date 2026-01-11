const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const Log = require('./models/logs');

const app = express();
const PORT = 3003;

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ Logs DB Connected"));

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find({});
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

app.listen(PORT, () => console.log(`📜 Logs Service running on port ${PORT}`));
