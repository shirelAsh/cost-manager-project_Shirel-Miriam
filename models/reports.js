const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/*
  Report Model Definition (Computed Pattern - Cache):
  This model represents the "Cache" layer of our reporting system.
  Instead of recalculating the monthly report from raw costs every time a user requests it,
  we store (cache) the final computed result here once a month has passed.
  This significantly improves read performance for historical data.
*/

// Schema for a single report item (day, description, and sum)
// This serves as a sub-document within the main Report schema.
const reportItemSchema = new Schema({
    day: Number,
    description: String,
    sum: Number
}, {
    // Optimization: Disable _id generation for sub-documents.
    // This keeps the document size smaller and the structure cleaner,
    // as we don't need to reference individual report items by ID.
    _id: false
});

const reportSchema = new Schema({
    // The user ID to whom this report belongs
    userid: {
        type: Number,
        required: true
    },

    // The year of the report (e.g., 2026)
    year: {
        type: Number,
        required: true
    },

    // The month of the report (1-12)
    month: {
        type: Number,
        required: true
    },

    /* The core report data, pre-grouped by category.
       Using this structure allows the frontend to receive the data
       exactly as needed without further processing.
    */
    costs: {
        food: [reportItemSchema],
        health: [reportItemSchema],
        housing: [reportItemSchema],
        sports: [reportItemSchema],
        education: [reportItemSchema]
    }
});

module.exports = mongoose.model('Report', reportSchema);