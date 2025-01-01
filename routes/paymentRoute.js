const router = require('express').Router();
const paymentController = require('../controllers/paymentController');
const {authGuard} = require('../middleware/authGuard'); 

router.post('/initiate', authGuard, paymentController.initiatePayment);
router.get('/verify', paymentController.verifyPayment);
router.get('/my-contributions', authGuard, paymentController.getMyContributions);

module.exports = router;