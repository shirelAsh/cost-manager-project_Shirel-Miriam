const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// מבנה של לוג (תיעוד) במערכת
const logSchema = new Schema({
    level: String,       // למשל: 'info' או 'error'
    message: String,     // מה קרה? (למשל: GET /api/users)
    timestamp: {         // מתי זה קרה?
        type: Date,
        default: Date.now
    }
});

const Log = mongoose.model('Log', logSchema);
module.exports = Log;