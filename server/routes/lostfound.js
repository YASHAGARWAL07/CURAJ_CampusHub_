'use strict';
const router=require('express').Router();
const C=require('../controllers/lostfoundController');
const {rateLimit,requireAuth,upload,handleUploadError,validateUpload}=require('../middleware');
router.get('/',              rateLimit(60,60000), C.list);
router.post('/',             requireAuth, rateLimit(15,3600000), upload.single('image'), handleUploadError, validateUpload, C.create);
router.patch('/:id/resolve', requireAuth, C.resolve);
module.exports=router;
