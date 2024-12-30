const router = require('express').Router();
const { createCampaign, getAllCampaigns, getCampaignById } = require('../controllers/campaignController');
const {authGuard} = require('../middleware/authGuard');

router.post('/create', authGuard, createCampaign);
router.get('/all', getAllCampaigns);
router.get('/:id', getCampaignById);

module.exports = router;