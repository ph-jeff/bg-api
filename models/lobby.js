const mongoose = require("mongoose");

const { bingoCardSchema, createBingoCard } = require("./bingo_card");
const {Pattern, patternSchema} = require('./pattern');

const lobbySchema = new mongoose.Schema({
    name: { type: String, required: true },
    members: {
        type: [{
            _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            ready: { type: Boolean, default: false },
            bingoCards: [{ type: bingoCardSchema }]
        }], maxlength: 5
    },
    createdAt: { type: Date, default: Date.now },
    gameNumbers: [{ type: Number, required: true }],
    available: { type: Boolean, default: true },
    gametype: { type: String, default: "Auto" },
    winners: [
        {
            pattern: { type: patternSchema },
            card: { type: [[Number]] },
            winnerID: { type: mongoose.Schema.Types.ObjectId },
            lobbyID: { type: mongoose.Schema.Types.ObjectId },
            confirmed: { type: Boolean, default: false },
        },
    ],
    timer_date_time: {
        type: Date,
        default: null,
    },
});


const Lobby = mongoose.model('Lobby', lobbySchema);

module.exports = Lobby;