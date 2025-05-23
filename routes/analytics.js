const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middlewares/auth');
const analyticsController = require('../controllers/analyticsController');

// GET analytics summary with date range
router.get('/summary', auth,  analyticsController.getSummary);
router.get('/unfetchleads', auth, analyticsController.getUnfetchedLeadsCount)

module.exports = router;
