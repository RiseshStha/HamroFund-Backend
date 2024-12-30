const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const {authGuard} = require('../middleware/authGuard');

router.post('/initiate', authGuard, paymentController.initiatePayment);
router.get('/success', paymentController.handleSuccess);
router.get('/failure', paymentController.handleFailure);

module.exports = router;