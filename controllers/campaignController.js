const Campaign = require('../models/campaignModels');

const createCampaign = async (req, res) => {
    try {
        const { title, description, targetAmount, endDate } = req.body;

        if (!title || !description || !targetAmount || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        const campaign = await Campaign.create({
            title,
            description,
            targetAmount,
            endDate,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: "Campaign created successfully",
            campaign
        });
    } catch (error) {
        console.error('Error in createCampaign:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .populate('createdBy', 'fullName email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            campaigns
        });
    } catch (error) {
        console.error('Error in getAllCampaigns:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('createdBy', 'fullName email');

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        res.status(200).json({
            success: true,
            campaign
        });
    } catch (error) {
        console.error('Error in getCampaignById:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createCampaign,
    getAllCampaigns,
    getCampaignById
};