const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateRedeemed: {
    type: Date
  },
  redeemCode: {
    type: String,
    unique: true
  },
  points: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  agentUserID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    required: true,
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

const Ticket = mongoose.model("Ticket", TicketSchema);

module.exports = Ticket;
