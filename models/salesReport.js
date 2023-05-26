const mongoose = require('mongoose');

const salesReportSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  redeemCode: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    required: true
  },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  purchaser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sale_type: {
    type: String,
    default: "Ticket"
  }
});

const SalesReport = mongoose.model('SalesReport', salesReportSchema);

module.exports = SalesReport;
