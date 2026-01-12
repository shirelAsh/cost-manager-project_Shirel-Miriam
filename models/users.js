const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema definition for the User model
const userSchema = new Schema({
    // 'unique' ensures no two users can have the same ID
    id: { type: Number, required: true, unique: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    birthday: { type: Date, required: true }
});

module.exports = mongoose.model('User', userSchema);