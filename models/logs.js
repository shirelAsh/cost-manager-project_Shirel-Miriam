const mongoose = require('mongoose');

// Schema for system logs to track operations
const logSchema = new mongoose.Schema({
    level: {
        type: String,
        required: true // e.g., 'info', 'error'
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now // Automatically records creation time
    }
});

module.exports = mongoose.model('Log', logSchema);