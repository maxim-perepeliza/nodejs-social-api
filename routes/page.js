const express = require('express');
const apiDocsController = require('../controllers/api-docs');
const blogController = require('../controllers/blog');

// custom middleware
const checkPostAvailable = (req, res, next) => {
    console.log('checkPostAvailable here!!!');
    next();
};

const router = express.Router();

router.get('/', apiDocsController.getApiDocs);
router.get('/blog', blogController.getBlog);

module.exports = router;