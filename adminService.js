const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
require('dotenv').config();
const Log = require('./models/logs');

// Initialize the Express application
const app = express();

// Define the port, checking environment variables first
const PORT = process.env.PORT || process.env.PORT_ADMIN || 3004;

// Initialize the logger configuration
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

/* Database Connection:
  Even though the Admin Service returns hardcoded data for the team details,
  we must connect to MongoDB to facilitate logging.
  Every request needs to be saved to the 'logs' collection in the database.
*/
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Admin DB Connected"))
    .catch(err => console.error("❌ Admin DB Connection Error:", err));

/* Centralized Logging Middleware:
   This middleware intercepts every incoming HTTP request across the microservice.
   It logs details to the console and asynchronously saves them to MongoDB.
*/
app.use(async (req, res, next) => {
    // Construct the log message
    const msg = `[Admin Service] ${req.method} ${req.originalUrl}`;

    // Log to the console immediately
    logger.info(msg);

    // Try to save the log to MongoDB asynchronously
    try {
        await new Log({ level: 'info', message: msg }).save();
    } catch (e) {
        // If DB logging fails, just log the error to console and continue
        console.error("Failed to save log to DB:", e.message);
    }

    // Proceed to the next middleware or route handler
    next();
});

// GET /api/about - Endpoint to retrieve team member details
app.get('/api/about', (req, res) => {
    /* Architectural Decision - Static Data:
       According to the project requirements ("The JSON document shouldn't include any additional data"),
       the team member details are intentionally hardcoded here.
       This ensures the response contains only the requested first_name and last_name fields.
    */
    const team = [
        { first_name: "Shirel", last_name: "Ashtamker" },
        { first_name: "Miriam", last_name: "Ben David" }
    ];

    // Return the team array as a JSON response
    res.json(team);
});

app.get('/', (req, res) => {
    res.send('Admin Service is UP');
});

// Start the server
app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));