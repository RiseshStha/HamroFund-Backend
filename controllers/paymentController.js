const Payment = require('../models/paymentModels');
const Campaign = require('../models/campaignModels');

const initiatePayment = async (req, res) => {
    try {
        const { campaignId, amount } = req.body;
        const userId = req.user.id; // Assuming you have authentication middleware

        // Validate campaign exists
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        // For eSewa test environment
        const path = "https://uat.esewa.com.np/epay/main";
        const params = {
            amt: amount,
            psc: 0,
            pdc: 0,
            txAmt: 0,
            tAmt: amount,
            pid: Date.now(), // Unique payment ID
            scd: "EPAYTEST", // Merchant code for test environment
            su: `http://${process.env.FRONTEND_URL}/payment/success`, // Success URL
            fu: `http://${process.env.FRONTEND_URL}/payment/failed`,  // Failure URL
        };

        // Create payment record
        const payment = new Payment({
            campaign: campaignId,
            contributor: userId,
            amount: amount,
            esewaTransactionId: params.pid,
            status: 'PENDING'
        });
        await payment.save();

        res.json({
            success: true,
            data: {
                paymentUrl: path,
                params
            }
        });
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate payment'
        });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { oid, amt, refId } = req.query;
        
        // Verify payment with eSewa (in production, you should use their verification API)
        const payment = await Payment.findOne({ esewaTransactionId: oid });
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Update payment status
        payment.status = 'SUCCESS';
        await payment.save();

        // Update campaign's raised amount
        const campaign = await Campaign.findById(payment.campaign);
        campaign.raisedAmount += payment.amount;
        await campaign.save();

        // res.redirect(`http://${process.env.FRONTEND_URL}/my-contributions`);
        res.json({
            success: true,
            message: 'Payment verified successfully'
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
        // res.redirect(`http://${process.env.FRONTEND_URL}/payment/failed`);
    }
};

const getMyContributions = async (req, res) => {
    try {
        const userId = req.user.id;
        const contributions = await Payment.find({ 
            contributor: userId,
            status: 'SUCCESS'
        })
        .populate({
            path: 'campaign',
            select: 'title image description'
        })
        .populate({
            path: 'contributor',
            select: 'fullName email'
        })
        .sort('-createdAt');

        res.json({
            success: true,
            data: contributions
        });
    } catch (error) {
        console.error('Error fetching contributions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contributions'
        });
    }
};

module.exports = {
    initiatePayment,
    verifyPayment,
    getMyContributions
};