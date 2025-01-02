const userModel = require('../models/userModels');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { sendOTPEmail } = require('../utils/emailService');

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

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Find user by email
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email"
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Create expiration date explicitly
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 10); // Add 10 minutes
        
        console.log('Before Update:', {
            otp,
            expirationDate,
            currentUser: user
        });

        // Update user document using updateOne
        const updateResult = await userModel.updateOne(
            { _id: user._id },
            { 
                $set: {
                    otpReset: otp,
                    otpResetExprires: expirationDate
                }
            }
        );
        console.log('Update Result:', updateResult)
        await user.save();

        // Send OTP via email
        try {
            await sendOTPEmail(email, otp);
            return res.json({
                success: true,
                message: "OTP sent to your email successfully"
            });
        } catch (emailError) {
            // If email fails to send, remove the OTP from user document
            user.otpReset = null;
            user.otpResetExprires = null;
            await user.save();
            
            console.error('Email error:', emailError);
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Please try again later."
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        
        console.log('Reset Password Request:', {
            email,
            receivedOTP: otp,
            timestamp: new Date()
        });

        // Find user and explicitly specify fields we want to check
        const user = await userModel.findOne({ email }).select('otpReset otpResetExprires password');
        
        console.log('Found User Data:', {
            storedOTP: user?.otpReset,
            expirationTime: user?.otpResetExprires,
            receivedOTP: parseInt(otp),
            currentTime: new Date()
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        // Convert received OTP to number for comparison
        const receivedOTPNum = parseInt(otp);

        console.log('OTP Comparison:', {
            stored: user.otpReset,
            received: receivedOTPNum,
            matches: user.otpReset === receivedOTPNum
        });

        // Check if OTP matches
        if (user.otpReset !== receivedOTPNum) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // Don't check expiration for now to test OTP matching
        /*if (!user.otpResetExprires || new Date(user.otpResetExprires) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }*/

        // If we get here, OTP is valid, proceed with password reset
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user with new password and clear OTP fields
        await userModel.updateOne(
            { email },
            {
                $set: {
                    password: hashedPassword,
                    otpReset: null,
                    otpResetExprires: null
                }
            }
        );

        return res.json({
            success: true,
            message: "Password reset successful"
        });

    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { 
    createUser, 
    loginUser,
    getUserDetails,
    updateUser,
    updateProfileImage,
    forgotPassword,
    resetPassword,
 };
