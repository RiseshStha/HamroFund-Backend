const {model} = require('mongoose');

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: Number,
        uinque: true,
    },
    email: {
        type: String,
        default :'Nepal'
    },
    password: {
        type: String,
        required: true,
    },
    otpReset : {
        type : Number,
        default : null,
    },
    otpResetExprires : {
        type : Date,
        default : null,
    },
    profileImage: {
        type: String,
        default: null
    },
});


const User = mongoose.model('user', userSchema);

module.exports = User;