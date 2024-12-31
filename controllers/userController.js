const userModel = require('../models/userModels');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Creating user
const createUser = async (req, res) => {
    console.log(req.body);
    // Destructuring req.body
    const { fullName, email, password } = req.body;
    
    // Validating if the given details are valid or not
    if (!fullName || !email || !password) {
        return res.json({
            success: false,
            message: "Please fill all details"
        });
    }

    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({
                success: false,
                message: "User already exists!!!"
            });
        }

        // Hashing the password
        const randomSalt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, randomSalt);

        // Creating user object
        const newUser = new userModel({
            fullName,
            email,
            password: hashPassword,
        });

        // Saving user object in the database
        await newUser.save();

        return res.json({
            success: true,
            message: "User Created Successfully!!"
        });
    } catch (e) {
        console.log(e);
        return res.json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Login user
const loginUser = async (req, res) => {
    console.log(req.body);

    // Destructuring req.body
    const { email, password } = req.body;

    // Validating input fields
    if (!email || !password) {
        return res.json({
            success: false,
            message: "Please enter all fields"
        });
    }

    try {
        // Find user, if not: stop the process
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found!"
            });
        }

        // Compare the password, if not: stop the process
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log(`password match ${isValidPassword}`)
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: "Incorrect Password!"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '10h' } // Optionally set token expiration time
        );

        // Send the token, userData, message to the user
        return res.json({
            success: true,
            message: "Login Successful",
            token,
            userData: user
        });

    } catch (e) {
        console.log(e);
        return res.json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getUserDetails = async (req, res) =>{
    const userId = req.params.id;
    try{
        const user = await userModel.findOne({ _id : userId }).exec();
        
        res.status(201).json({
          success: true,
          message: "User Data Fetched!",
          userDetails: user,
      });

      } catch(e){
        console.log(e);
        res.json({
          success: false,
          message: "Server Error!",
        });
      }
}

// forgot password using PHONE number
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    console.log('email',email)

    if (!email) {
        res.status(400).json({
            'success': false,
            'message': 'Please provide phone number'
        })
    }
    try {

        // user find and validate
        const user = await userModel.findOne({ email: email })
        // console.log(phone)
        if (!user) {
            return res.status(400).json({
                'success': false,
                'message': 'User Not Found!'
            })
        }

        // generate random otp
        const otp = Math.floor(100000 + Math.random() * 900000);

        // save OTP to the User's record
        user.otpReset = otp;
        user.otpResetExprires = Date.now() + 3600000;
        await user.save();

        // sending otp to phone number
        const isSent = await sendOtp(email, otp)
        if (!isSent) {
            return res.status(500).json({
                'success': false,
                'message': 'Error Sending OTP'
            })
        }

        // success  message
        res.status(200).json({
            'success': true,
            'message': 'OTP Send Successfully!'
        })


    } catch (error) {
        console.log(error)
        res.status(500).json({
            'success': false,
            'message': 'Server Error!'
        })


    }
}

// verify otp and set password
const verifyOtpAndPassword = async (req, res) => {
    const { email, otp, password } = req.body;

    console.log(email, otp, password);

    if (!email || !otp || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide email, otp, and newPassword'
        });
    }

    try {
        // Find the user by email
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if OTP matches and is not expired
        console.log("Expired in",user.otpResetExprires,"Date now",Date.now())
        if (user.otpReset != otp || user.otpResetExprires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }
        if (user.otpReset != otp) {
            console.log('Provided OTP does not match stored OTP');
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.otpResetExprires < Date.now()) {
            console.log('OTP has expired');
            return res.status(400).json({ message: 'Expired OTP' });
        }

        // Hash the new password
        const randomSalt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, randomSalt);

        // Update user's password and clear OTP fields
        user.password = hashPassword;
        user.otpReset = undefined;
        user.otpResetExprires = undefined;
        await user.save();

        // Password updated successfully message
        return res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Error in verifying OTP and setting password:', error);
        return res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

const updateUser = async (req, res) => {
    const userId = req.params.id; // Assuming userId is passed as route parameter
    const updatedData = req.body;
    try {

        if(updatedData.password){
            const randomSalt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(password, randomSalt);
            updateUser.password = hashPassword;
        }

        const updatedUser = await userModel.findByIdAndUpdate(userId, updatedData, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error updating user profile' });
    }
};

// Update profile image
const updateProfileImage = async (req, res) => {
    const userId = req.params.id;


    if (!req.files || !req.files.profileImage) {
        return res.status(400).json({
            success: false,
            message: "Image not found"
        });
    }

    const { profileImage } = req.files;
    const imageName = `${Date.now()}-${profileImage.name}`;
    const imageUploadPath = path.join(__dirname, `../public/profiles/${imageName}`);

    try {
        await profileImage.mv(imageUploadPath);

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Delete the old profile image if it exists
        if (user.profileImage) {
            const oldImagePath = path.join(__dirname, `../public/profiles/${user.profileImage}`);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        user.profileImage = imageName;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile image updated successfully",
            profileImage: imageName,
            user: user
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error
        });
    }
};

module.exports = { 
    createUser, 
    loginUser,
    getUserDetails,
    forgotPassword,
    verifyOtpAndPassword,
    updateUser,
    updateProfileImage,
 };
