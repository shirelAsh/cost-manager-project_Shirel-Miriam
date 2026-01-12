const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for a single report item (day, description, and sum)
const reportItemSchema = new Schema({
    day: Number,
    description: String,
    sum: Number
}, { _id: false }); // Disable _id for sub-documents to keep the document clean

// Main schema for storing monthly reports
// This acts as a cache for the 'Computed Pattern' to avoid repeated calculations
const reportSchema = new Schema({
    userid: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    costs: {
        // Costs are grouped by category
        food: [reportItemSchema],
        health: [reportItemSchema],
        housing: [reportItemSchema],
        sports: [reportItemSchema],
        education: [reportItemSchema]
    }
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;