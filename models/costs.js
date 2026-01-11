const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categories = ['food', 'health', 'housing', 'sports', 'education'];

const costSchema = new Schema({
    description: { type: String, required: true },
    category: { type: String, required: true, enum: categories },
    userid: { type: Number, required: true },
    sum: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cost', costSchema);