const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Lobby = require('../models/lobby');
const { User, validate } = require("../models/user");
const { bingoCardSchema, createBingoCard } = require("../models/bingo_card");
const SECRET = process.env.JWTPRIVATEKEY;
const { create } = require("../lobby_crud");
const Admin = require('../models/admin');

router.post('/host', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        console.log(token);
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        console.log(decoded);
        // Create a new lobby
        const admin = await Admin.findOne({ _id: decoded.id });
        const newLobby = new Lobby({
            name: req.body.name,
            gametype: "Manual",
        });
        admin.hostedLobby = newLobby._id;
        newLobby.save();
        admin.save();
        console.log(newLobby);
        res.status(201).json({ lobby: newLobby, admin: admin });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});


router.post('/create', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        // Create a new lobby
        const user = await User.findOne({ _id: decoded._id });
        if (user.currentLobby) {
            res.status(400).json({ message: 'User is already in a lobby' });
            return;
        }
        const newLobby = new Lobby({ name: req.body.name });
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
        res.status(201).json({ lobby: newLobby });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.get('/current', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        const user = await User.findOne({ _id: decoded._id });
        const currentLobby = await Lobby.findOne({ _id: user.currentLobby });
        res.status(200).json({ lobby: currentLobby, userID: user._id });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/:id/leave', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        const user = await User.findOne({ _id: decoded._id });
        user.currentLobby = null;
        await user.save();
        const lobby = await Lobby.findOne({ _id: req.params.id });
        lobby.members = lobby.members.filter(id => !id.equals(user._id));
        console.log(lobby.members);
        console.log(user._id);
        await lobby.save();
        if (lobby.members.length === 0) {
            console.log(await lobby.deleteOne());
            res.status(200).json({ message: 'Left and deleted lobby successfully' });
        } else {
            await lobby.save();
            res.status(200).json({ message: 'Left lobby successfully' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const lobbies = await Lobby.find();
        res.status(200).send({ data: lobbies });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const lobby = await Lobby.findById(req.params.id);
        if (!lobby) return res.status(404).send({ message: "Lobby not found" });
        res.status(200).send({ lobby: lobby });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const lobby = await Lobby.findOne({ _id: req.params.id });
        if (!lobby) {
            return res.status(400).send({ message: 'Lobby not found' });
        }
        await lobby.deleteOne();
        res.status(200).send({ message: 'Lobby deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});



router.patch('/:id/join', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, SECRET);
        const user = await User.findOne({ _id: decoded._id });
        const lobby = await Lobby.findOne({ _id: req.params.id });
        if (!lobby) {
            res.status(404).json({ message: 'Lobby not found' });
            return;
        }
        if (user.currentLobby) {
            res.status(400).json({ message: 'User is already in a lobby' });
            return;
        }
        user.currentLobby = lobby._id;
        await user.save();
        lobby.members.push({
            _id: user._id,
            ready: false,
            bingoCard: {
                numbers: Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5),
                isCompleted: false
            }
        });
        await lobby.save();
        res.status(200).json({ message: 'Successfully joined the lobby', lobby });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

const MAX_TURNS = 100;




module.exports = router;
