const mongoose = require("mongoose");

const patternSchema = new mongoose.Schema({
    pattern: [[Number]],
    patternName: { type: String, required: true},
});

const Pattern = mongoose.model("model", patternSchema);
module.exports = {Pattern, patternSchema};