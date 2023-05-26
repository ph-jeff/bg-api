const express = require('express');
const router = express.Router();
const Settings = require('../models/settings');

// Get all settings in a single object format
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.find();
    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value;
    });
    res.json(settingsObject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update a setting or create a new one if it doesn't exist
router.put('/:key', async (req, res) => {
    try {
      const key = req.params.key;
      const value = req.body.value;
      let updatedSetting = await Settings.findOneAndUpdate(
        { key: key },
        { value: value },
        { new: true }
      );
      if (!updatedSetting) {
        // Create a new setting if it doesn't exist
        updatedSetting = await Settings.create({ key, value });
      }
      res.json(updatedSetting);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  

module.exports = router;
