const express = require('express');
const SalesReport = require('../models/salesReport');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const sales = await SalesReport.find();
    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
