const router = require('express').Router();
const { 
    createCampaign, 
    getAllCampaigns, 
    getCampaignById,
    updateCampaign,
    getLatestCampaigns,
    deleteCampaign,
    searchCampaigns 
} = require('../controllers/campaignController');
const { authGuard } = require('../middleware/authGuard');

//search campaign
router.get('/search', searchCampaigns);
router.post('/create', authGuard, createCampaign);
router.get('/all', getAllCampaigns);
router.get('/latest', getLatestCampaigns);


router.get('/:id', getCampaignById);
router.put('/:id', authGuard, updateCampaign);
router.delete('/:id', authGuard, deleteCampaign);


module.exports = router;