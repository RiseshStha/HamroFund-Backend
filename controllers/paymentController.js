const Payment = require('../models/paymentModels');
const Campaign = require('../models/campaignModels');
const crypto = require('crypto');

const initiatePayment = async (req, res) => {
    try {
        const { campaignId, amount } = req.body;
        const userId = req.user.id;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        // Generate a unique transaction ID
        const date = new Date();
        const transaction_uuid = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8)}`;

        // Prepare amounts
        const total_amount = amount.toString();
        const tax_amount = "0";
        const product_service_charge = "0";
        const product_delivery_charge = "0";

        // Use backend URLs for eSewa callbacks
        const success_url = `http://${process.env.FRONTEND_URL}/payment/success`;
        const failure_url = `http://${process.env.FRONTEND_URL}/payment/failed`;

        // Create signature string
        const secretKey = "8gBm/:&EnhH.1/q";
        const signatureString = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=EPAYTEST`;
        
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(signatureString)
            .digest('base64');

        const params = {
            amount: total_amount,
            tax_amount,
            product_service_charge,
            product_delivery_charge,
            total_amount,
            transaction_uuid,
            product_code: "EPAYTEST",
            success_url,
            failure_url,
            signed_field_names: "total_amount,transaction_uuid,product_code",
            signature
        };

        // Create payment record
        const payment = new Payment({
            campaign: campaignId,
            contributor: userId,
            amount: total_amount,
            esewaTransactionId: transaction_uuid,
            status: 'PENDING'
        });
        await payment.save();

        console.log('Success URL:', success_url); // Debug log
        console.log('Failure URL:', failure_url); 

        res.json({
            success: true,
            data: {
                paymentUrl: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
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
        console.log('Verify payment query params:', req.query); // Debug log
        
        // Handle both data parameter and direct parameters
        let paymentData;
        
        if (req.query.data) {
            // New eSewa format with base64 encoded data
            const decodedData = Buffer.from(req.query.data, 'base64').toString();
            paymentData = JSON.parse(decodedData);
        } else {
            // Handle direct parameters (old format)
            const { oid, amt, refId } = req.query;
            paymentData = {
                transaction_uuid: oid,
                amount: amt,
                reference_id: refId
            };
        }
        
        console.log('Processed payment data:', paymentData); // Debug log

        // Find the payment using transaction ID
        const payment = await Payment.findOne({ 
            esewaTransactionId: paymentData.transaction_uuid || paymentData.oid 
        });
        
        if (!payment) {
            console.error('Payment not found:', paymentData);
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
        }

        // Consider the payment successful if we found it
        payment.status = 'SUCCESS';
        await payment.save();

        // Update campaign's raised amount
        const campaign = await Campaign.findById(payment.campaign);
        if (campaign) {
            campaign.raisedAmount += parseFloat(payment.amount);
            campaign.payments.push(payment._id);
            await campaign.save();
        }

        // Redirect to success page
        return res.redirect(`${process.env.FRONTEND_URL}/payment/success`);
        
    } catch (error) {
        console.error('Payment verification error:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
    }
};

const handleFailedPayment = async (req, res) => {
    try {
        const { data } = req.query;
        
        console.log('Failed payment handler received:', {
            data,
            query: req.query,
            headers: req.headers
        });
        
        if (data) {
            // If we have data, decode and log it for debugging
            try {
                const decodedData = Buffer.from(data, 'base64').toString();
                const response = JSON.parse(decodedData);
                console.log('Failed payment decoded data:', response);
                
                if (response.transaction_uuid) {
                    const payment = await Payment.findOne({ esewaTransactionId: response.transaction_uuid });
                    if (payment) {
                        payment.status = 'FAILED';
                        await payment.save();
                        console.log('Payment status updated to FAILED');
                    }
                }
            } catch (error) {
                console.error('Error processing failed payment data:', error);
            }
        }
        
        // Always redirect to frontend failure page
        return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
    } catch (error) {
        console.error('Failed payment handling error:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
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
    getMyContributions,
    handleFailedPayment
};