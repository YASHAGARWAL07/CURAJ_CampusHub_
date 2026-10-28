'use strict';
const router=require('express').Router();
const C=require('../controllers/eventsController');
const {rateLimit,requireAuth,upload,handleUploadError,validateUpload}=require('../middleware');
router.get('/',       rateLimit(60,60000), C.list);
router.post('/',      requireAuth, rateLimit(10,3600000), upload.single('image'), handleUploadError, validateUpload, C.create);
router.delete('/:id', requireAuth, C.cancel);
module.exports=router;
