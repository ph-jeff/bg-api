const mongoose = require("mongoose");

const lobbyHistorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    members: { type: [{
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }], maxlength: 5},
    createdAt: { type: Date, default: Date.now },
    gameEnded: { type: Date, default: Date.now },
    gameNumbers: [{ type: Number, required: true }],
    gametype: {type: String, default: "Auto"},
    ticketsSold: {type: Number, default: 0}
});


const LobbyHistory = mongoose.model('LobbyHistory', lobbyHistorySchema);

module.exports = Lobby;