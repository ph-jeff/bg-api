const crypto = require("crypto");
const express = require("express");
const Ticket = require("../models/ticket");
const {User} = require("../models/user");
const Agent = require("../models/agent");
const SalesReport = require("../models/salesReport");
const router = express.Router();
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWTPRIVATEKEY;

const generateRedeemCode = () => {
    return crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase();
};

// Create a ticket
router.post("/", async (req, res) => {
    try {
        let ticket;
        if (req.body._id) {
            ticket = await Ticket.findById(req.body._id);
            if (!ticket) return res.status(404).json({ message: "Ticket not found" });
            ticket.set(req.body);
        } else {
            ticket = new Ticket({
                redeemCode: generateRedeemCode(),
                points: req.body.points,
                agentUserID: req.body.agentUserID,
                name: req.body.name
            });
        }
        await ticket.save();
        res.status(200).json(ticket);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});

// Get all tickets
router.get("/", async (req, res) => {
    try {
        let agentUserID = req.query.agentUserID;
        console.log(agentUserID)
        let tickets;
        if(agentUserID){
            tickets = await Ticket.find({ agentUserID });
        }else{
            tickets = await Ticket.find();
        }
        res.status(200).json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific ticket
router.get("/:id", getTicket, (req, res) => {
    res.status(200).json(res.ticket);
});

// Redeem a ticket
router.patch("/redeem", async (req, res) => {
    try {
        const token = req.body.token;
        const decoded = jwt.verify(token, SECRET);
        const user = await User.findOne({ _id: decoded._id });

        const ticket = await Ticket.findOne({ redeemCode: req.body.redeemCode });
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });
        if(ticket.dateRedeemed) return res.status(404).json({message : "Ticket already redeemed"})
        console.log(ticket)
        const agent = await Agent.findOne({_id: ticket.agentUserID});
        console.log(agent);
        if(agent.points - ticket.points < 0){
            return res.status(404).json({message : "Insufficient balance"})
        }
        agent.points -= ticket.points;

        agent.points += ticket.points / 10

        ticket.dateRedeemed = Date.now();
        ticket.userID = user._id;
        user.points += ticket.points;
        user.save();
        ticket.save();
        agent.save();

        const saleReport = new SalesReport({
            date: Date.now(),
            redeemCode: ticket.redeemCode,
            points: ticket.points,
            commission: ticket.points / 10,
            contractor: agent._id,
            purchaser: user._id,
        });
        saleReport.save();
        
        res.status(200).json({ message: "Ticket redeemed successfully" });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });
        await ticket.remove();
        res.status(200).json({ message: "Ticket deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


async function getTicket(req, res, next) {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });
        res.ticket = ticket;
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

module.exports = router;
