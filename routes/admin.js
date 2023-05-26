const express = require('express');
const bcrypt = require('bcrypt');
const Admin = require('../models/admin');
const Lobby = require('../models/lobby');
const router = express.Router();
const jwt = require('jsonwebtoken');


router.post('/create', async (req, res) => {
    try {
        const token = req.body.adminToken;
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        const creatorAdmin = await Admin.findById(decoded.id);
        if(!creatorAdmin){
            res.status(403).json({ message: 'Youre not an admin' });
            return;
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const admin = new Admin({
            username: req.body.username,
            password: hashedPassword
        });
        await admin.save();
        res.status(201).json({ message: 'Admin created successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


router.post('/login', async (req, res) => {
    console.log(req)
    try {
        const admin = await Admin.findOne({ username: req.body.username });
        if (!admin) return res.status(404).send({ error: 'Invalid Username' });

        const validPassword = await bcrypt.compare(
			req.body.password,
			admin.password
		);
       
        if (!validPassword) return res.status(401).send({ error: 'Wrong password.' });

        const token = jwt.sign({ id: admin._id }, process.env.JWTPRIVATEKEY, { expiresIn: 86400 });
        res.status(200).send({ auth: true, token });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ error: 'Error on the server.' });
    }
});

router.get('/profile', async (req, res) => {
    try {
        console.log("Accessing authorization");
        console.log(req.headers)

        const token = req.headers['x-access-token'];
        if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        const admin = await Admin.findById(decoded.id);
        if (!admin) return res.status(404).send({ error: 'No user found.' });

        res.status(200).json({
            profile: admin,
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.get("/host/:id", async (req, res) => {
    try {
        const token = req.headers['x-access-token'];
        if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        const admin = await Admin.findById(decoded.id);

        if (!admin) return res.status(404).send({ error: 'No user found.' });
        const lobby = await Lobby.findById(req.params.id);
        if (!lobby) return res.status(404).send({ message: "Lobby not found" });
        res.status(200).send({ lobby: lobby });

        admin.hostedLobby = lobby._id;
        admin.save();
        lobby.save();
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});




module.exports = router;