const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: String, required: true }
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
