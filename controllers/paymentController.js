const Payment = require('../models/paymentModels');
const Campaign = require('../models/campaignModels');
const axios = require('axios');

exports.initiatePayment = async (req, res) => {
  try {
    const { campaignId, amount } = req.body;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Initialize eSewa payment
    const esewaParams = {
      amt: amount,
      pdc: 0,
      psc: 0,
      txAmt: 0,
      tAmt: amount,
      pid: `${Date.now()}`,
      scd: process.env.ESEWA_MERCHANT_ID,
      su: `${process.env.BACKEND_URL}/api/payments/success`,
      fu: `${process.env.BACKEND_URL}/api/payments/failure`
    };

    // Create pending payment record
    const payment = new Payment({
      campaign: campaignId,
      donor: req.user.id,
      amount,
      esewaTransactionId: esewaParams.pid,
      status: 'pending'
    });
    
    await payment.save();

    // Return eSewa payment URL and parameters
    res.json({
      paymentUrl: process.env.ESEWA_PAYMENT_URL,
      params: esewaParams
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.handleSuccess = async (req, res) => {
  try {
    const { oid, amt, refId } = req.query;
    
    // Verify payment with eSewa
    const verificationResponse = await axios.get(process.env.ESEWA_VERIFICATION_URL, {
      params: {
        pid: oid,
        rid: refId,
        amt: amt
      }
    });

    if (verificationResponse.data.includes('Success')) {
      const payment = await Payment.findOne({ esewaTransactionId: oid });
      if (payment) {
        payment.status = 'completed';
        await payment.save();

        // Update campaign raised amount
        await Campaign.findByIdAndUpdate(payment.campaign, {
          $inc: { raisedAmount: payment.amount }
        });

        res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
      }
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
    }
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
  }
};

exports.handleFailure = async (req, res) => {
  try {
    const { oid } = req.query;
    
    const payment = await Payment.findOne({ esewaTransactionId: oid });
    if (payment) {
      payment.status = 'failed';
      await payment.save();
    }

    res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/payment/failure`);
  }
};