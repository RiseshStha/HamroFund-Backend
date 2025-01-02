// middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 3, // limit each IP to 3 requests per windowMs
    message: {
        success: false,
        message: "Too many password reset attempts. Please try again after an hour."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { forgotPasswordLimiter };