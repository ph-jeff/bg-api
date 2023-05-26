const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");

const userSchema = new mongoose.Schema({
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	username: { type: String, required: true },
	phoneNumber: { type: String, required: true },
	currentLobby: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby' },
	referralCode: { type: String},
	points: {type: Number, default: 0},
	cards: {type: Number, default: 10},
	socketID: {type: String}
});

userSchema.methods.generateAuthToken = function () {
	const token = jwt.sign({ _id: this._id }, process.env.JWTPRIVATEKEY, {
		expiresIn: "7d",
	});
	return token;
};

const User = mongoose.model("user", userSchema);

const validate = (data) => {
	console.log(data);
    const schema = Joi.object({
        firstName: Joi.string().required().label("First Name"),
        lastName: Joi.string().required().label("Last Name"),
        email: Joi.string().email().required().label("Email"),
        username: Joi.string().required().label("Username"),
        phoneNumber: Joi.string().required().label("Phone Number"),
        referralCode: Joi.string().required().label("Referral Code"),
        password: passwordComplexity().required().label("Password"),
    });
    return schema.validate(data);
};
module.exports = { User, validate };
