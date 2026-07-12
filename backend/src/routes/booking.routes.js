const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ message: 'Booking routes ready' });
});

module.exports = router;
