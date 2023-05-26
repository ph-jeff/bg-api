const express = require('express');
const router = express.Router();
const Withdraw = require('../models/withdraw');
const { User } = require('../models/user')

router.post('/', async (req, res) => {
    const { amount, name, userId, details, phoneNumber, email, facebookLink } = req.body;

    const user = await User.findOne({ _id: userId });

    const newWithdraw = new Withdraw({
        amount,
        name,
        userId,
        details,
        dateRequested: new Date(),
        contactInfo: { phoneNumber, email },
        facebookLink
    });

    newWithdraw.save()
        .then((withdraw) => {
            user.points -= amount;
            user.save().then((user) => {
                res.json(withdraw);
            })
        })
        .catch(err => res.status(400).json({ error: err.message }));
});

router.put('/:id', (req, res) => {
    const { approved, transactionComplete } = req.body;
    const { id } = req.params;

    const update = {};

    if (approved !== undefined) {
        update.approved = approved;
        if (approved) {
            update.approvedDate = new Date();
        }
    }

    if (transactionComplete !== undefined) {
        update.transactionComplete = transactionComplete;
        if (transactionComplete) {
            update.transactionCompletionDate = new Date();
        }
    }

    Withdraw.findByIdAndUpdate(id, update, { new: true })
        .then(withdraw => {
            if (!withdraw) {
                return res.status(404).json({ error: 'Withdraw not found' });
            }
            res.json(withdraw);
        })
        .catch(err => res.status(400).json({ error: err.message }));
});

router.delete('/withdraw/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find the Withdraw document by ID and delete it
        const deletedWithdraw = await Withdraw.findByIdAndDelete(id);

        if (!deletedWithdraw) {
            // If the Withdraw document doesn't exist, return an error message
            return res.status(404).json({ error: 'Withdraw not found' });
        }

        // If the Withdraw document was successfully deleted, return a success message
        return res.json({ message: 'Withdraw deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

// GET all withdraw requests
router.get('/withdraw-requests', async (req, res) => {
    try {
        const withdrawRequests = await Withdraw.find();
        res.json(withdrawRequests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});




module.exports = router;
