const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: true
    },
	hostedLobby: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby' , default: null},
});


const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;


// const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
// const Joi = require("joi");
// const passwordComplexity = require("joi-password-complexity");

// const userSchema = new mongoose.Schema({
// 	firstName: { type: String, required: true },
// 	lastName: { type: String, required: true },
// 	email: { type: String, required: true },
// 	password: { type: String, required: true },
// 	currentLobby: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby' },
// });

// userSchema.methods.generateAuthToken = function () {
// 	const token = jwt.sign({ _id: this._id }, process.env.JWTPRIVATEKEY, {
// 		expiresIn: "7d",
// 	});
// 	return token;
// };


// const validate = (data) => {
// 	const schema = Joi.object({
// 		username: Joi.string().email().required().label("User Name"),
// 		password: passwordComplexity().required().label("Password"),
// 	});
// 	return schema.validate(data);
// };

// module.exports = { User, validate };

