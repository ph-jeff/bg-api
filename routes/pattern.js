const express = require('express');
const {Pattern, patternSchema} = require('../models/pattern')
const router = express.Router();


router.get('/', async (req, res) => {
    try {
        const patterns = await Pattern.find({});
        res.json(patterns);
    } catch (err) {
        res.status(400).json({ message: 'Error retrieving patterns' });
        console.log(err)
    }
});

router.post('/', async (req, res) => {
    console.log(req.body);
    try {
        const { patternName, pattern, _id } = req.body;


        let newPattern;
        if (_id) {
            newPattern = await Pattern.findOneAndUpdate({ _id }, { patternName, pattern }, { new: true });
        } else {
            newPattern = new Pattern({ patternName, pattern });
        }
        await newPattern.save();
        res.json(newPattern);
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: 'Error saving/updating pattern' });
    }
});



router.delete("/:id", async (req, res) => {
    try {
        const deletedPattern = await Pattern.findByIdAndDelete(req.params.id);
        if (!deletedPattern) return res.status(404).send("Pattern not found");
        res.send(deletedPattern);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
