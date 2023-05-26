const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSettingsSchema = new mongoose.Schema({
    
});


const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

module.exports = AdminSettings;