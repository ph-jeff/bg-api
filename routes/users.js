const router = require("express").Router();
const { User, validate } = require("../models/user");
const Agent = require('../models/agent');
const Settings = require('../models/settings');
const SalesReport = require('../models/salesReport');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWTPRIVATEKEY;



router.post("/", async (req, res) => {
    try {
        const { error } = validate(req.body);
        if (error)
            return res.status(400).send({ message: error.details[0].message });
        // check if the email or username is already taken
        const user = await User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] });
        if (user)
            return res.status(409).send({ message: "User with given email or username already exists" });

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashPassword = await bcrypt.hash(req.body.password, salt);

        await new User({ ...req.body, password: hashPassword }).save();
        res.status(201).send({ message: "User created successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

router.get("/", async (req, res) => {
    try {
        let users = await User.find().select("-password");
        console.log(req.query.referralCode);
        if (req.query.referralCode) {
            users = await User.find({ referralCode: req.query.referralCode });
        }
        res.status(200).send({ data: users });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

router.post('/profile', async (req, res) => {
    try {
        const token = req.body.headers.Authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        // Create a new lobby
        const user = await User.findOne({ _id: decoded._id });
        res.status(201).json({ profile: user });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.post('/points', async (req, res) => {
    console.log(req.headers.authorization)
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        // Create a new lobby
        const user = await User.findOne({ _id: decoded._id });
        console.log(user);
        res.status(201).json({ points: user.points, cards: user.cards, lobbyID: user.currentLobby });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        // Find the user by the decoded ID and update their profile
        const user = await User.findOneAndUpdate({ _id: decoded._id }, req.body, { new: true });
        res.status(200).json({ message: "Profile updated successfully", profile: user });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/buycard', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it
        // Find the user by the decoded ID and update their profile
        const user = await User.findOneAndUpdate({ _id: decoded._id }, req.body, { new: true });
        const cards = req.body.cardsToBuy;
        const totalCards = user.cards + cards;
        user.cards = totalCards;
        user.points -= cards * 10;
        await user.save();

        const referralCode = user.referralCode
        if (referralCode) {
            const settings = await Settings.find();
            const settingsObject = {};
            settings.forEach(setting => {
                settingsObject[setting.key] = setting.value;
            });
            const agentCommission = (cards * 10) * (parseFloat(settingsObject["agentCommissionOnCardBuy"]) / 100)
            const agent = await Agent.findOne({ referralCode: referralCode })
            agent.points += agentCommission;
            agent.save()
            const saleReport = new SalesReport({
                date: Date.now(),
                redeemCode: "N/A",
                points: cards * 10,
                commission: agentCommission,
                contractor: agent._id,
                purchaser: user._id,
                sale_type: "Card Winnings"
            });
            saleReport.save();
        }
        res.status(200).json({ message: "Bought", profile: user });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/password', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // get the JWT from the headers
        const decoded = jwt.verify(token, SECRET); // verify the JWT and decode it

        const user = await User.findOne({ _id: decoded._id });
        const isValidPassword = await bcrypt.compare(req.body.currentPassword, user.password);

        if (!isValidPassword) {
            return res.status(400).json({ message: "Invalid current password" });
        }

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashPassword = await bcrypt.hash(req.body.newPassword, salt);

        user.password = hashPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});


module.exports = router;
