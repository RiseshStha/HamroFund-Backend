const router = require('express').Router();
const userControllers = require("../controllers/userController");
const { forgotPasswordLimiter } = require('../middleware/rateLimiter');

//making create user api
router.post('/create', userControllers.createUser);

router.post('/login', userControllers.loginUser);

router.get('/get_user/:id', userControllers.getUserDetails);

router.put('/update_user/:id', userControllers.updateUser);

router.put('/update_user_image/:id', userControllers.updateProfileImage);

router.post('/forgot-password', forgotPasswordLimiter, userControllers.forgotPassword);
router.post('/reset-password', userControllers.resetPassword);


module.exports = router;