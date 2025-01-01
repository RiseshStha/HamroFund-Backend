const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./database/database");
const cors = require("cors");
const fileUpload =  require('express-fileupload');
require('./models/userModels');
require('./models/campaignModels');

console.log('Registered models:', mongoose.modelNames());

const app = express();

//json config
app.use(express.json());

app.use(fileUpload())

app.use(express.static('./public'))

const corsOptions = {
    origin: true,
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));

dotenv.config();//env file configuring

//connecting database
connectDB();

const PORT = process.env.PORT; //Defining port
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// Routes
app.use('/api/user', require('./routes/userRoute'));
app.use('/api/campaign', require('./routes/campaignRoute'));
app.use('/api/payment', require('./routes/paymentRoute'));


module.exports = app;