const router = require('express').Router();
const { 
    createCampaign, 
    getAllCampaigns, 
    getCampaignById,
    updateCampaign,
    deleteCampaign 
} = require('../controllers/campaignController');
const { authGuard } = require('../middleware/authGuard');

router.post('/create', authGuard, createCampaign);
router.get('/all', getAllCampaigns);
router.get('/:id', getCampaignById);
router.put('/:id', authGuard, updateCampaign);
router.delete('/:id', authGuard, deleteCampaign);

module.exports = router;