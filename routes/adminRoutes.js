const express = require('express')
const router= express.Router();
const adminAuthController = require('../controllers/Auth')
const adminController = require('../controllers/adminController')
const { auth, isAdmin, isRm } = require('../middlewares/auth');  // Destructure to simplify


//auth route
router.post('/admin/signup', adminAuthController.adminSignup)
router.post('/admin/login',adminAuthController.adminLogin )

// Route for Admin to approve or reject the Under Us request
router.post('/under-us-approval', auth, isAdmin, adminController.handleUnderUsApproval);

// Route for Admin to approve or reject the Under Us request
router.post('/code-approval/:leadId', auth, isAdmin, adminController.approveCodeRequest);


//Route for admin to approve aoma req
router.post('/approve-aoma-request/:leadId', auth, isAdmin, adminController.approveAOMARequest);

//Route to approve activation request
router.post('/approve-activation/:leadId',auth, isAdmin, adminController.approveActivationRequest);

//Route to approve ms teams
router.post('/approve-ms-teams/:leadId', auth, isAdmin, adminController.approveMsTeamsLoginRequest)

module.exports =router  