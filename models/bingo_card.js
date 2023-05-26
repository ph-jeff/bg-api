const mongoose = require("mongoose");

const bingoCardSchema = new mongoose.Schema({
    numbers: [[Number]],
    isCompleted: { type: Boolean, default: false },
});

const createBingoCard = () => {
    const bingoCard = new BingoCard();
    const usedNumbers = new Set();
    for (let i = 0; i < 5; i++) {
        const row = Array.from({ length: 5 }, () => 0);
        let min, max;
        min = (i * 15) + 1;
        max = min + 14;
        for (let j = 0; j < 5; j++) {
            if (i === 2 && j === 2) {
                row[j] = 0;
            } else {
                let number = Math.floor(Math.random() * (max - min + 1) + min);
                while (usedNumbers.has(number)) {
                    number = Math.floor(Math.random() * (max - min + 1) + min);
                }
                row[j] = number;
                usedNumbers.add(number);
            }
        }
        bingoCard.numbers.push(row);
    }
    return bingoCard;
};


const BingoCard = mongoose.model("card", bingoCardSchema);

module.exports = { bingoCardSchema, createBingoCard };
