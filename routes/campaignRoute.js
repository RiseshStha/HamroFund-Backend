const router = require('express').Router();
const { 
    createCampaign, 
    getAllCampaigns, 
    getCampaignById,
    updateCampaign,
    getLatestCampaigns,
    deleteCampaign,
    searchCampaigns,
    getUserCampaigns, 
} = require('../controllers/campaignController');
const { authGuard } = require('../middleware/authGuard');

//search campaign
router.get('/search', searchCampaigns);
router.post('/create', authGuard, createCampaign);
router.get('/all', getAllCampaigns);
router.get('/latest', getLatestCampaigns);


router.get('/get_user_campaign/:id', getUserCampaigns);
router.get('/:id', getCampaignById);
router.put('/update_camp/:id', authGuard, updateCampaign);
router.delete('/:id', authGuard, deleteCampaign);


module.exports = router;