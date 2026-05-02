const express = require('express');
const { register, login } = require('../controllers/authController');
const { validateNITJEmail } = require('../middleware/emailValidator');
const router = express.Router();

// Apply email validation middleware to both routes
router.post('/register', validateNITJEmail, register);
router.post('/login', validateNITJEmail, login);

module.exports = router;
