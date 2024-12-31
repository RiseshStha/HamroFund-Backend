const Campaign = require('../models/campaignModels');
const User = require('../models/userModels');
const path = require('path');
const fs = require('fs').promises;


const createCampaign = async (req, res) => {
    try {
        const { title, description, goal, endDate, category, creator } = req.body;

        if (!title || !description || !goal || !endDate || !category || !creator) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        if (!req.files?.image) {
            return res.status(400).json({
                success: false,
                message: "Campaign image is required"
            });
        }

        // Create campaigns directory if it doesn't exist
        const uploadDir = path.join(__dirname, '../public/campaigns');
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }

        const image = req.files.image;
        const imageName = `${Date.now()}-${image.name}`;
        const imageUploadPath = path.join(uploadDir, imageName);

        // Move the file
        await image.mv(imageUploadPath);

        const campaign = await Campaign.create({
            title,
            description,
            goal,
            endDate,
            image: imageName,
            category,
            creator // Use creator ID from form data
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
            message: error.message || "Internal server error"
        });
    }
};

const getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find()
        .populate({
            path: 'creator',
            select: 'fullName email profileImage'
        })
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
        .populate({
            path: 'creator',
            select: 'fullName email profileImage'
        })
        .populate('payments');

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

const updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        if (campaign.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this campaign"
            });
        }

        let imageName = campaign.image;
        if (req.files?.image) {
            // Delete old image
            const oldImagePath = path.join(__dirname, `../public/campaigns/${campaign.image}`);
            await fs.unlink(oldImagePath);

            // Upload new image
            const image = req.files.image;
            imageName = `${Date.now()}-${image.name}`;
            const imageUploadPath = path.join(__dirname, `../public/campaigns/${imageName}`);
            await image.mv(imageUploadPath);
        }

        const updatedCampaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                image: imageName
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Campaign updated successfully",
            campaign: updatedCampaign
        });
    } catch (error) {
        console.error('Error in updateCampaign:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getLatestCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .populate({
                path: 'creator',
                select: 'fullName email profileImage'
            })
            .sort({ createdAt: -1 })
            .limit(3);

        res.status(200).json({
            success: true,
            campaigns
        });
    } catch (error) {
        console.error('Error in getLatestCampaigns:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "Campaign not found"
            });
        }

        if (campaign.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this campaign"
            });
        }

        // Delete campaign image
        const imagePath = path.join(__dirname, `../public/campaigns/${campaign.image}`);
        await fs.unlink(imagePath);

        await Campaign.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Campaign deleted successfully"
        });
    } catch (error) {
        console.error('Error in deleteCampaign:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


//search campaign
// In campaignController.js

const searchCampaigns = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const searchQuery = req.query.search || '';
        const category = req.query.category || '';
        const sortBy = req.query.sortBy || 'latest'; // 'latest' or 'oldest'
        
        // Build query
        let query = {};
        
        // Add search condition if search query exists
        if (searchQuery) {
            query.$or = [
                { title: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        
        // Add category filter if category selected
        if (category && category !== 'ALL') {
            query.category = category;
        }

        // Determine sort order
        const sortOrder = sortBy === 'latest' ? -1 : 1;

        // Get total count for pagination
        const total = await Campaign.countDocuments(query);
        
        // Fetch campaigns with pagination and sorting
        const campaigns = await Campaign.find(query)
            .populate({
                path: 'creator',
                select: 'fullName email profileImage'
            })
            .sort({ createdAt: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit);

        // Get unique categories for filter dropdown
        const categories = await Campaign.distinct('category');
        
        res.status(200).json({
            success: true,
            campaigns,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit
            },
            categories,
            isFiltered: !!(searchQuery || (category && category !== 'ALL'))
        });
    } catch (error) {
        console.error('Error in searchCampaigns:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createCampaign,
    getAllCampaigns,
    getCampaignById,
    updateCampaign,
    getLatestCampaigns,
    deleteCampaign,
    searchCampaigns
};