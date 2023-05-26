const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  details: {
    type: String,
    required: true
  },
  dateRequested: {
    type: Date,
    default: Date.now
  },
  contactInfo: {
    phoneNumber: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  facebookLink: {
    type: String
  },
  approved: {
    type: Boolean,
    default: false
  },
  transactionComplete: {
    type: Boolean,
    default: false
  },
  approvedDate: {
    type: Date
  },
  transactionCompletionDate: {
    type: Date
  }
});

const Withdraw = mongoose.model('Withdraw', withdrawSchema);

module.exports = Withdraw;
