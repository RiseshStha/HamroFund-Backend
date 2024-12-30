const jwt = require('jsonwebtoken');

const authGuard = (req, res, next) => {
    //#.check incoming data
    console.log('Headers:', req.headers);

  
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(400).json({
            success: false,
            message: 'Authorization header not found!'
        });
    }

    // 4. Authorization format : 'Bearer tokensjdbfjldsabf'
    // 5. Get only token by splitting by 'space' (0->Bearer,1->Token)
    const token = authHeader.split(' ')[1];

    // 6. If token not found or mismatch, stop the process (res)
    if (!token || token === '') {
        return res.status(401).json({
            success: false,
            message: 'Token is missing!'
        });
    }

    // Log the token for debugging purposes
    console.log('Token::', token);

    // Basic validation of token structure before verification
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        return res.status(401).json({
            success: false,
            message: 'Token is malformed!'
        });
    }

    // 7. Verify the token
    try {
        // Verify the token and get user information
        const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedUser;
        next(); // Move to next step
    } catch (e) {
        console.error('JWT verification error:', e);

        let message = 'Not Authenticated!';
        if (e instanceof jwt.TokenExpiredError) {
            message = 'Token expired!';
        } else if (e instanceof jwt.JsonWebTokenError) {
            message = 'Token is invalid!';
        }

        return res.status(401).json({
            success: false,
            message
        });
    }
};



module.exports = {
    authGuard,
}