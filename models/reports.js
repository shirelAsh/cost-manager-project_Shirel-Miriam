const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// מבנה של שורה בודדת בדוח (יום, תיאור וסכום)
const reportItemSchema = new Schema({
    day: Number,
    description: String,
    sum: Number
}, { _id: false }); // לא צריך ID לכל שורה קטנה

// המבנה הראשי של הדוח החודשי
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
        food: [reportItemSchema],
        health: [reportItemSchema],
        housing: [reportItemSchema],
        sports: [reportItemSchema],
        education: [reportItemSchema]
    }
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;