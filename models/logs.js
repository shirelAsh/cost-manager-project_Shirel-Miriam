const mongoose = require('mongoose');

/*
  Log Model Definition:
  This schema represents a single log entry in the centralized logging system.
  It captures the severity level, the descriptive message, and the precise timestamp
  of when the event occurred, enabling system-wide auditing and debugging.
*/

const logSchema = new mongoose.Schema({
    // Severity level of the log (e.g., 'info', 'warning', 'error')
    // This field is crucial for filtering logs based on importance/urgency.
    level: {
        type: String,
        required: true
    },

    // The actual content of the log message
    // Usually contains the HTTP method and the URL path accessed.
    message: {
        type: String,
        required: true
    },

    // Timestamp of when the log entry was created
    // Defaults to the current time to ensure accurate chronological ordering of events.
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Export the model to be used by the Logs Service and Logging Middleware
module.exports = mongoose.model('Log', logSchema);