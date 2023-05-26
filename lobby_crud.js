const jwt = require('jsonwebtoken');
const { User, validate } = require("./models/user");
const Lobby = require('./models/lobby');

async function create(lobbyName, userToken) {
    try{
        const token = userToken; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        // Create a new lobby
        const user = await User.findOne({ _id: decoded._id });
        if (user.currentLobby) {
            res.status(400).json({ message: 'User is already in a lobby' });
            return;
        }
        const newLobby = new Lobby({ name: lobbyName });
        await newLobby.save();
        user.currentLobby = newLobby._id;
        await user.save();
        const bingoCard = createBingoCard();
        newLobby.members.push({
            _id: user._id,
            ready: false,
            bingoCard: bingoCard,
        });
        await newLobby.save();
        return newLobby;
    }catch(e){
        throw(e)
    }
}


async function update(id, updateObject, callback) {
    await Lobby.findOneAndUpdate({ _id: id }, updateObject, { new: true }, (err, model) => {
        if (err) {
            console.log(err);
        } else {
            callback(model);
        }
    });
}

module.exports = {create};