const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/*
  Cost Model Definition:
  This schema defines the structure for storing cost items in the MongoDB database.
  It enforces validation rules to ensure data integrity, such as allowed categories
  and mandatory fields.
*/

// Define allowed categories for validation
const categories = ['food', 'health', 'housing', 'sports', 'education'];

const costSchema = new Schema({
    // A short description of the expense (e.g., "Supermarket")
    description: {
        type: String,
        required: true
    },

    // The category must be one of the predefined allowed values
    category: {
        type: String,
        required: true,
        enum: categories
    },

    // The unique ID of the user who made the purchase
    userid: {
        type: Number,
        required: true
    },

    // The amount of the expense (must be a number)
    sum: {
        type: Number,
        required: true
    },

    // Creation date: Defaults to the current timestamp if not provided
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Export the model to be used in the Costs Service
module.exports = mongoose.model('Cost', costSchema);