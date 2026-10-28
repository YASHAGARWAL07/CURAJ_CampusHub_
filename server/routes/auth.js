'use strict';
const router = require('express').Router();
const C = require('../controllers/authController');
const { rateLimit, requireAuth, upload, handleUploadError, validateUpload } = require('../middleware');

router.get('/me',              rateLimit(60, 60000),  C.me);
router.post('/register',       rateLimit(3, 900000),  C.register);
router.post('/login',          rateLimit(10, 600000), C.login);
router.post('/logout',         C.logout);  // No auth required — client may have stale token
router.post('/change-password',requireAuth, rateLimit(5, 900000),  C.changePassword);
router.post('/forgot-password',          rateLimit(2, 10800000), C.forgotPassword); // 2 per 3 hours
router.post('/reset-password',           rateLimit(5, 900000),   C.resetPassword);  // 5 per 15 min
router.patch('/contact',       requireAuth, C.updateContact);
router.patch('/profile',       requireAuth, rateLimit(20, 300000), C.updateProfile);
router.post('/avatar',         requireAuth, rateLimit(10, 300000), upload.single('avatar'), handleUploadError, validateUpload, C.updateAvatar);

module.exports = router;
