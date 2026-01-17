const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/*
  User Model Definition:
  This schema defines the structure for user documents in the system.
  It serves as the contract for the Users Service, ensuring that every user
  created has the necessary personal details and a unique identifier.
*/

const userSchema = new Schema({
    // Custom User ID:
    // This is a developer-assigned integer ID (e.g., 123123), distinct from MongoDB's internal '_id'.
    // The 'unique' index ensures that we cannot have duplicate users with the same ID.
    id: {
        type: Number,
        required: true,
        unique: true
    },

    // User's first name
    first_name: {
        type: String,
        required: true
    },

    // User's last name
    last_name: {
        type: String,
        required: true
    },

    // User's date of birth
    // Stored as a Date object to facilitate age calculations if needed in the future.
    birthday: {
        type: Date,
        required: true
    }
});

// Export the model for use in the Users Service
module.exports = mongoose.model('User', userSchema);