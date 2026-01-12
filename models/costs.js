const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categories = ['food', 'health', 'housing', 'sports', 'education'];

const costSchema = new Schema({
    description: { type: String, required: true },
    // Enum ensures only specific categories are allowed
    category: { type: String, required: true, enum: categories },
    userid: { type: Number, required: true },
    sum: { type: Number, required: true },
    // Defaults to current date if not provided
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cost', costSchema);