const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');

router.get('/health', (req, res) => {
  res.json({ message: 'Auth routes ready' });
});
router.post('/signup', signup);
router.post('/login', login);
router.get('/me', auth, getMe);

module.exports = router;
