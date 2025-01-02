// utils/emailService.js

const nodemailer = require('nodemailer');

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS  // Your Gmail app password
    }
});

// Email template for OTP
const generateOTPEmailTemplate = (otp) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Password Reset OTP</h2>
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
                <p style="margin-bottom: 20px;">Your OTP for password reset is:</p>
                <h1 style="text-align: center; color: #4a5568; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
                <p style="margin-top: 20px;">This OTP will expire in 10 minutes.</p>
                <p style="color: #666; margin-top: 20px;">If you didn't request this password reset, please ignore this email.</p>
            </div>
            <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
                This is an automated email, please do not reply.
            </p>
        </div>
    `;
};

// Function to send OTP email
const sendOTPEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            html: generateOTPEmailTemplate(otp)
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email: ', error);
        throw error;
    }
};

module.exports = { sendOTPEmail };