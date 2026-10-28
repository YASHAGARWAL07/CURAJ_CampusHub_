'use strict';
const router=require('express').Router();
const C=require('../controllers/feedbackController');
const {rateLimit}=require('../middleware');
router.post('/', rateLimit(10,3600000), C.submit);
module.exports=router;
